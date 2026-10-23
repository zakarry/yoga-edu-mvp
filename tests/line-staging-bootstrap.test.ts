import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const sql = await readFile(new URL('../scripts/staging/prepare-line-auth.sql', import.meta.url), 'utf8');
async function setup() {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE TABLE public.profiles(id uuid PRIMARY KEY);
    CREATE TABLE public.ai_teacher_settings(user_id uuid PRIMARY KEY);`);
  return db;
}
test('LINE staging SQL: new tables protected; service role only; existing setup preserved', async () => {
  const db = await setup();
  try {
    await db.exec(sql);
    const rls = await db.query<{relrowsecurity: boolean}>(`SELECT relrowsecurity FROM pg_class WHERE oid IN ('public.line_auth_states'::regclass,'public.line_identities'::regclass)`);
    assert.equal(rls.rows.length, 2); assert.ok(rls.rows.every(r => r.relrowsecurity));
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      for (const table of ['line_auth_states', 'line_identities']) {
        await assert.rejects(db.query(`SELECT * FROM public.${table}`), /permission denied/);
        await assert.rejects(db.query(`DELETE FROM public.${table}`), /permission denied/);
      }
      await db.exec('RESET ROLE');
    }
    await db.exec(`SET ROLE service_role; INSERT INTO public.line_auth_states(state,redirect_to) VALUES ('fixture-state','https://teacher-staging.example');`);
    assert.equal((await db.query('SELECT id FROM public.line_auth_states')).rows.length, 1);
    await db.exec('RESET ROLE');
    await assert.rejects(db.exec(sql), /LINE tables already exist/);
    await db.exec('ROLLBACK');
    assert.equal((await db.query('SELECT id FROM public.line_auth_states')).rows.length, 1);
    assert.equal((await db.query('SELECT * FROM public.ai_teacher_settings')).rows.length, 0);
  } finally { await db.close(); }
});
