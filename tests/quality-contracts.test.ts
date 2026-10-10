import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { PracticeAudioRuntime, type RuntimeEvent } from '../src/lib/practiceAudioRuntime';
import type { VoiceGuideEngine } from '../src/lib/voiceGuide';
import { getEventDemoPoses } from '../src/lib/poseLibrary';
import { getCatalogEntry, POSE_CATALOG } from '../src/lib/poseCatalog';
import { BREATHWORK_CATALOG, getBreathworkEntry } from '../src/lib/breathworkCatalog';
import { MEDITATION_CATALOG } from '../src/lib/meditationCatalog';
import { buildBreathworkCues } from '../src/lib/breathworkCueBuilder';
import { buildPhasesFromPattern } from '../src/components/BreathworkVisual';
import { buildAsanaClockTimeline } from '../src/lib/asanaClockTimeline';
import { hasProYogaQualification } from '../src/lib/proYogaQualification';

// Controlled transport only: all cue ordering/state/timing decisions come from production runtime.
function transport() {
  let ended: (() => void) | null = null;
  let playing = false;
  const spoken: string[] = [];
  const engine: VoiceGuideEngine = {
    type: 'audio-file', available: true,
    speak(text) { assert.equal(playing, false, 'audio must not overlap'); playing = true; spoken.push(text); },
    speakByKey(_key, text) { this.speak(text ?? ''); },
    stop() { playing = false; }, pause() {}, resume() {}, unlock() {},
    getAudioDuration() { return null; }, isPlaying() { return playing; },
    setOnCueEnd(cb) { ended = cb; },
    getStatus() { return {status: playing ? 'playing' : 'stopped', voiceName: null, error: null}; },
  };
  return {engine, spoken, captureEnd: () => ended, finish() {playing = false; ended?.();}};
}

test('AUD-02: subtitles stay on current narration; final audio must end before completion', t => {
  t.mock.timers.enable({apis: ['Date', 'setTimeout', 'setInterval'], now: 100000});
  const a = transport(); const events: RuntimeEvent[] = [];
  const runtime = new PracticeAudioRuntime(a.engine);
  runtime.start({practiceId: 'regression', totalDurationSec: 2, onEvent: e => events.push(e), cues: [
    {id: 'first', type: 'voice', displayText: '表示A', speechText: '読みA'},
    {id: 'second', type: 'voice', displayText: '表示B', speechText: '読みB'},
    {id: 'done', type: 'complete'},
  ]});
  t.mock.timers.tick(20000);
  assert.deepEqual(events.filter(e => e.type === 'subtitle').map(e => e.subtitle), ['表示A']);
  assert.equal(events.filter(e => e.type === 'complete').length, 0);
  a.finish();
  assert.deepEqual(a.spoken, ['読みA', '読みB']);
  assert.deepEqual(events.filter(e => e.type === 'subtitle').map(e => e.subtitle), ['表示A', '表示B']);
  t.mock.timers.tick(20000);
  assert.equal(runtime.currentState, 'running');
  a.finish(); assert.equal(events.filter(e => e.type === 'complete').length, 1);
  runtime.dispose();
});

test('AUD-02: stop/dispose releases callbacks; late ended cannot start next cue or complete', t => {
  t.mock.timers.enable({apis: ['Date', 'setTimeout', 'setInterval'], now: 100000});
  for (const action of ['stop', 'dispose'] as const) {
    const a = transport(); const events: RuntimeEvent[] = [];
    const runtime = new PracticeAudioRuntime(a.engine);
    runtime.start({practiceId: 'cancelled', onEvent: e => events.push(e), cues: [
      {id: 'intro', type: 'voice', speechText: '案内'},
      {id: 'next', type: 'voice', speechText: '次'}, {id: 'done', type: 'complete'},
    ]});
    const lateEnded = a.captureEnd(); runtime[action]();
    assert.equal(a.captureEnd(), null);
    lateEnded?.(); t.mock.timers.tick(60000);
    assert.equal(runtime.currentState, 'idle');
    assert.deepEqual(a.spoken, ['案内']);
    assert.equal(events.filter(e => e.type === 'complete').length, 0);
  }
});

test('DEMO-01: current event programme has three ordered one-minute guides and available images', () => {
  const poses = getEventDemoPoses();
  assert.deepEqual(poses.map(p => [p.id, p.defaultMinutes]), [['tadasana', 1], ['catcow', 1], ['balasana', 1]]);
  for (const p of poses) {
    assert.ok(p.name.length > 0);
    // Paths are public assets; never request authenticated URLs in this suite.
    const entry = getCatalogEntry(p.id)!;
    assert.ok(entry);
    const paths = [p.image, ...(p.stages ?? []).map(stage => stage.image)];
    assert.ok(paths.every(path => path.startsWith('/')), p.id + ': local guide images required');
    for (const path of paths) assert.ok(existsSync('public' + path), path);
  }
});

test('DEMO-01: Cat inhale/Cow and exhale/Cat stay paired in actual clock timeline', () => {
  const timeline = buildAsanaClockTimeline(getCatalogEntry('catcow')!, 1);
  assert.ok(timeline.some(c => c.visualStage === 'cow' && /吸/.test(c.text)));
  assert.ok(timeline.some(c => c.visualStage === 'cat' && /吐/.test(c.text)));
  assert.equal(timeline.at(-1)?.atMs, 60000);
});

test('BREATH-01: Box four phases/rounds and builder phase durations agree', () => {
  const box = getBreathworkEntry('box-breathing')!;
  const phases = buildPhasesFromPattern(box.pattern!);
  assert.deepEqual(phases.map(p => [p.key, p.seconds]), [['inhale',4],['hold-in',4],['exhale',4],['hold-out',4]]);
  const cues = buildBreathworkCues(box);
  assert.deepEqual(cues.filter(c => c.phaseDurationSec !== undefined).map(c => c.phaseDurationSec), Array(box.pattern!.rounds * 4).fill(4));
  assert.equal(cues.at(-1)?.type, 'complete');
});

test('BREATH-01: abdominal inhale/exhale guidance survives wording changes with audio assets present', () => {
  const cues = buildBreathworkCues(getBreathworkEntry('abdominal-breathing')!);
  assert.ok(cues.some(c => /鼻.*吸/.test(c.displayText ?? '')));
  assert.ok(cues.some(c => /吐.*お腹.*戻/.test(c.displayText ?? '')));
  assert.ok(cues.some(c => /吐.*力を抜/.test(c.displayText ?? '')));
  for (const c of cues.filter(c => c.audioKey)) {
    assert.ok(['mp3','wav'].some(ext => existsSync(`public/voice/${c.audioKey}.${ext}`)), c.audioKey);
  }
  assert.equal(cues.at(-1)?.type, 'complete');
});

test('PRO-02: only established completed qualifications get a badge', () => {
  for (const s of ['プロYoga検定取得', 'Professional Yoga取得', '取得済み', '  取得済み  ']) assert.equal(hasProYogaQualification(s), true, s);
  for (const s of ['', '未取得', '取得予定', '受講中', 'Professional Yoga', '未取得（取得済みではない）']) assert.equal(hasProYogaQualification(s), false, s);
});

test('CORE audit: IDs unique within source catalogues; report content counts without claiming DB inventory', () => {
  for (const [name, entries] of [['ASANA', POSE_CATALOG], ['BREATH', BREATHWORK_CATALOG], ['MEDITATION', MEDITATION_CATALOG]] as const) {
    assert.equal(new Set(entries.map(e => e.id)).size, entries.length, name);
    console.log(`${name}: ${entries.length} definitions; ${entries.filter(e => e.status === 'active').length} active; ${entries.filter(e => e.knowledge.verified).length} marked Knowledge-verified (not DB verification)`);
  }
});
