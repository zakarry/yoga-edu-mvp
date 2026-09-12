import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";
const LLM_MODEL = Deno.env.get("LLM_MODEL") ?? "gpt-4o-mini";
const LLM_TIMEOUT_MS = 10000;
const MAX_USER_MESSAGE_CHARS = 1000;
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_MESSAGES = 5;

const LIFF_BASE = "https://liff.line.me/2011544150-dpYIsAbE";

const SAFETY_KEYWORDS = [
  "痛い", "痛み", "ケガ", "怪我", "妊娠", "産後", "手術", "病気",
  "めまい", "呼吸困難", "胸痛", "医師", "治療", "診断", "持病",
  "腰が痛", "膝が痛", "肩が痛", "首が痛", "違和感", "しびれ",
  "腫れ", "炎症", "骨折", "脱臼", "ヘルニア", "坐骨神経",
];

const SYSTEM_PROMPT = `あなたはYoga AIのLINE公式アカウントのアシスタントです。
以下のルールを厳守してください：
- 親しみやすく、落ち着いたトーンで返答する
- 1〜4短文で簡潔に答える
- 医療診断・治療・安全性判断は絶対にしない
- 痛み、ケガ、妊娠、疾患等への個別助言はしない
- ヨガの一般的な案内、呼吸法、瞑想、習慣化の相談には応える
- 必要に応じてYoga AI内の機能（AI先生、今日のヨガ等）へ誘導する
- 「下のリッチメニューにある『AI先生』をタップしてください」のように次のアクションを明示する
- 効果効能を誇張しない
- 回答本文のみを出力する`;

type Intent =
  | "GREETING"
  | "TODAY_YOGA"
  | "BREATHING"
  | "MEDITATION"
  | "PRACTICE_HISTORY"
  | "AI_TEACHER"
  | "SEARCH_YOGA"
  | "LEARN"
  | "GENERAL_YOGA"
  | "SAFETY_SENSITIVE"
  | "UNKNOWN";

function classifyIntent(text: string): Intent {
  const t = text.toLowerCase().trim();

  if (SAFETY_KEYWORDS.some((kw) => t.includes(kw.toLowerCase()))) {
    return "SAFETY_SENSITIVE";
  }

  if (/^(こんにちは|こんばんは|おはよう|はじめまして|hi|hello|やっと|久しぶり)/.test(t)) {
    return "GREETING";
  }
  if (/(今日|きょう).*(する|やる|やろう|実践|プログラム|ヨガ|提案|おすすめ)/.test(t) || /今日.*何/.test(t)) {
    return "TODAY_YOGA";
  }
  if (/(呼吸|ブレス|腹式|鼻呼吸|ボックスブリージング|box breathing)/.test(t)) {
    return "BREATHING";
  }
  if (/(瞑想|めいそう|マインドフルネス|meditation| mindfulness)/.test(t)) {
    return "MEDITATION";
  }
  if (/(履歴|記録|ログ|やった|やったよ|実践した|できた)/.test(t)) {
    return "PRACTICE_HISTORY";
  }
  if (/(ai先生|先生|対話|チャット|質問|聞きたい|教えてほしい)/.test(t)) {
    return "AI_TEACHER";
  }
  if (/(探す|検索|ヨガスタジオ|教室|スクール|イベント|近く|探して)/.test(t)) {
    return "SEARCH_YOGA";
  }
  if (/(学び|学ぶ|検定|勉強|資格|知識|クイズ|ドリル)/.test(t)) {
    return "LEARN";
  }
  if (/(ヨガ|yoga|ストレッチ|体|姿勢|ポーズ|アーサナ|リラックス|寝る前|朝|夜)/.test(t)) {
    return "GENERAL_YOGA";
  }

  return "UNKNOWN";
}

function isSafetySensitive(text: string): boolean {
  const t = text.toLowerCase();
  return SAFETY_KEYWORDS.some((kw) => t.includes(kw.toLowerCase()));
}

function getDeterministicResponse(intent: Intent, isLoggedIn: boolean): string {
  switch (intent) {
    case "GREETING":
      return isLoggedIn
        ? "こんにちは！今日のヨガをご案内できます。\n下のリッチメニューにある『今日のヨガ』をタップしてください。"
        : "こんにちは！Yoga AIへようこそ。\n下のリッチメニューにある『AI先生』をタップすると、あなたに合った実践をご案内できます。";

    case "TODAY_YOGA":
      return isLoggedIn
        ? "今日のヨガプログラムをご案内します。\n下のリッチメニューにある『今日のヨガ』をタップしてください。"
        : "今日のヨガをご案いできます。\n下のリッチメニューにある『AI先生』をタップして、あなたに合った実践を始めてみませんか？";

    case "BREATHING":
      return "呼吸法のご案内ですね。\nBox Breathing（4秒吸う・4秒止める・4秒吐く・4秒止める）は、落ち着きたい時に手軽にできます。\n下のリッチメニューにある『AI先生』をタップすると、手順とタイマー付きでご案内できます。";

    case "MEDITATION":
      return "瞑想のご案内ですね。\n1分間のマインドフルネスから始めるのがおすすめです。\n下のリッチメニューにある『AI先生』をタップすると、手順付きでご案内できます。";

    case "PRACTICE_HISTORY":
      return isLoggedIn
        ? "これまでの実践記録はこちらで確認できます。\n下のリッチメニューにある『カルテ』をタップしてください。"
        : "実践記録を見るには、LIFFログインが必要です。\n下のリッチメニューにある『AI先生』をタップしてログインすると、記録が保存されます。";

    case "AI_TEACHER":
      return "AI先生と対話できます。\n下のリッチメニューにある『AI先生』をタップしてください。";

    case "SEARCH_YOGA":
      return "ヨガスタジオやイベントを探せます。\n下のリッチメニューにある『ヨガを探す』をタップしてください。";

    case "LEARN":
      return "ヨガの学びや検定をご利用いただけます。\n下のリッチメニューにある『学び・検定』をタップしてください。";

    case "GENERAL_YOGA":
      return isLoggedIn
        ? "ヨガの実践、素敵ですね。\n下のリッチメニューにある『今日のヨガ』をタップすると、今日のプログラムをご案内できます。"
        : "ヨガに興味を持っていただきありがとうございます。\n下のリッチメニューにある『AI先生』をタップすると、あなたに合った実践をご案内できます。";

    case "SAFETY_SENSITIVE":
      return "その状態では、LINE上で個別の身体判断はできません。\n無理に実践せず、必要に応じて医療専門家や信頼できる指導者にご相談ください。\nYoga AIでは一般的な呼吸や学びの案内はできます。";

    default:
      return isLoggedIn
        ? "ヨガに関するご相談ですね。\n下のリッチメニューにある『AI先生』をタップすると、詳しくご案内できます。"
        : "ヨガに関するご相談ですね。\n下のリッチメニューにある『AI先生』をタップすると、あなたに合った実践をご案内できます。";
  }
}

async function callLLM(userMessage: string, intent: Intent, isLoggedIn: boolean): Promise<string | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return null;

  const intentContext = `Intent: ${intent}, LoggedIn: ${isLoggedIn}`;
  const prompt = `${SYSTEM_PROMPT}\n\nUser message:\n${userMessage.slice(0, MAX_USER_MESSAGE_CHARS)}\n\n${intentContext}\n\n上記に基づいて、1〜4短文で日本語で返答してください。`;

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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || text.trim().length === 0) return null;

    if (text.length > 1000) return null;

    const forbidden = ["治す", "治療する", "安全です", "治療します", "治ります", "医学的", "診断します", "完治", "療法"];
    for (const phrase of forbidden) {
      if (text.includes(phrase)) return null;
    }

    return text.trim();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function verifySignature(body: string, signature: string, channelSecret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(channelSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return expected === signature;
}

async function checkRateLimit(adminClient: ReturnType<typeof createClient>, lineUserId: string): Promise<boolean> {
  const oneMinuteAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();
  const { count, error } = await adminClient
    .from("line_ai_messages")
    .select("*", { count: "exact", head: true })
    .eq("line_user_id", lineUserId)
    .eq("direction", "user")
    .gte("created_at", oneMinuteAgo);

  if (error) return true;
  return (count ?? 0) >= RATE_LIMIT_MAX_MESSAGES;
}

async function sendLineReply(replyToken: string, text: string): Promise<boolean> {
  const channelAccessToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
  if (!channelAccessToken) {
    console.error("line-webhook: LINE_CHANNEL_ACCESS_TOKEN not set");
    return false;
  }

  try {
    const res = await fetch(LINE_REPLY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: "text", text }],
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("line-webhook: reply failed", err);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Line-Signature",
    }});
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const channelSecret = Deno.env.get("LINE_CHANNEL_SECRET");
  if (!channelSecret) {
    console.error("line-webhook: LINE_CHANNEL_SECRET not configured");
    return new Response(JSON.stringify({ error: "server_error" }), { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("X-Line-Signature") ?? "";

  const valid = await verifySignature(rawBody, signature, channelSecret);
  if (!valid) {
    return new Response(JSON.stringify({ error: "invalid_signature" }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "server_error" }), { status: 500 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const body = JSON.parse(rawBody);
    const events = body?.events;
    if (!Array.isArray(events) || events.length === 0) {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    for (const event of events) {
      if (event?.type !== "message" || event?.message?.type !== "text") continue;

      const lineUserId = event.source?.userId;
      const replyToken = event.replyToken;
      const userText = event.message.text ?? "";

      if (!lineUserId || !replyToken) continue;

      const safety = isSafetySensitive(userText);
      const intent = classifyIntent(userText);

      // Resolve LINE user → Yoga AI user
      let userId: string | null = null;
      let isLoggedIn = false;
      let membershipTier: string | null = null;

      const { data: identity } = await adminClient
        .from("line_identities")
        .select("user_id")
        .eq("line_sub", lineUserId)
        .maybeSingle();

      if (identity?.user_id) {
        userId = identity.user_id;
        isLoggedIn = true;

        const { data: profile } = await adminClient
          .from("profiles")
          .select("membership_tier")
          .eq("id", userId)
          .maybeSingle();

        membershipTier = profile?.membership_tier ?? null;
      }

      // Rate limit
      const rateLimited = await checkRateLimit(adminClient, lineUserId);
      if (rateLimited) {
        await sendLineReply(replyToken, "少し続けて送信されていますね。\n1分ほど時間をおいてから、また送ってください。");
        await adminClient.from("line_ai_messages").insert({
          user_id: userId,
          line_user_id: lineUserId,
          direction: "user",
          message_text: safety ? null : userText.slice(0, 500),
          intent,
          safety_flag: safety,
        });
        continue;
      }

      // Log user message
      await adminClient.from("line_ai_messages").insert({
        user_id: userId,
        line_user_id: lineUserId,
        direction: "user",
        message_text: safety ? null : userText.slice(0, 500),
        intent,
        safety_flag: safety,
      });

      // Generate response
      let responseText: string;

      if (safety) {
        responseText = getDeterministicResponse("SAFETY_SENSITIVE", isLoggedIn);
      } else if (isLoggedIn && membershipTier === "paid") {
        const llmText = await callLLM(userText, intent, isLoggedIn);
        responseText = llmText ?? getDeterministicResponse(intent, isLoggedIn);
      } else {
        responseText = getDeterministicResponse(intent, isLoggedIn);
      }

      // Send reply
      await sendLineReply(replyToken, responseText);

      // Log assistant message
      await adminClient.from("line_ai_messages").insert({
        user_id: userId,
        line_user_id: lineUserId,
        direction: "assistant",
        message_text: responseText.slice(0, 500),
        intent,
        safety_flag: safety,
      });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error("line-webhook: unhandled error", err);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
});
