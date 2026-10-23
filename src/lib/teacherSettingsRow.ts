import { copyTeacherSettings, validTeacherSettings, type TeacherSettings, type StoredTeacherSettings } from './teacherSettings';

export function settingsToRow(userId: string, value: TeacherSettings) {
  const { persona: p, prefs } = copyTeacherSettings(value);
  return { user_id: userId, teacher_name: p?.name ?? null, avatar: p?.avatar ?? '🧘‍♀️', personality: p?.personality ?? 'gentle',
    specialty: p?.specialty ?? 'pranayama', ui_language: p?.uiLanguage ?? 'ja', teaching_language: p?.teachingLanguage ?? 'ja',
    persona_created_at: p?.createdAt ?? null, explanation: prefs.explanation, cue: prefs.cue, praise: prefs.praise };
}
export function rowToSettings(row: Record<string, unknown>, owner: string): StoredTeacherSettings {
  if (row.user_id !== owner || !Number.isSafeInteger(row.revision) || Number(row.revision) < 1) throw new Error('invalid owner/revision');
  const settings = { persona: row.teacher_name === null ? null : { name: row.teacher_name, avatar: row.avatar, personality: row.personality,
    specialty: row.specialty, uiLanguage: row.ui_language, teachingLanguage: row.teaching_language, createdAt: row.persona_created_at },
    prefs: { explanation: row.explanation, cue: row.cue, praise: row.praise } };
  if (!validTeacherSettings(settings)) throw new Error('invalid settings');
  return { settings, revision: Number(row.revision) };
}
