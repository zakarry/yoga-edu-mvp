import type { AITeacherLLMRequest } from '../types/aiTeacherLLM';

const LLM_ENABLED = import.meta.env.VITE_AI_TEACHER_LLM_ENABLED === 'true';
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_CALLS = 5;

let callTimestamps: number[] = [];

function checkRateLimit(): boolean {
  const now = Date.now();
  callTimestamps = callTimestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (callTimestamps.length >= RATE_LIMIT_MAX_CALLS) return false;
  callTimestamps.push(now);
  return true;
}

export interface LLMExplanationResult {
  text: string | null;
  fallback: boolean;
  model?: string;
}

export async function fetchLLMExplanation(
  payload: AITeacherLLMRequest,
): Promise<LLMExplanationResult> {
  if (!LLM_ENABLED) {
    return { text: null, fallback: true };
  }

  if (!checkRateLimit()) {
    return { text: null, fallback: true };
  }

  try {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-teacher-explanation`;
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return { text: null, fallback: true };
    }

    const data = await res.json();
    if (!data || typeof data !== 'object') {
      return { text: null, fallback: true };
    }

    if (data.fallback || !data.text) {
      return { text: null, fallback: true, model: data.model };
    }

    return {
      text: data.text as string,
      fallback: false,
      model: data.model as string,
    };
  } catch {
    return { text: null, fallback: true };
  }
}

export function isLLMExplanationEnabled(): boolean {
  return LLM_ENABLED;
}
