import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { PrivacySettings } from '../lib/auth';

export type SafetyState = 'normal' | 'caution' | 'stop_and_refer';
export type SafetyUrgency = 'none' | 'routine' | 'prompt' | 'urgent';
export type SafetyCategory = 'pain' | 'injury' | 'medical_condition' | 'pregnancy_postpartum' | 'exercise_restriction' | 'red_flag' | 'other';

export interface DiagnosisRecord {
  id: string;
  user_id: string;
  diagnosis_type: 'student' | 'teacher';
  schema_version: string;
  answers_json: Record<string, unknown> | null;
  condition_record_json: Record<string, unknown> | null;
  learning_record_json: Record<string, unknown> | null;
  result_type: string | null;
  score_json: Record<string, unknown> | null;
  safety_state: SafetyState;
  safety_urgency: SafetyUrgency;
  requires_human_review: boolean;
  safety_category: SafetyCategory | null;
  created_at: string;
}

export interface SaveDiagnosisParams {
  diagnosis_type: 'student' | 'teacher';
  schema_version: string;
  answers_json: Record<string, unknown>;
  condition_record_json?: Record<string, unknown> | null;
  learning_record_json?: Record<string, unknown> | null;
  result_type?: string | null;
  score_json?: Record<string, unknown> | null;
  safety_state?: SafetyState;
  safety_urgency?: SafetyUrgency;
  requires_human_review?: boolean;
  safety_category?: SafetyCategory | null;
}

const SENSITIVE_KEYS = new Set([
  'bodyCondition', 'mentalCondition', 'breathEase', 'energyLevel',
  'baseline', 'safetyFlags', 'safetyOutcome', 'weightFocus',
  'current_issue', 'life', 'teaching_status',
]);

function sanitizeAnswers(answers: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(answers)) {
    if (!SENSITIVE_KEYS.has(key)) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export async function saveDiagnosis(
  userId: string,
  privacy: PrivacySettings | null,
  params: SaveDiagnosisParams,
): Promise<{ data: DiagnosisRecord | null; error: string | null; savedToCloud: boolean }> {
  if (!supabase || !isSupabaseConfigured) {
    return { data: null, error: '現在クラウド保存を利用できません', savedToCloud: false };
  }

  if (!privacy?.save_diagnosis) {
    return { data: null, error: null, savedToCloud: false };
  }

  const allowSensitive = privacy.allow_sensitive_data_storage;
  const answersToSave = allowSensitive ? params.answers_json : sanitizeAnswers(params.answers_json);
  const conditionToSave = allowSensitive ? (params.condition_record_json ?? null) : null;

  const { data, error } = await supabase
    .from('diagnoses')
    .insert({
      user_id: userId,
      diagnosis_type: params.diagnosis_type,
      schema_version: params.schema_version,
      answers_json: answersToSave,
      condition_record_json: conditionToSave,
      learning_record_json: params.learning_record_json ?? null,
      result_type: params.result_type ?? null,
      score_json: params.score_json ?? null,
      safety_state: params.safety_state ?? 'normal',
      safety_urgency: params.safety_urgency ?? 'none',
      requires_human_review: params.requires_human_review ?? false,
      safety_category: params.safety_category ?? null,
    })
    .select('*')
    .single();

  if (error) return { data: null, error: error.message, savedToCloud: false };
  return { data: data as DiagnosisRecord, error: null, savedToCloud: true };
}

export async function getDiagnosisHistory(userId: string): Promise<{ data: DiagnosisRecord[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: '現在クラウド保存を利用できません' };
  const { data, error } = await supabase
    .from('diagnoses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: error.message };
  return { data: data as DiagnosisRecord[], error: null };
}

export async function getTeacherDiagnosisHistory(userId: string): Promise<{ data: DiagnosisRecord[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: '現在クラウド保存を利用できません' };
  const { data, error } = await supabase
    .from('diagnoses')
    .select('*')
    .eq('user_id', userId)
    .eq('diagnosis_type', 'teacher')
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: error.message };
  return { data: data as DiagnosisRecord[], error: null };
}

export async function getLatestDiagnosis(userId: string): Promise<{ data: DiagnosisRecord | null; error: string | null }> {
  if (!supabase) return { data: null, error: '現在クラウド保存を利用できません' };
  const { data, error } = await supabase
    .from('diagnoses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  return { data: data as DiagnosisRecord | null, error: null };
}

export async function deleteDiagnosis(userId: string, diagnosisId: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: '現在クラウド保存を利用できません' };
  const { error } = await supabase
    .from('diagnoses')
    .delete()
    .eq('id', diagnosisId)
    .eq('user_id', userId);
  return { error: error?.message ?? null };
}

export function isSixMonthsPast(latestDate: string): boolean {
  const diff = Date.now() - new Date(latestDate).getTime();
  return diff >= 180 * 24 * 60 * 60 * 1000;
}
