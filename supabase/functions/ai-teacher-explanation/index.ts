import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const LLM_MODEL = Deno.env.get("LLM_MODEL") ?? "gpt-4o-mini";
const LLM_TIMEOUT_MS = 10000;
const MAX_PROMPT_CHARS = 12000;

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
  const lang = langMap[req.persona.teachingLanguage] ?? "日本語";

  return `User question:
${req.userMessage}

Teacher persona:
name: ${req.persona.name}
personality: ${req.persona.personality}
specialty: ${req.persona.specialty}
language: ${lang}

Session preferences:
explanationPreference: ${req.sessionContext.explanationPreference}
cuePreference: ${req.sessionContext.cuePreference}
praisePreference: ${req.sessionContext.praisePreference}

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

async function callLLM(prompt: string): Promise<string | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return null;

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

    if (!res.ok) return null;

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string") return null;
    return text;
  } catch {
    return null;
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

    const body: AITeacherLLMRequest = await req.json();

    if (!body.knowledge || body.knowledge.length === 0) {
      return new Response(JSON.stringify({ error: "No knowledge provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.knowledge.length > 3) {
      return new Response(JSON.stringify({ error: "Too many knowledge items" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = buildUserPrompt(body);
    if (prompt.length > MAX_PROMPT_CHARS) {
      return new Response(JSON.stringify({ error: "Prompt too large" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const llmText = await callLLM(prompt);

    if (!llmText || !postCheckResponse(llmText)) {
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
      text: llmText,
      fallback: false,
      model: LLM_MODEL,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({
      text: null,
      fallback: true,
      error: err.message,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
