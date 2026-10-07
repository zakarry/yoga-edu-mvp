import { supabase } from '../lib/supabase';
import type { AITeacherPersona } from '../lib/aiTeacherStorage';

export async function getSavedTeacher(userId: string): Promise<AITeacherPersona | null> {
  if (!supabase) throw new Error('クラウドに接続できません。');
  const { data, error } = await supabase.from('ai_teacher_personas').select('persona').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return (data?.persona as AITeacherPersona | undefined) ?? null;
}

export async function persistTeacher(userId: string, persona: AITeacherPersona | null): Promise<void> {
  if (!supabase) throw new Error('クラウドに接続できません。');
  const result = persona
    ? await supabase.from('ai_teacher_personas').upsert({ user_id: userId, persona, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    : await supabase.from('ai_teacher_personas').delete().eq('user_id', userId);
  if (result.error) throw result.error;
}
