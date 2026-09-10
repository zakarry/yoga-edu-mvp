import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type ProYogaStatus = 'not_started' | 'learning' | 'applied' | 'passed' | 'certified';

// The RPCs return machine-readable codes; map them to text for the user and
// never surface a raw database or transport error message, which would expose
// table, column and policy detail.
const RPC_ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: 'ログインしてください。',
  teacher_role_required: 'この学習コースは先生として登録されている方のみご利用いただけます。',
  invalid_progress: '進捗の値が正しくありません。',
  not_started: 'まずは学習を開始してください。',
  already_certified: 'すでに認定が完了しています。',
};

const GENERIC_ERROR = '处理を完了できませんでした。しばらくしてからもう一度お試しください。';

function friendlyRpcError(code: unknown): string {
  if (typeof code === 'string' && RPC_ERROR_MESSAGES[code]) return RPC_ERROR_MESSAGES[code];
  return GENERIC_ERROR;
}

export interface ProYogaCertification {
  id: string;
  user_id: string;
  status: ProYogaStatus;
  learning_progress: number;
  started_at: string | null;
  applied_at: string | null;
  passed_at: string | null;
  certified_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getProYogaStatus(
  userId: string,
): Promise<{ data: ProYogaCertification | null; error: string | null }> {
  if (!supabase || !isSupabaseConfigured) {
    return { data: null, error: '現在クラウド保存を利用できません' };
  }
  const { data, error } = await supabase
    .from('pro_yoga_certifications')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return { data: null, error: GENERIC_ERROR };
  return { data: data as ProYogaCertification | null, error: null };
}

export async function startProYogaLearning(
  userId: string,
): Promise<{ data: ProYogaCertification | null; error: string | null }> {
  if (!supabase || !isSupabaseConfigured) {
    return { data: null, error: '現在クラウド保存を利用できません' };
  }
  const { data, error } = await supabase.rpc('start_pro_yoga_learning');
  if (error) return { data: null, error: GENERIC_ERROR };
  const result = data as { data?: ProYogaCertification; error?: string } | null;
  if (result?.error) return { data: null, error: friendlyRpcError(result.error) };
  return { data: result?.data ?? null, error: null };
}

export async function updateProYogaProgress(
  userId: string,
  progress: number,
): Promise<{ data: ProYogaCertification | null; error: string | null }> {
  if (!supabase || !isSupabaseConfigured) {
    return { data: null, error: '現在クラウド保存を利用できません' };
  }
  const { data, error } = await supabase.rpc('update_pro_yoga_learning_progress', {
    p_progress: progress,
  });
  if (error) return { data: null, error: GENERIC_ERROR };
  const result = data as { data?: ProYogaCertification; error?: string } | null;
  if (result?.error) return { data: null, error: friendlyRpcError(result.error) };
  return { data: result?.data ?? null, error: null };
}
