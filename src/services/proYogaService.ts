import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type ProYogaStatus = 'not_started' | 'learning' | 'applied' | 'passed' | 'certified';

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
  if (error) return { data: null, error: error.message };
  return { data: data as ProYogaCertification | null, error: null };
}

export async function startProYogaLearning(
  userId: string,
): Promise<{ data: ProYogaCertification | null; error: string | null }> {
  if (!supabase || !isSupabaseConfigured) {
    return { data: null, error: '現在クラウド保存を利用できません' };
  }
  const { data, error } = await supabase.rpc('start_pro_yoga_learning');
  if (error) return { data: null, error: error.message };
  const result = data as { data?: ProYogaCertification; error?: string } | null;
  if (result?.error) return { data: null, error: result.error };
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
  if (error) return { data: null, error: error.message };
  const result = data as { data?: ProYogaCertification; error?: string } | null;
  if (result?.error) return { data: null, error: result.error };
  return { data: result?.data ?? null, error: null };
}
