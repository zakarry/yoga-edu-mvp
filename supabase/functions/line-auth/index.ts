import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const LINE_AUTH_BASE = "https://access.line.me/oauth2/v2.1/authorize";
const LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
const LINE_PROFILE_URL = "https://api.line.me/oauth2/v2.1/userinfo";
const LINE_ID_TOKEN_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";
const STATE_TTL_MINUTES = 10;

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function redirectResponse(url: string): Response {
  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders, Location: url },
  });
}

function generateState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const arr: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    arr.push(bytes[i].toString(16).padStart(2, "0"));
  }
  return arr.join("");
}

// Shared helper: look up or create a Supabase user from a verified LINE sub,
// then generate a session. Used by both the OAuth callback and LIFF paths.
async function getOrCreateLineSession(
  adminClient: ReturnType<typeof createClient>,
  lineSub: string,
  displayName: string | null,
  supabaseUrl: string,
  anonKey: string,
): Promise<{ access_token: string; refresh_token: string; expires_in: number; token_type: string } | null> {
  const { data: existingIdentity } = await adminClient
    .from("line_identities")
    .select("user_id")
    .eq("line_sub", lineSub)
    .maybeSingle();

  let userId: string;

  if (existingIdentity?.user_id) {
    userId = existingIdentity.user_id;
  } else {
    const fakeEmail = `line-${lineSub}@lineauth.local`;
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: fakeEmail,
      email_confirm: true,
      user_metadata: {
        provider: "line",
        line_sub: lineSub,
        display_name: displayName || null,
      },
    });

    if (createError || !newUser?.user) {
      console.error("line-auth: user creation failed");
      return null;
    }

    userId = newUser.user.id;

    const { error: identityError } = await adminClient.from("line_identities").insert({
      line_sub: lineSub,
      user_id: userId,
      display_name: displayName || null,
    });

    if (identityError) {
      console.error("line-auth: identity insert failed");
      return null;
    }
  }

  if (displayName) {
    await adminClient
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", userId)
      .is("display_name", null);
  }

  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: `line-${lineSub}@lineauth.local`,
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    console.error("line-auth: magic link generation failed");
    return null;
  }

  const anonClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: verifyData, error: verifyError } = await anonClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });

  if (verifyError || !verifyData?.session) {
    console.error("line-auth: OTP verification failed");
    return null;
  }

  return {
    access_token: verifyData.session.access_token,
    refresh_token: verifyData.session.refresh_token,
    expires_in: verifyData.session.expires_in,
    token_type: verifyData.session.token_type,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^.*\/line-auth\/?/, "");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const channelId = (Deno.env.get("LINE_CHANNEL_ID") || "").trim();
  const channelSecret = (Deno.env.get("LINE_CHANNEL_SECRET") || "").trim();

  if (!supabaseUrl || !serviceRoleKey || !anonKey || !channelId || !channelSecret) {
    console.error("line-auth: missing required env vars", {
      hasChannelId: channelId.length > 0,
      channelIdType: typeof channelId,
      channelIdLength: channelId.length,
      hasChannelSecret: channelSecret.length > 0,
    });
    return jsonResponse({ error: "configuration_error" }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // ── START (LINE Login OAuth redirect) ─────────────────
    if (path === "start" || path === "" || path === "/") {
      const redirectTo = url.searchParams.get("redirect_to") || url.origin;
      const state = generateState();

      const { error: insertError } = await adminClient
        .from("line_auth_states")
        .insert({ state, redirect_to: redirectTo, consumed: false });

      if (insertError) {
        console.error("line-auth: failed to insert state");
        return jsonResponse({ error: "server_error" }, 500);
      }

      const callbackUrl = `${supabaseUrl}/functions/v1/line-auth/callback`;
      const params = new URLSearchParams({
        response_type: "code",
        client_id: channelId,
        redirect_uri: callbackUrl,
        state,
        scope: "openid profile",
      });
      const authUrl = `${LINE_AUTH_BASE}?${params.toString()}`;

      return redirectResponse(authUrl);
    }

    // ── CALLBACK (LINE Login OAuth callback) ──────────────
    if (path === "callback" || path === "callback/") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const lineError = url.searchParams.get("error");

      if (lineError) {
        return redirectToAppWithError(url.origin, "line_auth_failed");
      }

      if (!code || !state) {
        return redirectToAppWithError(url.origin, "line_auth_failed");
      }

      const { data: stateRow, error: stateError } = await adminClient
        .from("line_auth_states")
        .select("id, redirect_to, consumed, created_at")
        .eq("state", state)
        .maybeSingle();

      if (stateError || !stateRow) {
        return redirectToAppWithError(url.origin, "line_auth_failed");
      }

      if (stateRow.consumed) {
        return redirectToAppWithError(url.origin, "line_auth_failed");
      }

      const ageMs = Date.now() - new Date(stateRow.created_at).getTime();
      if (ageMs > STATE_TTL_MINUTES * 60 * 1000) {
        return redirectToAppWithError(url.origin, "line_auth_failed");
      }

      await adminClient
        .from("line_auth_states")
        .update({ consumed: true })
        .eq("id", stateRow.id);

      const callbackUrl = `${supabaseUrl}/functions/v1/line-auth/callback`;
      const tokenRes = await fetch(LINE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: callbackUrl,
          client_id: channelId,
          client_secret: channelSecret,
        }),
      });

      if (!tokenRes.ok) {
        console.error("line-auth: LINE token exchange failed", tokenRes.status);
        return redirectToAppWithError(stateRow.redirect_to, "line_auth_failed");
      }

      const tokenBody = await tokenRes.json();
      const accessToken: string | undefined = tokenBody.access_token;

      if (!accessToken) {
        return redirectToAppWithError(stateRow.redirect_to, "line_auth_failed");
      }

      const profileRes = await fetch(LINE_PROFILE_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!profileRes.ok) {
        console.error("line-auth: LINE profile fetch failed", profileRes.status);
        return redirectToAppWithError(stateRow.redirect_to, "line_auth_failed");
      }

      const lineProfile = await profileRes.json();
      const lineSub: string | undefined = lineProfile.sub;

      if (!lineSub) {
        return redirectToAppWithError(stateRow.redirect_to, "line_auth_failed");
      }

      const session = await getOrCreateLineSession(
        adminClient,
        lineSub,
        lineProfile.name || null,
        supabaseUrl,
        anonKey,
      );

      if (!session) {
        return redirectToAppWithError(stateRow.redirect_to, "line_auth_failed");
      }

      const finalRedirect = new URL(stateRow.redirect_to);
      finalRedirect.hash =
        `access_token=${encodeURIComponent(session.access_token)}` +
        `&refresh_token=${encodeURIComponent(session.refresh_token)}` +
        `&expires_in=${session.expires_in}` +
        `&token_type=${encodeURIComponent(session.token_type)}` +
        `&type=magiclink`;

      return redirectResponse(finalRedirect.toString());
    }

    // ── LIFF (ID Token verification + session creation) ───
    if (path === "liff" || path === "liff/") {
      if (req.method !== "POST") {
        return jsonResponse({ error: "method_not_allowed" }, 405);
      }

      const body = await req.json().catch(() => null);
      if (!body || !body.id_token || typeof body.id_token !== "string") {
        return jsonResponse({ error: "missing_id_token" }, 400);
      }

      // Verify the ID token with LINE's token verification endpoint.
      // LINE validates the token server-side and returns the claims.
      const verifyRes = await fetch(LINE_ID_TOKEN_VERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          id_token: body.id_token,
          client_id: channelId,
        }),
      });

      if (!verifyRes.ok) {
        return jsonResponse({ error: "verification_failed" }, 401);
      }

      const lineUserInfo = await verifyRes.json();
      const lineSub: string | undefined = lineUserInfo.sub;

      if (!lineSub) {
        return jsonResponse({ error: "verification_failed" }, 401);
      }

      // Defense-in-depth: verify audience matches our channel ID
      if (lineUserInfo.aud && lineUserInfo.aud !== channelId) {
        console.error("line-auth: LIFF token audience mismatch");
        return jsonResponse({ error: "verification_failed" }, 401);
      }

      const displayName = (typeof lineUserInfo.name === "string" && lineUserInfo.name) || null;

      const session = await getOrCreateLineSession(
        adminClient,
        lineSub,
        displayName,
        supabaseUrl,
        anonKey,
      );

      if (!session) {
        return jsonResponse({ error: "session_creation_failed" }, 500);
      }

      return jsonResponse({ session }, 200);
    }

    // Unknown path
    return jsonResponse({ error: "not_found" }, 404);
  } catch (err) {
    console.error("line-auth: unhandled error", err);
    return jsonResponse({ error: "server_error" }, 500);
  }
});

function redirectToAppWithError(redirectBase: string, errorCode: string): Response {
  const url = new URL(redirectBase);
  url.searchParams.set("line_auth_error", errorCode);
  return redirectResponse(url.toString());
}
