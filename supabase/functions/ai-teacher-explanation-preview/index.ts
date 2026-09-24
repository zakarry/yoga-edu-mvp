import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const LLM_MODEL = Deno.env.get("LLM_MODEL") ?? "gpt-4o-mini";
const LLM_TIMEOUT_MS = 15000;
const MAX_PROMPT_CHARS = 16000;
const MAX_KNOWLEDGE_ITEMS = 3;
const MAX_USER_MESSAGE_CHARS = 1000;
const MAX_PERSONA_FIELD_CHARS = 200;
const MAX_PREFERENCE_CHARS = 100;
const MAX_TURNS = 6;
const MAX_TURN_CHARS = 500;

const SYSTEM_INSTRUCTION = `あなたはYoga AIのMy AI Teacherです。ヨガの先生として、ユーザーと自然な会話をしてください。

【Layer 1: Professional Yoga Core】
あなたは以下のヨガ知識を持つ専門家です：
- アーサナ（ポーズ）の正しい理解と初心者向け説明
- プラーナーヤーマ（呼吸法）の安全な指導
- ディアーナ（瞑想）の基本的な案内
- シーケンス構成の原則
- Yoga Knowledgeデータベースの活用
与えられたKnowledgeがある場合はそれを参考にしてください。Knowledgeがない場合は、あなたの知識で自然に会話してください。

【Layer 2: Teacher Personality】
ユーザーが設定した先生の人格（名前、性格、得意分野）に従って話してください。
先生ごとに話し方や距離感が変わります。

【Layer 3: My Yoga Memory】
ユーザーの練習履歴や好みが提供されている場合は、それを考慮してください。
ただし、提供された情報の範囲で対応し、推測で補完しないでください。

【Layer 4: Federation Rules — 全日本ヨガ連盟 共通ルール】
以下のルールを厳守してください：
- 医療診断・治療・安全性判断をしない
- 疾患、痛み、妊娠、怪我等への個別助言をしない
- 痛みや異常を感じた場合は実践を中止し、必要時は医療専門家への相談を勧める
- 危険な実践を勧めない
- 過度な断定をしない
- 効果効能を誇張しない
- ユーザーの状態に配慮する

【会話の基本方針】
- ユーザーの発言の意味・感情・状態をまず理解する
- 必要なら短く共感する
- 必要な場合だけ1つ程度聞き返す
- ヨガの知識が必要ならKnowledgeを参照して説明する
- 十分な情報があれば実践を提案する
- 毎回「何を知りたいですか？」に戻さない
- 通常会話では短く、自然に、先生らしく
- Knowledge質問では必要な説明を行う
- 回答本文のみを出力する（chain-of-thoughtやreasoningは含めない）
- 不明な場合は推測しない`;

const FORBIDDEN_PHRASES = [
  "治す", "治療する", "安全です", "治療します", "治ります",
  "医学的", "診断します", "完治", "療法",
];

interface ConversationTurn {
  role: "user" | "teacher";
  text: string;
}

interface LLMKnowledgeItem {
  title: string;
  category: string;
  content: string;
}

interface LLMPersona {
  name: string;
  personality: string;
  specialty: string;
  teachingLanguage: string;
}

interface LLMSessionContext {
  requestedMinutes: number | null;
  requestedType: string | null;
  requestedStyle: string | null;
  explanationPreference: string;
  cuePreference: string;
  praisePreference: string;
  practiceSummary: {
    totalSessions: number;
    favoriteTypes: string[];
    preferredStyle: string | null;
  };
}

interface AITeacherLLMRequest {
  userMessage: string;
  persona: LLMPersona;
  sessionContext: LLMSessionContext;
  knowledge: LLMKnowledgeItem[];
  turns?: ConversationTurn[];
  memory?: { favoritePractices?: string[]; preferredDuration?: number | null; preferredExplanation?: string | null; preferredTone?: string | null };
}

function clampText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

interface ApprovedKnowledgeRow {
  masterId: string;
  title: string;
  category: string;
  publicContent: string;
}

async function resolveApprovedKnowledge(
  // deno-lint-ignore no-explicit-any
  client: any,
  requested: LLMKnowledgeItem[],
): Promise<LLMKnowledgeItem[] | null> {
  if (!requested || requested.length === 0) return [];

  const resolved: LLMKnowledgeItem[] = [];
  const seen = new Set<string>();

  for (const item of requested) {
    const title = typeof item?.title === "string" ? item.title.trim() : "";
    if (!title) return null;

    const { data, error } = await client.rpc("lookup_teacher_explanation", { p_search: title });
    if (error || !Array.isArray(data)) return null;

    const match = (data as ApprovedKnowledgeRow[]).find(
      (row) => typeof row?.title === "string" && row.title.trim() === title,
    );
    if (!match || typeof match.publicContent !== "string") return null;
    if (seen.has(match.masterId)) continue;
    seen.add(match.masterId);

    resolved.push({
      title: match.title,
      category: typeof match.category === "string" ? match.category : "",
      content: match.publicContent,
    });
  }

  return resolved;
}

function buildSystemContent(req: AITeacherLLMRequest, approvedKnowledge: LLMKnowledgeItem[]): string {
  const langMap: Record<string, string> = {
    ja: "日本語", en: "English", zh: "中文", ko: "한국어",
  };
  const lang = langMap[req.persona?.teachingLanguage ?? "ja"] ?? "日本語";

  let knowledgeSection = "";
  if (approvedKnowledge.length > 0) {
    const knowledgeText = approvedKnowledge.map((k, i) => {
      const truncated = k.content.length > 2000
        ? k.content.slice(0, 2000) + "…"
        : k.content;
      return `[${i + 1}]\ntitle: ${k.title}\ncategory: ${k.category}\ncontent: ${truncated}`;
    }).join("\n\n");
    knowledgeSection = `\n\n【参考Knowledge】\n${knowledgeText}`;
  }

  const personaSection = `\n\n【Teacher Personality】\nname: ${clampText(req.persona?.name, MAX_PERSONA_FIELD_CHARS)}\npersonality: ${clampText(req.persona?.personality, MAX_PERSONA_FIELD_CHARS)}\nspecialty: ${clampText(req.persona?.specialty, MAX_PERSONA_FIELD_CHARS)}\nlanguage: ${lang}`;

  let sessionSection = "";
  if (req.sessionContext) {
    const ps = req.sessionContext.practiceSummary;
    sessionSection = `\n\n【User Context】\npracticeSessions: ${ps?.totalSessions ?? 0}\nfavoriteTypes: ${(ps?.favoriteTypes ?? []).join(", ")}\nexplanationPreference: ${clampText(req.sessionContext.explanationPreference, MAX_PREFERENCE_CHARS)}\ncuePreference: ${clampText(req.sessionContext.cuePreference, MAX_PREFERENCE_CHARS)}\npraisePreference: ${clampText(req.sessionContext.praisePreference, MAX_PREFERENCE_CHARS)}`;
    if (req.sessionContext.requestedMinutes) sessionSection += `\nrequestedMinutes: ${req.sessionContext.requestedMinutes}`;
    if (req.sessionContext.requestedType) sessionSection += `\nrequestedType: ${req.sessionContext.requestedType}`;
  }

  const memorySection = req.memory ? '\n\n【My Yoga Memory: preferences only】\n' + JSON.stringify({
    favoritePractices: Array.isArray(req.memory.favoritePractices) ? req.memory.favoritePractices.slice(0, 5).map(v => clampText(v, 100)) : [],
    preferredDuration: typeof req.memory.preferredDuration === 'number' && Number.isFinite(req.memory.preferredDuration) ? Math.min(180, Math.max(1, req.memory.preferredDuration)) : null,
    preferredExplanation: clampText(req.memory.preferredExplanation, 100),
    preferredTone: clampText(req.memory.preferredTone, 100),
  }) : '';
  return `${SYSTEM_INSTRUCTION}${personaSection}${sessionSection}${knowledgeSection}${memorySection}\n\n${lang}で回答してください。`;
}

function buildMessages(req: AITeacherLLMRequest, systemContent: string): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemContent },
  ];

  // Add conversation history as alternating user/assistant messages
  if (req.turns && Array.isArray(req.turns)) {
    const turns = req.turns.slice(-MAX_TURNS);
    for (const turn of turns) {
      if (!turn || (turn.role !== "user" && turn.role !== "teacher") || typeof turn.text !== "string") continue;
      const text = turn.text.slice(0, MAX_TURN_CHARS);
      if (!text.trim()) continue;
      messages.push({
        role: turn.role === "user" ? "user" : "assistant",
        content: text,
      });
    }
  }

  // Add current user message
  messages.push({
    role: "user",
    content: clampText(req.userMessage, MAX_USER_MESSAGE_CHARS),
  });

  return messages;
}

function postCheckResponse(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  if (text.length > 2000) return false;
  const lower = text.toLowerCase();
  for (const phrase of FORBIDDEN_PHRASES) {
    if (text.includes(phrase) || lower.includes(phrase.toLowerCase())) return false;
  }
  return true;
}

async function callLLM(messages: Array<{ role: string; content: string }>): Promise<{ text: string | null; error?: string; providerStatus?: number; completionId?: string }> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return { text: null, error: "no_api_key" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages,
        max_tokens: 800,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return { text: null, error: `http_${res.status}`, providerStatus: res.status };
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string") return { text: null, error: "no_content" };
    return { text, providerStatus: res.status, completionId: typeof data.id === "string" ? data.id : undefined };
  } catch {
    return { text: null, error: controller.signal.aborted ? 'timeout' : 'network_error' };
  } finally {
    clearTimeout(timeout);
  }
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
      },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("membership_tier")
      .eq("id", user.id)
      .maybeSingle();

    // Phase 1: allow both free and paid members. Guest (no auth) is rejected above.
    if (profileError || !profile) {
      return new Response(JSON.stringify({
        text: null,
        fallback: true,
        reason: "profile_not_found",
        model: LLM_MODEL,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tier = profile.membership_tier ?? "free";
    if (tier !== "free" && tier !== "paid") {
      return new Response(JSON.stringify({
        text: null,
        fallback: true,
        reason: "invalid_tier",
        model: LLM_MODEL,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: AITeacherLLMRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof body.userMessage !== "string" || body.userMessage.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Knowledge is now optional — empty array is allowed for general conversation
    if (!Array.isArray(body.knowledge)) {
      body.knowledge = [];
    }

    if (body.knowledge.length > MAX_KNOWLEDGE_ITEMS) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve approved knowledge (returns [] for empty input, null for invalid)
    const approvedKnowledge = await resolveApprovedKnowledge(supabase, body.knowledge);
    if (approvedKnowledge === null) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-side rate limit
    const { data: claim, error: claimError } = await supabase.rpc("claim_ai_teacher_llm_call");
    if (claimError || !claim || claim.allowed !== true) {
      return new Response(JSON.stringify({
        text: null,
        fallback: true,
        reason: "rate_limited",
        model: LLM_MODEL,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemContent = buildSystemContent({ ...body, knowledge: approvedKnowledge }, approvedKnowledge);
    const messages = buildMessages({ ...body, knowledge: approvedKnowledge }, systemContent);

    // Bound the actual request after history is assembled.
    while (messages.length > 2 && messages.reduce((sum, m) => sum + m.content.length, 0) > MAX_PROMPT_CHARS) messages.splice(1, 1);
    if (messages.reduce((sum, m) => sum + m.content.length, 0) > MAX_PROMPT_CHARS) {
      return new Response(JSON.stringify({ text: null, fallback: true, reason: 'prompt_too_large' }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const llmResult = await callLLM(messages);

    // Request-local evidence, with no token, account ID, prompt or secret.
    const evidence = {
      version: 'conversation-v2-evidence-1',
      openaiCalled: llmResult.providerStatus !== undefined,
      openaiStatus: llmResult.providerStatus ?? null,
      completionId: llmResult.completionId ?? null,
      usageRecorded: true, // claim_ai_teacher_llm_call allowed=true above inserted a row.
      historyTurns: messages.length - 2,
      knowledgeItems: approvedKnowledge.length,
      layers: { professionalCore: true, teacherPersonality: true, federationRules: true, memoryPreferences: !!body.memory },
    };

    if (llmResult.error) {
      console.error("ai-teacher-explanation: llm call failed", llmResult.error);
    }

    if (!llmResult.text || !postCheckResponse(llmResult.text)) {
      return new Response(JSON.stringify({
        text: null,
        fallback: true,
        reason: llmResult.error ? 'provider_error' : 'response_rejected',
        evidence,
        model: LLM_MODEL,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      text: llmResult.text,
      fallback: false,
      evidence,
      model: LLM_MODEL,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    console.error("ai-teacher-explanation: unhandled error");
    return new Response(JSON.stringify({
      text: null,
      fallback: true,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
