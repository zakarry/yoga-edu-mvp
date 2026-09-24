import type { AITeacherLLMRequest } from '../types/aiTeacherLLM';
import { supabase } from '../lib/supabase';
import { getMembershipTier, isPaidMember } from './membershipService';

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
  membershipRequired?: boolean;
  reason?: string;
  httpStatus?: number;
}

async function canUseLLM(userId: string | null): Promise<boolean> {
  if (!LLM_ENABLED || !userId || !supabase) return false;
  // Phase 1: free and paid members can use LLM conversation.
  // Guest (no userId) falls back to old template path.
  const tier = await getMembershipTier(userId);
  return tier === 'free' || isPaidMember(tier);
}

export async function fetchLLMExplanation(
  payload: AITeacherLLMRequest,
  userId: string | null,
): Promise<LLMExplanationResult> {
  const allowed = await canUseLLM(userId);
  if (!allowed) {
    return { text: null, fallback: true, reason: LLM_ENABLED ? 'authentication_required' : 'disabled' };
  }

  if (!checkRateLimit()) {
    return { text: null, fallback: true, reason: 'rate_limited' };
  }

  try {
    const { data: session } = await supabase!.auth.getSession();
    const accessToken = session?.session?.access_token;
    if (!accessToken) {
      return { text: null, fallback: true, reason: 'authentication_required' };
    }

    const functionName = import.meta.env.DEV && import.meta.env.VITE_AI_TEACHER_TEST_FUNCTION === 'ai-teacher-explanation-preview'
      ? 'ai-teacher-explanation-preview' : 'ai-teacher-explanation';
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`;
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return { text: null, fallback: true, reason: 'edge_error', httpStatus: res.status };
    }

    const data = await res.json();
    if (!data || typeof data !== 'object') {
      return { text: null, fallback: true, reason: 'invalid_response', httpStatus: res.status };
    }

    if (data.fallback || typeof data.text !== 'string' || !data.text.trim()) {
      return { text: null, fallback: true, model: data.model, reason: data.reason === 'rate_limited' ? 'rate_limited' : 'llm_unavailable', httpStatus: res.status };
    }

    return {
      text: data.text as string,
      fallback: false,
      model: data.model as string,
      httpStatus: res.status,
    };
  } catch {
    return { text: null, fallback: true, reason: 'network_error' };
  }
}

export function isLLMExplanationEnabled(): boolean {
  return LLM_ENABLED;
}
