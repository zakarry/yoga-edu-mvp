import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const LLM_MODEL = Deno.env.get("LLM_MODEL") ?? "gpt-4o-mini";
const LLM_TIMEOUT_MS = 10000;
const MAX_PROMPT_CHARS = 12000;
const MAX_KNOWLEDGE_ITEMS = 3;
const MAX_USER_MESSAGE_CHARS = 1000;
const MAX_PERSONA_FIELD_CHARS = 200;
const MAX_PREFERENCE_CHARS = 100;

const SYSTEM_INSTRUCTION = `あなたはYoga AIのMy AI Teacherです。
以下のルールを厳守してください。
- 与えられたKnowledgeの範囲だけで回答する
- Knowledgeにない情報を追加しない
- 医療診断・治療・安全性判断をしない
- 疾患、痛み、妊娠、怪我等への個別助言をしない
- Practiceの個別推薦をしない
- 効果効能を誇張しない
- ユーザーのPersona設定に合う話し方をする
- 回答は簡潔で自然にする
- 不明な場合は推測しない
- 回答本文のみを出力する（chain-of-thoughtやreasoningは含めない）`;

const FORBIDDEN_PHRASES = [
  "治す", "治療する", "安全です", "治療します", "治ります",
  "医学的", "診断します", "完治", "療法",
];

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

/*
  The browser assembles the knowledge array it wants the model to answer from, so
  its contents are attacker controlled. Re-resolve every requested item against
  the approved set returned by lookup_teacher_explanation (which applies the
  usage / editorial / safety-review filters server-side) and use the stored copy
  of the text. Anything with no approved match makes the whole request invalid.
*/
async function resolveApprovedKnowledge(
  // deno-lint-ignore no-explicit-any
  client: any,
  requested: LLMKnowledgeItem[],
): Promise<LLMKnowledgeItem[] | null> {
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

  return resolved.length > 0 ? resolved : null;
}

function buildUserPrompt(req: AITeacherLLMRequest): string {
  const knowledgeText = req.knowledge.map((k, i) => {
    const truncated = k.content.length > 2000
      ? k.content.slice(0, 2000) + "…"
      : k.content;
    return `[${i + 1}]\ntitle: ${k.title}\ncategory: ${k.category}\ncontent: ${truncated}`;
  }).join("\n\n");

  const langMap: Record<string, string> = {
    ja: "日本語", en: "English", zh: "中文", ko: "한국어",
  };
  const lang = langMap[req.persona?.teachingLanguage ?? "ja"] ?? "日本語";

  return `User question:
${clampText(req.userMessage, MAX_USER_MESSAGE_CHARS)}

Teacher persona:
name: ${clampText(req.persona?.name, MAX_PERSONA_FIELD_CHARS)}
personality: ${clampText(req.persona?.personality, MAX_PERSONA_FIELD_CHARS)}
specialty: ${clampText(req.persona?.specialty, MAX_PERSONA_FIELD_CHARS)}
language: ${lang}

Session preferences:
explanationPreference: ${clampText(req.sessionContext?.explanationPreference, MAX_PREFERENCE_CHARS)}
cuePreference: ${clampText(req.sessionContext?.cuePreference, MAX_PREFERENCE_CHARS)}
praisePreference: ${clampText(req.sessionContext?.praisePreference, MAX_PREFERENCE_CHARS)}

Approved Yoga Knowledge:
${knowledgeText}

上記Knowledgeの範囲だけで、${lang}で回答してください。`;
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

async function callLLM(prompt: string): Promise<{ text: string | null; error?: string }> {
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
        messages: [
          { role: "system", content: SYSTEM_INSTRUCTION },
          { role: "user", content: prompt },
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return { text: null, error: `http_${res.status}` };
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string") return { text: null, error: "no_content" };
    return { text };
  } catch (err) {
    return { text: null, error: `exception: ${err.message}` };
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

    if (profileError || !profile || profile.membership_tier !== "paid") {
      return new Response(JSON.stringify({
        text: null,
        fallback: true,
        reason: "paid_membership_required",
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

    if (!Array.isArray(body?.knowledge) || body.knowledge.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.knowledge.length > MAX_KNOWLEDGE_ITEMS) {
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

    // Never trust the knowledge text sent by the browser: rebuild it from the
    // approved rows in the database.
    const approvedKnowledge = await resolveApprovedKnowledge(supabase, body.knowledge);
    if (!approvedKnowledge) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-side rate limit (the browser-side counter is advisory only).
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

    const prompt = buildUserPrompt({ ...body, knowledge: approvedKnowledge });
    if (prompt.length > MAX_PROMPT_CHARS) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const llmResult = await callLLM(prompt);

    if (llmResult.error) {
      console.error("ai-teacher-explanation: llm call failed", llmResult.error);
    }

    if (!llmResult.text || !postCheckResponse(llmResult.text)) {
      return new Response(JSON.stringify({
        text: null,
        fallback: true,
        model: LLM_MODEL,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      text: llmResult.text,
      fallback: false,
      model: LLM_MODEL,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    // Log server-side only: the exception text is internal detail and must not
    // be returned to the caller.
    console.error("ai-teacher-explanation: unhandled error", err);
    return new Response(JSON.stringify({
      text: null,
      fallback: true,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
