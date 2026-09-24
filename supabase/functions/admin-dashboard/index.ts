import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CURRENT_TERMS_VERSION = "1.0";
const CURRENT_PRIVACY_VERSION = "1.0";
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

interface AdminRequest {
  action: "summary" | "members";
  page?: number;
  pageSize?: number;
  search?: string;
  membershipTier?: "all" | "free" | "paid";
  lineLinked?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const accessToken = req.headers.get("Authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? "";
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // 1. JWT確認 — anon key + user's Authorization header
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
      },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. profiles.is_admin 確認
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile || profile.is_admin !== true) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. getUser(accessToken)で認証検証が成功した同一JWTのaalだけを判定。
    // このSDK版のgetAuthenticatorAssuranceLevelはJWT引数を扱わない。
    let aal: unknown = null;
    try {
      const parts = accessToken.split(".");
      if (parts.length === 3) {
        const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
        const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
        const claims = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
        aal = claims?.aal;
      }
    } catch {
      // 不正・欠落したclaimは必ず拒否する。
    }
    if (aal !== "aal2") {
      return new Response(JSON.stringify({ error: "MFA_REQUIRED" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Parse request body
    let body: AdminRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. service_role client for privileged queries
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) {
      return new Response(JSON.stringify({ error: "Server config error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    if (body.action === "summary") {
      return handleSummary(admin, corsHeaders);
    } else if (body.action === "members") {
      return handleMembers(admin, corsHeaders, body);
    } else {
      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleSummary(
  // deno-lint-ignore no-explicit-any
  admin: any,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  // Yoga AI会員 = user_consents with current version
  // Get consent records with terms_accepted_at for member成立日時
  const { data: consentUsers, error: consentError } = await admin
    .from("user_consents")
    .select("user_id, terms_accepted_at")
    .eq("terms_version", CURRENT_TERMS_VERSION)
    .eq("privacy_version", CURRENT_PRIVACY_VERSION);

  if (consentError) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Deduplicate by user_id (same user may have multiple consent records)
  const consentDateMap = new Map<string, string>();
  for (const r of consentUsers ?? []) {
    if (!consentDateMap.has(r.user_id)) {
      consentDateMap.set(r.user_id, r.terms_accepted_at);
    }
  }

  const memberUserIds = Array.from(consentDateMap.keys());
  const totalMembers = memberUserIds.length;

  // Get profiles for these members (for membership_tier classification)
  let freeCount = 0;
  let paidCount = 0;
  let todayCount = 0;
  let weekCount = 0;
  let monthCount = 0;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  if (memberUserIds.length > 0) {
    const { data: memberProfiles } = await admin
      .from("profiles")
      .select("id, membership_tier")
      .in("id", memberUserIds);

    if (memberProfiles) {
      for (const p of memberProfiles) {
        if (p.membership_tier === "paid") paidCount++;
        else freeCount++;
      }
    }

    // 新規会員: user_consents.terms_accepted_at を基準日とする
    for (const [_, consentDate] of consentDateMap) {
      if (consentDate >= todayStart) todayCount++;
      if (consentDate >= weekStart.toISOString()) weekCount++;
      if (consentDate >= monthStart) monthCount++;
    }
  }

  // LINE連携会員数 = DISTINCT user_id in line_identities that are Yoga AI members
  let lineLinkedCount = 0;
  if (memberUserIds.length > 0) {
    const { data: lineRows } = await admin
      .from("line_identities")
      .select("user_id")
      .in("user_id", memberUserIds);

    const lineUserSet = new Set<string>();
    for (const r of lineRows ?? []) {
      lineUserSet.add(r.user_id);
    }
    lineLinkedCount = lineUserSet.size;
  }

  const dummyId = ["00000000-0000-0000-0000-000000000000"];

  // AI診断: 利用者数 (DISTINCT user_id) + 回数 (総レコード数)
  let diagnosisUsers = 0;
  let diagnosisCount = 0;
  {
    const { data: diagRows } = await admin
      .from("diagnoses")
      .select("user_id")
      .in("user_id", memberUserIds.length > 0 ? memberUserIds : dummyId);

    const diagUserSet = new Set<string>();
    for (const r of diagRows ?? []) {
      diagUserSet.add(r.user_id);
    }
    diagnosisUsers = diagUserSet.size;
    diagnosisCount = (diagRows ?? []).length;
  }

  // AI先生: 利用者数 (DISTINCT user_id from ai_teacher_llm_usage) + 回数 (総レコード数)
  let aiTeacherUsers = 0;
  let aiTeacherCount = 0;
  {
    const { data: usageRows } = await admin
      .from("ai_teacher_llm_usage")
      .select("user_id")
      .in("user_id", memberUserIds.length > 0 ? memberUserIds : dummyId);

    const usageUserSet = new Set<string>();
    for (const r of usageRows ?? []) {
      usageUserSet.add(r.user_id);
    }
    aiTeacherUsers = usageUserSet.size;
    aiTeacherCount = (usageRows ?? []).length;
  }

  // 実践: 利用者数 (DISTINCT user_id) + 回数 (総レコード数)
  let practiceUsers = 0;
  let practiceCount = 0;
  {
    const { data: practiceRows } = await admin
      .from("practice_logs")
      .select("user_id")
      .in("user_id", memberUserIds.length > 0 ? memberUserIds : dummyId);

    const practiceUserSet = new Set<string>();
    for (const r of practiceRows ?? []) {
      practiceUserSet.add(r.user_id);
    }
    practiceUsers = practiceUserSet.size;
    practiceCount = (practiceRows ?? []).length;
  }

  const summary = {
    totalMembers,
    freeMembers: freeCount,
    paidMembers: paidCount,
    todayNew: todayCount,
    weekNew: weekCount,
    monthNew: monthCount,
    lineLinkedMembers: lineLinkedCount,
    diagnosisUsers,
    diagnosisCount,
    aiTeacherUsers,
    aiTeacherCount,
    practiceUsers,
    practiceCount,
  };

  return new Response(JSON.stringify({ summary }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleMembers(
  // deno-lint-ignore no-explicit-any
  admin: any,
  corsHeaders: Record<string, string>,
  body: AdminRequest,
): Promise<Response> {
  const page = Math.max(1, body.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, body.pageSize ?? DEFAULT_PAGE_SIZE));
  const search = (body.search ?? "").trim();
  const tier = body.membershipTier ?? "all";
  const lineLinked = body.lineLinked ?? false;

  // 1. Get consented user IDs (Yoga AI会員)
  const { data: consentRows } = await admin
    .from("user_consents")
    .select("user_id, terms_version, privacy_version, terms_accepted_at")
    .eq("terms_version", CURRENT_TERMS_VERSION)
    .eq("privacy_version", CURRENT_PRIVACY_VERSION);

  const consentMap = new Map<string, string>();
  for (const r of consentRows ?? []) {
    if (!consentMap.has(r.user_id)) {
      consentMap.set(r.user_id, r.terms_accepted_at);
    }
  }

  const memberIds = Array.from(consentMap.keys());
  if (memberIds.length === 0) {
    return new Response(JSON.stringify({ members: [], total: 0, page, pageSize }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2. Query profiles with filters
  let query = admin
    .from("profiles")
    .select("id, display_name, membership_tier, role, area, created_at", { count: "exact" })
    .in("id", memberIds);

  if (tier === "free" || tier === "paid") {
    query = query.eq("membership_tier", tier);
  }

  if (search) {
    query = query.ilike("display_name", `%${search}%`);
  }

  // 3. Get total count first (head request)
  let countQuery = admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .in("id", memberIds);

  if (tier === "free" || tier === "paid") {
    countQuery = countQuery.eq("membership_tier", tier);
  }
  if (search) {
    countQuery = countQuery.ilike("display_name", `%${search}%`);
  }

  const { count: totalCount } = await countQuery;

  // Rebuild query for actual data
  let dataQuery = admin
    .from("profiles")
    .select("id, display_name, membership_tier, role, area, created_at")
    .in("id", memberIds);

  if (tier === "free" || tier === "paid") {
    dataQuery = dataQuery.eq("membership_tier", tier);
  }
  if (search) {
    dataQuery = dataQuery.ilike("display_name", `%${search}%`);
  }

  dataQuery = dataQuery
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const { data: profiles, error: profilesError } = await dataQuery;

  if (profilesError) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!profiles || profiles.length === 0) {
    return new Response(JSON.stringify({ members: [], total: 0, page, pageSize }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const profileIds = profiles.map((p: { id: string }) => p.id);

  // 4. LINE連携確認
  const { data: lineRows } = await admin
    .from("line_identities")
    .select("user_id")
    .in("user_id", profileIds);

  const lineSet = new Set((lineRows ?? []).map((r: { user_id: string }) => r.user_id));

  // 5. AI診断回数 (per member)
  const { data: diagCounts } = await admin
    .from("diagnoses")
    .select("user_id")
    .in("user_id", profileIds);

  const diagMap = new Map<string, number>();
  for (const r of diagCounts ?? []) {
    diagMap.set(r.user_id, (diagMap.get(r.user_id) ?? 0) + 1);
  }

  // 6. 実践回数 (per member)
  const { data: practiceCounts } = await admin
    .from("practice_logs")
    .select("user_id")
    .in("user_id", profileIds);

  const practiceMap = new Map<string, number>();
  for (const r of practiceCounts ?? []) {
    practiceMap.set(r.user_id, (practiceMap.get(r.user_id) ?? 0) + 1);
  }

  // 7. AI先生利用有無 (from ai_teacher_llm_usage — actual usage log)
  const { data: usageRows } = await admin
    .from("ai_teacher_llm_usage")
    .select("user_id")
    .in("user_id", profileIds);

  const usageSet = new Set((usageRows ?? []).map((r: { user_id: string }) => r.user_id));

  // 8. Assemble member list
  let members = profiles.map((p: {
    id: string;
    display_name: string | null;
    membership_tier: string;
    role: string;
    area: string | null;
    created_at: string;
  }) => ({
    id: p.id.slice(0, 8),
    displayName: p.display_name ?? "(未設定)",
    membershipTier: p.membership_tier,
    role: p.role,
    area: p.area ?? "-",
    createdAt: p.created_at,
    lineLinked: lineSet.has(p.id),
    consentVerified: consentMap.has(p.id),
    consentDate: consentMap.get(p.id) ?? null,
    diagnosisCount: diagMap.get(p.id) ?? 0,
    practiceCount: practiceMap.get(p.id) ?? 0,
    aiTeacherUsed: usageSet.has(p.id),
  }));

  // Filter by LINE連携 if requested
  if (lineLinked) {
    members = members.filter((m: { lineLinked: boolean }) => m.lineLinked);
  }

  // Get accurate total count
  let total = totalCount ?? 0;
  if (lineLinked) {
    // Need to count LINE-linked members separately
    const { data: lineAllRows } = await admin
      .from("line_identities")
      .select("user_id")
      .in("user_id", memberIds);
    const lineAllSet = new Set((lineAllRows ?? []).map((r: { user_id: string }) => r.user_id));
    total = lineAllSet.size;
  }

  return new Response(JSON.stringify({ members, total, page, pageSize }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
