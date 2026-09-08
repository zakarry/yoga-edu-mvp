import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { PrivacySettings } from '../lib/auth';
import type { SafetyState, SafetyUrgency, SafetyCategory } from './diagnosisService';

export interface PracticeLog {
  id: string;
  user_id: string;
  practice_type: 'asana' | 'pranayama' | 'dhyana';
  practice_name: string;
  duration_min: number | null;
  mood_before: string | null;
  mood_after: string | null;
  note: string | null;
  ai_teacher_used: boolean;
  safety_state: SafetyState;
  safety_urgency: SafetyUrgency;
  requires_human_review: boolean;
  safety_category: SafetyCategory | null;
  created_at: string;
}

export interface SavePracticeLogParams {
  practice_type: 'asana' | 'pranayama' | 'dhyana';
  practice_name: string;
  duration_min?: number | null;
  mood_before?: string | null;
  mood_after?: string | null;
  note?: string | null;
  ai_teacher_used?: boolean;
  safety_state?: SafetyState;
  safety_urgency?: SafetyUrgency;
  requires_human_review?: boolean;
  safety_category?: SafetyCategory | null;
}

export interface PracticeSummary {
  asana: { count: number; totalMinutes: number; latestDate: string | null };
  pranayama: { count: number; totalMinutes: number; latestDate: string | null };
  dhyana: { count: number; totalMinutes: number; latestDate: string | null };
}

export async function savePracticeLog(
  userId: string,
  privacy: PrivacySettings | null,
  params: SavePracticeLogParams,
): Promise<{ data: PracticeLog | null; error: string | null; savedToCloud: boolean }> {
  if (!supabase || !isSupabaseConfigured) {
    return { data: null, error: '現在クラウド保存を利用できません', savedToCloud: false };
  }

  if (!privacy?.save_practice_history) {
    return { data: null, error: null, savedToCloud: false };
  }

  const allowSensitive = privacy.allow_sensitive_data_storage;
  const noteToSave = allowSensitive ? (params.note ?? null) : null;

  const { data, error } = await supabase
    .from('practice_logs')
    .insert({
      user_id: userId,
      practice_type: params.practice_type,
      practice_name: params.practice_name,
      duration_min: params.duration_min ?? null,
      mood_before: params.mood_before ?? null,
      mood_after: params.mood_after ?? null,
      note: noteToSave,
      ai_teacher_used: params.ai_teacher_used ?? false,
      safety_state: params.safety_state ?? 'normal',
      safety_urgency: params.safety_urgency ?? 'none',
      requires_human_review: params.requires_human_review ?? false,
      safety_category: params.safety_category ?? null,
    })
    .select('*')
    .single();

  if (error) return { data: null, error: error.message, savedToCloud: false };
  return { data: data as PracticeLog, error: null, savedToCloud: true };
}

export async function getPracticeLogs(userId: string): Promise<{ data: PracticeLog[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: '現在クラウド保存を利用できません' };
  const { data, error } = await supabase
    .from('practice_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: error.message };
  return { data: data as PracticeLog[], error: null };
}

export async function getPracticeSummary(userId: string): Promise<{ data: PracticeSummary | null; error: string | null }> {
  const { data, error } = await getPracticeLogs(userId);
  if (error) return { data: null, error };
  if (!data) return { data: null, error: null };

  const empty = { count: 0, totalMinutes: 0, latestDate: null };
  const summary: PracticeSummary = {
    asana: { ...empty },
    pranayama: { ...empty },
    dhyana: { ...empty },
  };

  for (const log of data) {
    const bucket = summary[log.practice_type];
    if (!bucket) continue;
    bucket.count++;
    if (log.duration_min) bucket.totalMinutes += log.duration_min;
    if (!bucket.latestDate || log.created_at > bucket.latestDate) {
      bucket.latestDate = log.created_at;
    }
  }

  return { data: summary, error: null };
}

export async function deletePracticeLog(userId: string, logId: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: '現在クラウド保存を利用できません' };
  const { error } = await supabase
    .from('practice_logs')
    .delete()
    .eq('id', logId)
    .eq('user_id', userId);
  return { error: error?.message ?? null };
}
