import { supabase } from '../lib/supabase';
import { settingsToRow, rowToSettings } from '../lib/teacherSettingsRow';
import { TeacherSettingsConflictError, validTeacherSettings, type TeacherSettingsRepository } from '../lib/teacherSettings';

const columns = 'user_id,teacher_name,avatar,personality,specialty,ui_language,teaching_language,persona_created_at,explanation,cue,praise,revision';
async function accountClient(userId: string, signal: AbortSignal) {
  if (!supabase || signal.aborted) throw new Error('unavailable');
  const { data, error } = await supabase.auth.getSession();
  if (error || signal.aborted || data.session?.user.id !== userId) throw new Error('account changed');
  return supabase;
}
export const teacherSettingsRepository: TeacherSettingsRepository = {
  async load(userId, signal) {
    const client = await accountClient(userId, signal);
    const { data, error } = await client.from('ai_teacher_settings').select(columns).eq('user_id', userId).abortSignal(signal).maybeSingle();
    if (error) throw new Error('load failed');
    return data ? rowToSettings(data, userId) : null;
  },
  async save(userId, settings, revision, signal) {
    if (!validTeacherSettings(settings)) throw new Error('invalid settings');
    const client = await accountClient(userId, signal), row = settingsToRow(userId, settings);
    // Insert only after a successful missing-row read; never upsert over an unread row.
    const query = revision === null ? client.from('ai_teacher_settings').insert(row) :
      client.from('ai_teacher_settings').update(Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'user_id'))).eq('user_id', userId).eq('revision', revision);
    const { data, error } = await query.select(columns).abortSignal(signal).maybeSingle();
    if (error?.code === '23505' || (error?.code === 'PGRST116' && error.details?.includes('0 rows')) || (!error && !data)) throw new TeacherSettingsConflictError('revision conflict');
    if (error) throw new Error('save failed');
    if (!data) throw new Error('missing saved row');
    return rowToSettings(data, userId);
  },
};
