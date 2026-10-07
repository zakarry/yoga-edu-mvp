import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { PracticeAudioRuntime } from '../src/lib/practiceAudioRuntime';
import { buildAsanaCues } from '../src/lib/asanaCueBuilder';
import { getCatalogEntry } from '../src/lib/poseCatalog';
import { hasProYogaQualification } from '../src/lib/proYogaQualification';
import type { VoiceGuideEngine } from '../src/lib/voiceGuide';

function audio() {
  let end: (() => void) | null = null;
  let playing = false;
  const spoken: string[] = [];
  let interruptions = 0;
  const engine: VoiceGuideEngine = {
    type: 'audio-file', available: true,
    speak(text) { if (playing) interruptions++; spoken.push(text); playing = true; },
    speakByKey(_key, text) { this.speak(text ?? ''); },
    stop() { playing = false; }, pause() {}, resume() {}, unlock() {},
    getAudioDuration() { return null; }, isPlaying() { return playing; },
    setOnCueEnd(cb) { end = cb; }, getStatus() { return { status: playing ? 'playing' : 'stopped', voiceName: null, error: null }; },
  };
  return { engine, spoken, get interruptions() { return interruptions; }, finish() { playing = false; end?.(); } };
}

test('Rest voice cannot be interrupted by countdown or estimated watchdog', t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout', 'setInterval'], now: 100000 });
  const a = audio();
  const runtime = new PracticeAudioRuntime(a.engine);
  runtime.start({ practiceId: 'savasana', totalDurationSec: 12, cues: [
    { id: 'instruction', type: 'voice', speechText: '長い案内を最後まで聞きます。', audioKey: 'uncached' },
    { id: 'countdown', type: 'voice', speechText: 'あと少しです。', scheduledAtSec: 5 },
    { id: 'completion', type: 'voice', speechText: 'お疲れさまでした。', scheduledAtSec: 0 },
    { id: 'done', type: 'complete', scheduledAtSec: 0 },
  ] });
  t.mock.timers.tick(14000);
  assert.deepEqual(a.spoken, ['長い案内を最後まで聞きます。']);
  assert.equal(runtime.currentState, 'running');
  a.finish(); t.mock.timers.tick(200);
  assert.deepEqual(a.spoken, ['長い案内を最後まで聞きます。', 'お疲れさまでした。']);
  assert.equal(runtime.currentState, 'running');
  a.finish(); t.mock.timers.tick(200);
  assert.equal(runtime.currentState, 'completed');
  assert.equal(a.interruptions, 0);
  runtime.dispose();
});

test('Tree waits for setup and transition audio, gives identical holds, completes after both sides', t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout', 'setInterval'], now: 100000 });
  const cues = buildAsanaCues(getCatalogEntry('vrksasana')!, 1);
  const transcripts = JSON.parse(readFileSync(new URL('../public/voice/tree-v2-transcripts.json', import.meta.url), 'utf8'));
  for (const cue of cues.filter(c => c.audioKey)) {
    assert.equal(transcripts[cue.audioKey!], cue.speechText);
    const wave = readFileSync(new URL(`../public/voice/${cue.audioKey}.wav`, import.meta.url));
    assert.equal(wave.toString('ascii', 0, 4), 'RIFF');
    assert.equal(wave.toString('ascii', 8, 12), 'WAVE');
  }
  const holds = cues.filter(c => c.type === 'silence');
  assert.deepEqual(holds.map(c => [c.side, c.durationSec]), [['right', 30], ['left', 30]]);
  const a = audio();
  const runtime = new PracticeAudioRuntime(a.engine);
  runtime.start({ practiceId: 'vrksasana', cues, totalDurationSec: 60 });
  for (let i = 0; i < 4; i++) { t.mock.timers.tick(1000); a.finish(); }
  assert.equal(runtime.holdRemainingSeconds, 30);
  t.mock.timers.tick(10000);
  runtime.pause();
  t.mock.timers.tick(15000);
  assert.equal(runtime.holdRemainingSeconds, 20);
  runtime.resume();
  t.mock.timers.tick(20000);
  assert.match(a.spoken.at(-1)!, /反対側/);
  for (let i = 0; i < 4; i++) { t.mock.timers.tick(1000); a.finish(); }
  assert.equal(runtime.holdRemainingSeconds, 30);
  t.mock.timers.tick(29999); assert.equal(runtime.currentState, 'running');
  t.mock.timers.tick(1); a.finish();
  assert.equal(runtime.currentState, 'completed');
  assert.equal(runtime.elapsedSeconds, 68);
  assert.equal(a.interruptions, 0);
  assert.ok(a.spoken.some(s => s.includes('膝に直接')));
  runtime.dispose();
});

test('Account persistence and teacher editing enforce real PostgreSQL RLS', async () => {
  const db = new PGlite();
  const alice = '11111111-1111-4111-8111-111111111111';
  const bob = '22222222-2222-4222-8222-222222222222';
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    INSERT INTO auth.users VALUES ('${alice}'), ('${bob}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA public, auth TO authenticated, anon; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;`);
  for (const file of ['20261007000100_ai_teacher_personas.sql', '20261007000200_teacher_registration_drafts.sql']) {
    await db.exec(readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  }
  const login = (id: string) => db.exec(`RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '${id}', false);`);
  const persona = { name: 'テスト先生', personality: 'gentle', teachingLanguage: 'ja', avatar: '🧘', specialty: 'pranayama', uiLanguage: 'ja', createdAt: '2026-10-07' };
  await login(alice);
  await db.query('INSERT INTO ai_teacher_personas(user_id, persona) VALUES ($1, $2)', [alice, persona]);
  await db.query('INSERT INTO teacher_registration_drafts(user_id, values) VALUES ($1, $2)', [alice, { name: 'テスト講師', description: '編集前' }]);
  await db.exec("RESET ROLE; SET ROLE anon; SELECT set_config('request.jwt.claim.sub', '', false);");
  await assert.rejects(db.query('SELECT * FROM ai_teacher_personas'));
  await login(alice);
  const teacher = await db.query<{ persona: typeof persona }>('SELECT persona FROM ai_teacher_personas');
  assert.deepEqual(teacher.rows[0].persona, persona);
  await db.query("UPDATE teacher_registration_drafts SET values = '{\"name\":\"編集後\"}' WHERE user_id = $1", [alice]);
  assert.equal((await db.query<{ values: { name: string } }>('SELECT values FROM teacher_registration_drafts')).rows[0].values.name, '編集後');
  await login(bob);
  assert.equal((await db.query('SELECT * FROM ai_teacher_personas')).rows.length, 0);
  assert.equal((await db.query('SELECT * FROM teacher_registration_drafts')).rows.length, 0);
  assert.equal((await db.query("UPDATE teacher_registration_drafts SET values = '{}' WHERE user_id = $1 RETURNING *", [alice])).rows.length, 0);
  await assert.rejects(db.query('INSERT INTO teacher_registration_drafts(user_id, values) VALUES ($1, $2)', [alice, {}]));
  await assert.rejects(db.query('INSERT INTO ai_teacher_personas(user_id, persona) VALUES ($1, $2)', [alice, persona]));
  await db.close();
});

test('Professional qualification never matches not acquired or planned', () => {
  for (const status of ['未取得', '取得予定', '', '資格取得に関心']) assert.equal(hasProYogaQualification(status), false, status);
  assert.equal(hasProYogaQualification('プロYoga検定取得'), true);
});
