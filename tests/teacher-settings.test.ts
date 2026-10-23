import { PGlite } from '@electric-sql/pglite';
import test from 'node:test';
import assert from 'node:assert/strict';
import { TeacherSettingsConflictError, TeacherSettingsController, emptyTeacherSettings, validTeacherSettings, copyTeacherSettings, readConfirmedTeacherSettings, type TeacherSettings, type TeacherSettingsRepository } from '../src/lib/teacherSettings';
import { settingsDatabase, asUser, dbRepository, USER_A, USER_B } from './helpers/teacher-settings-db';
import { withoutTeacherSettingsEdits } from './teacher-settings-source-boundary';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import approved from './fixtures/q05-approved-source-hashes.json';

const settings = (name = 'MAYA'): TeacherSettings => ({ persona: { name, avatar: '🌿', personality: 'precise', specialty: 'hatha', uiLanguage: 'ja', teachingLanguage: 'en', createdAt: '2026-10-13T00:00:00.000Z' }, prefs: { explanation: 'detailed', cue: 'minimal', praise: 'less' } });
const guest = { load: () => settings('unowned legacy'), save: () => {} };

test('isolated Postgres: save, logout/relogin, same ID across providers and cross-account separation', async () => {
  const db = await settingsDatabase(); let identity: string | null = USER_A;
  const controller = new TeacherSettingsController(dbRepository(db, () => identity), guest);
  try {
    await controller.switchOwner(USER_A);
    assert.equal(controller.snapshot().settings.persona, null, 'legacy must not be imported');
    assert.equal(await controller.save(settings()), true);
    identity = null; await controller.switchOwner(null);
    assert.equal(readConfirmedTeacherSettings(USER_A), null);
    assert.equal(controller.snapshot().settings.persona?.name, 'unowned legacy');
    identity = USER_B; await controller.switchOwner(USER_B);
    assert.equal(controller.snapshot().settings.persona, null);
    await controller.save(settings('B teacher'));
    identity = USER_A; await controller.switchOwner(USER_A);
    assert.deepEqual(controller.snapshot().settings, settings());
    // Provider is not a storage key. A second controller with the same subject restores A.
    const second = new TeacherSettingsController(dbRepository(db, () => identity), guest);
    await second.switchOwner(USER_A); assert.deepEqual(second.snapshot().settings, settings()); second.dispose();
  } finally { controller.dispose(); await db.close(); }
});

test('isolated Postgres RLS forbids other-user SELECT/INSERT/UPDATE/DELETE and anonymous access', async () => {
  const db = await settingsDatabase();
  try {
    const repo = dbRepository(db, () => USER_A); await repo.save(USER_A, settings(), null, new AbortController().signal);
    await asUser(db, USER_B, async tx => {
      assert.equal((await tx.query('SELECT * FROM public.ai_teacher_settings')).rows.length, 0);
      assert.equal((await tx.query("UPDATE public.ai_teacher_settings SET teacher_name='stolen' WHERE user_id=$1 RETURNING *", [USER_A])).rows.length, 0);
      assert.equal((await tx.query('DELETE FROM public.ai_teacher_settings WHERE user_id=$1 RETURNING *', [USER_A])).rows.length, 0);
    });
    await assert.rejects(asUser(db, USER_B, tx => tx.query('INSERT INTO public.ai_teacher_settings (user_id) VALUES ($1)', [USER_A])), /row-level security/);
    await assert.rejects(asUser(db, null, tx => tx.query('SELECT * FROM public.ai_teacher_settings')), /permission denied/);
    await assert.rejects(asUser(db, USER_A, tx => tx.query('UPDATE public.ai_teacher_settings SET user_id=$1', [USER_B])), /permission denied/);
    await assert.rejects(asUser(db, USER_A, tx => tx.query('UPDATE public.ai_teacher_settings SET revision=999')), /permission denied/);
    await assert.rejects(asUser(db, USER_A, tx => tx.query("UPDATE public.ai_teacher_settings SET personality='invalid'")), /check constraint/);
    assert.equal((await repo.load(USER_A, new AbortController().signal))?.settings.persona?.name, 'MAYA');
  } finally { await db.close(); }
});

test('isolated Postgres detects stale revisions, persists persona removal, and cascades account deletion', async () => {
  const db = await settingsDatabase(), repo = dbRepository(db, () => USER_A), signal = new AbortController().signal;
  try {
    const first = await repo.save(USER_A, settings(), null, signal);
    const next = await repo.save(USER_A, settings('new'), first.revision, signal);
    assert.equal(next.revision, 2);
    await assert.rejects(repo.save(USER_A, settings('stale'), first.revision, signal), /revision conflict/);
    await repo.save(USER_A, { persona: null, prefs: next.settings.prefs }, next.revision, signal);
    assert.equal((await repo.load(USER_A, signal))?.settings.persona, null);
    await db.query('DELETE FROM auth.users WHERE id=$1', [USER_A]);
    assert.equal((await db.query('SELECT * FROM public.ai_teacher_settings')).rows.length, 0);
  } finally { await db.close(); }
});

test('read failures block writes; save failure retains last confirmed data and supports retry', async () => {
  let writes = 0, failRead = true, failSave = true;
  const repo: TeacherSettingsRepository = {
    async load() { if (failRead) throw Error(); return { settings: settings(), revision: 1 }; },
    async save(_id, value) { writes++; if (failSave) throw Error(); return { settings: value, revision: 2 }; },
  };
  const c = new TeacherSettingsController(repo, guest);
  await c.switchOwner(USER_A); assert.equal(c.snapshot().status, 'error');
  assert.equal(await c.save(settings('bad write')), false); assert.equal(writes, 0);
  failRead = false; await c.switchOwner(USER_A);
  assert.equal(await c.save(settings('draft')), false); assert.equal(c.snapshot().settings.persona?.name, 'MAYA');
  assert.match(c.snapshot().message!, /保存できません/);
  failSave = false; assert.equal(await c.save(settings('draft')), true);
  assert.equal(c.snapshot().settings.persona?.name, 'draft'); c.dispose();
});

test('late reads and saves cannot install old-account settings; repeated save requests are serialized', async () => {
  let releaseRead!: (value: null) => void, releaseSave!: (value: { settings: TeacherSettings; revision: number }) => void, writes = 0;
  const repo: TeacherSettingsRepository = {
    load: id => id === USER_A ? new Promise(resolve => { releaseRead = resolve; }) : Promise.resolve(null),
    save: () => { writes++; return new Promise(resolve => { releaseSave = resolve; }); },
  };
  const c = new TeacherSettingsController(repo, guest);
  const read = c.switchOwner(USER_A); await c.switchOwner(USER_B); releaseRead(null); await read;
  assert.equal(c.snapshot().owner, USER_B); assert.equal(c.snapshot().settings.persona, null);
  const save = c.save(settings('B draft')); assert.equal(await c.save(settings('duplicate')), false); assert.equal(writes, 1);
  await c.switchOwner(null); releaseSave({ settings: settings('B draft'), revision: 1 }); assert.equal(await save, false);
  assert.equal(c.snapshot().settings.persona?.name, 'unowned legacy'); assert.equal(readConfirmedTeacherSettings(USER_B), null); c.dispose();
});

test('guest browser storage failures are reported; invalid or extra sensitive fields are not saved', async () => {
  const c = new TeacherSettingsController({ load: async () => null, save: async () => { throw Error('no cloud'); } }, { load: guest.load, save() { throw Error('quota'); } });
  await c.switchOwner(null); assert.equal(await c.save(settings()), false); assert.match(c.snapshot().message!, /保存できません/);
  assert.equal(validTeacherSettings({ ...settings(), persona: { ...settings().persona, name: 'x'.repeat(81) } }), false);
  const extra = { ...settings(), facts: ['health'], memory: ['private'], persona: { ...settings().persona!, diagnosis: 'private' } };
  assert.deepEqual(copyTeacherSettings(extra), settings()); c.dispose();
});

test('settings-only page edits preserve original Q-05 source hash and reject unrelated practice changes', () => {
  const path = 'src/components/MyAITeacherPage.tsx', source = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  const baseline = withoutTeacherSettingsEdits(path, source);
  assert.equal(createHash('sha256').update(baseline).digest('hex'), approved[path]);
  const changed = withoutTeacherSettingsEdits(path, source.replace('createPracticeAudioRuntime()', 'createPracticeAudioRuntime(123)'));
  if (source.includes('createPracticeAudioRuntime()')) assert.notEqual(createHash('sha256').update(changed).digest('hex'), approved[path]);
  else assert.notEqual(createHash('sha256').update(baseline + '\n// unrelated').digest('hex'), approved[path]);
});


test('fresh staging bootstrap: signup profiles, consent RLS, privilege isolation and populated-project refusal', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE SCHEMA auth; CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOBYPASSRLS;
      CREATE ROLE anon NOLOGIN NOSUPERUSER NOBYPASSRLS; CREATE TABLE auth.users (id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;`);
    const bootstrap = readFileSync('scripts/staging/bootstrap-teacher-auth.sql','utf8');
    await db.exec(bootstrap);
    await db.exec(readFileSync('supabase/migrations/20261013000100_ai_teacher_settings.sql','utf8'));
    await db.query('INSERT INTO auth.users VALUES ($1),($2)', [USER_A, USER_B]);
    await asUser(db, USER_A, async tx => {
      const profiles = await tx.query<{id:string; is_admin:boolean; membership_tier:string}>('SELECT * FROM public.profiles');
      assert.equal(profiles.rows.length,1); assert.equal(profiles.rows[0].id,USER_A);
      assert.equal(profiles.rows[0].is_admin,false); assert.equal(profiles.rows[0].membership_tier,'free');
      const privacy = await tx.query<{allow_ai_memory:boolean}>('SELECT * FROM public.privacy_settings');
      assert.equal(privacy.rows.length,1); assert.equal(privacy.rows[0].allow_ai_memory,false);
      await tx.query("INSERT INTO public.user_consents (user_id,terms_version,privacy_version) VALUES ($1,'1.0','1.0')",[USER_A]);
    });
    await assert.rejects(asUser(db, USER_A, tx => tx.exec('UPDATE public.profiles SET is_admin=true')),/permission denied/);
    await assert.rejects(asUser(db, USER_A, tx => tx.exec("UPDATE public.profiles SET membership_tier='paid'")),/permission denied/);
    await assert.rejects(asUser(db, USER_B, tx => tx.query("INSERT INTO public.user_consents (user_id,terms_version,privacy_version) VALUES ($1,'1.0','1.0')",[USER_A])),/row-level security/);
    await asUser(db, USER_B, async tx => assert.equal((await tx.query('SELECT * FROM public.user_consents')).rows.length,0));
    await assert.rejects(asUser(db, null, tx => tx.exec('SELECT * FROM public.profiles')),/permission denied/);
    await assert.rejects(db.exec(bootstrap),/Refusing non-empty project/);
    await db.exec('ROLLBACK');
    assert.equal((await db.query('SELECT * FROM public.profiles')).rows.length,2);
  } finally { await db.close(); }
});


test('editor revision stays stale after reload; conflict never confirms an old draft', async () => {
 const db=await settingsDatabase(), repo=dbRepository(db,()=>USER_A), c=new TeacherSettingsController(repo,guest);
 try {
  await c.switchOwner(USER_A); assert.equal(await c.save(settings('initial')),true);
  const editorRevision=c.snapshot().revision;
  await repo.save(USER_A,settings('other device'),editorRevision,new AbortController().signal);
  await c.switchOwner(USER_A);
  assert.equal(await c.save(settings('old draft'),editorRevision),false);
  assert.ok(c.snapshot().message?.includes('\u5225\u306e\u7aef\u672b\u3067\u8a2d\u5b9a\u304c\u66f4\u65b0\u3055\u308c\u3066\u3044\u307e\u3059'));
  assert.equal(c.snapshot().settings.persona?.name,'other device');
  assert.equal((await repo.load(USER_A,new AbortController().signal))?.settings.persona?.name,'other device');
 } finally {c.dispose();await db.close();}
});

test('same revision simultaneous writers have one winner, followed by relogin restoration',async()=>{
 const db=await settingsDatabase(), repo=dbRepository(db,()=>USER_A), signal=new AbortController().signal;
 try {
  const initial=await repo.save(USER_A,settings('initial'),null,signal);
  const results=await Promise.allSettled([repo.save(USER_A,settings('writer1'),initial.revision,signal),repo.save(USER_A,settings('writer2'),initial.revision,signal)]);
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
  const loser=results.find(x=>x.status==='rejected');assert.ok(loser?.status==='rejected' && loser.reason instanceof TeacherSettingsConflictError);
  const winner=results.find(x=>x.status==='fulfilled');assert.ok(winner?.status==='fulfilled');
  const c=new TeacherSettingsController(repo,guest);await c.switchOwner(null);await c.switchOwner(USER_A);
  assert.equal(c.snapshot().settings.persona?.name,winner.value.settings.persona?.name);
  assert.equal(await c.save(settings('nonconflicting')),true);assert.equal(c.snapshot().revision,3);c.dispose();
 } finally {await db.close();}
});
