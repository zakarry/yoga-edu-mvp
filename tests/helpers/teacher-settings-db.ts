import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { settingsToRow, rowToSettings } from '../../src/lib/teacherSettingsRow';
import type { TeacherSettings, TeacherSettingsRepository } from '../../src/lib/teacherSettings';

export const USER_A = '11111111-1111-4111-8111-111111111111';
export const USER_B = '22222222-2222-4222-8222-222222222222';
export async function settingsDatabase() {
  const db = new PGlite();
  await db.exec(`CREATE SCHEMA auth;
    CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOBYPASSRLS;
    CREATE ROLE anon NOLOGIN NOSUPERUSER NOBYPASSRLS;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth, public TO authenticated, anon;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;
    INSERT INTO auth.users VALUES ('${USER_A}'),('${USER_B}');`);
  await db.exec(readFileSync('supabase/migrations/20261013000100_ai_teacher_settings.sql', 'utf8'));
  return db;
}
export async function asUser<T>(db: PGlite, userId: string | null, work: (tx: PGlite) => Promise<T>): Promise<T> {
  // Real Postgres role/RLS. Claim setting is synthetic, not a live Supabase Auth JWT.
  return db.transaction(async tx => {
    await tx.exec(`SET LOCAL ROLE ${userId ? 'authenticated' : 'anon'}`);
    await tx.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [userId ?? '']);
    return work(tx as unknown as PGlite);
  });
}
export function dbRepository(db: PGlite, identity: () => string | null): TeacherSettingsRepository {
  return {
    async load(userId, signal) {
      if (signal.aborted || userId !== identity()) throw new Error('identity changed');
      return asUser(db, identity(), async tx => {
        const result = await tx.query<Record<string, unknown>>('SELECT * FROM public.ai_teacher_settings WHERE user_id=$1', [userId]);
        return result.rows[0] ? decodeDbRow(result.rows[0], userId) : null;
      });
    },
    async save(userId, settings, revision, signal) {
      if (signal.aborted || userId !== identity()) throw new Error('identity changed');
      return asUser(db, identity(), async tx => saveSettingsRow(tx, userId, settings, revision));
    },
  };
}
export async function saveSettingsRow(tx: PGlite, userId: string, settings: TeacherSettings, revision: number | null) {
  const row = settingsToRow(userId, settings), keys = Object.keys(row), values = Object.values(row);
  const sql = revision === null ? `INSERT INTO public.ai_teacher_settings (${keys.join(',')}) VALUES (${keys.map((_, i) => '$'+(i+1)).join(',')}) RETURNING *` :
    `UPDATE public.ai_teacher_settings SET ${keys.slice(1).map((key, i) => key+'=$'+(i+2)).join(',')} WHERE user_id=$1 AND revision=$${values.length+1} RETURNING *`;
  const result = await tx.query<Record<string, unknown>>(sql, revision === null ? values : [...values, revision]);
  if (result.rows.length !== 1) throw new Error('revision conflict');
  // PGlite returns timestamptz as Date while PostgREST returns ISO text.
  return decodeDbRow(result.rows[0], userId);
}
function decodeDbRow(stored: Record<string, unknown>, userId: string) {
  if (stored.persona_created_at instanceof Date) stored.persona_created_at = stored.persona_created_at.toISOString();
  return rowToSettings(stored, userId);
}
