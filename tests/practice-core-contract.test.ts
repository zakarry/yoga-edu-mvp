import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import before from './fixtures/practice-core-before-05666f4.json';
import { collectPracticeOutputs, collectPracticeInventory } from '../scripts/audit-practice-core';
import { defineAbdominalPractice, validatePracticeDefinitions, type PracticeDefinition } from '../src/lib/practiceDefinition';
import { getBreathworkEntry } from '../src/lib/breathworkCatalog';
import { buildBreathworkCues } from '../src/lib/breathworkCueBuilder';
import { PracticeAudioRuntime, type PracticeCue, type RuntimeEvent } from '../src/lib/practiceAudioRuntime';
import type { VoiceGuideEngine } from '../src/lib/voiceGuide';

const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const definition = () => {
  const entry = getBreathworkEntry('abdominal-breathing')!;
  return defineAbdominalPractice(entry, buildBreathworkCues(entry));
};

test('all 24 effective catalog outputs equal the pre-change main baseline, including UI, cues, visuals, safety and Knowledge', () => {
  const outputs = collectPracticeOutputs();
  assert.deepEqual(outputs.map(row => ({ practiceId: row.entry.id, sha256: hash(JSON.stringify(row)) })), before.outputs);
  assert.deepEqual(JSON.parse(JSON.stringify(outputs.find(r => r.entry.id === 'abdominal-breathing'))), before.abdominal);
  assert.deepEqual(collectPracticeInventory().summary, { asana: { total: 12, active: 11 }, breath: { total: 7, active: 6 }, meditation: { total: 5, active: 5 } });
});

test('25 protected runtime/UI/reading/Safety/Session sources and 211 inventoried assets remain byte-equivalent', () => {
  for (const [path, expected] of Object.entries(before.protectedSourceHashes)) assert.equal(hash(readFileSync(path, 'utf8').replace(/\r\n/g, '\n')), expected, path);
  for (const [path, expected] of Object.entries(before.assetHashes)) assert.equal(hash(readFileSync(`public${path}`)), expected, path);
  const inventory = collectPracticeInventory();
  assert.deepEqual(inventory.missingAssets, []);
  assert.deepEqual(inventory.sequences.map(s => ({ practiceId: s.practiceId, sha256: s.outputSha256 })), before.sequenceOutputs);
  assert.deepEqual(inventory.eventDemoIds, ['tadasana', 'catcow', 'balasana']);
  assert.equal(inventory.rows.find(r => r.practiceId === 'susokukan-5min')?.runtime, 'SusokukanSession');
});

test('pilot read contract preserves catalog and cue identity and does not promote unknown evidence', () => {
  const entry = getBreathworkEntry('abdominal-breathing')!, cues = buildBreathworkCues(entry);
  const d = defineAbdominalPractice(entry, cues);
  assert.equal(d.content, entry); assert.equal(d.guide.cues, cues);
  assert.equal(d.knowledge.catalogReference, entry.knowledge);
  assert.deepEqual(validatePracticeDefinitions([d]), []);
  assert.equal(d.timing.mode, 'narration_then_silence');
  assert.equal(d.knowledge.sourceVerification, 'unconfirmed');
  assert.equal(d.review.pronunciation, 'unconfirmed');
  assert.equal(d.review.fullAudioCaptionSync, 'unconfirmed');
});

test('registration checks reject missing/duplicate cues, ambiguous reading, changed holds and unequal sides', () => {
  const d = definition();
  assert.ok(validatePracticeDefinitions([d, d]).some(i => i.code === 'identity'));
  const broken = (change: (copy: PracticeDefinition) => void, code: string) => {
    const copy = structuredClone(d); change(copy);
    assert.ok(validatePracticeDefinitions([copy]).some(i => i.code === code), code);
  };
  broken(c => { c.guide.cues[1].id = c.guide.cues[0].id; }, 'cue-id');
  broken(c => { c.guide.cues[0].speechText = '鼻から吐きます。'; }, 'pronunciation');
  broken(c => { c.guide.cues[0].speechText = ''; }, 'narration');
  broken(c => { c.guide.cues.find(q => q.type === 'silence')!.durationSec = 3; }, 'hold-order');
  broken(c => { if (c.timing.mode === 'narration_then_silence') c.timing.pattern.rounds = NaN; }, 'pattern');
  broken(c => { c.guide.cues.pop(); }, 'completion');
  broken(c => { c.timing = { mode: 'narration_then_hold', holds: [{ side: 'right', seconds: 30 }, { side: 'left', seconds: 29 }], narrationConsumesHold: false }; }, 'bilateral');
  broken(c => { c.practiceId = 'susokukan-5min'; c.kind = 'meditation'; }, 'susokukan-clock');
});

test('before/after real runtime traces match under delayed audio, pause, holds, terminal drain and stop', t => {
  // Only transport/time are controlled; both sequences run through the real production runtime.
  t.mock.timers.enable({ apis: ['Date', 'setTimeout', 'setInterval'], now: 100000 });
  const run = (cues: PracticeCue[], stopEarly = false) => {
    const start = Date.now(), events: { at: number; event: RuntimeEvent }[] = [], spoken: string[] = [], holds: number[] = [];
    const playback = { ended: null as (() => void) | null };
    let playing = false;
    const engine: VoiceGuideEngine = {
      type: 'audio-file', available: true,
      speak(text) { assert.equal(playing, false, 'narration must not overlap'); playing = true; spoken.push(text); },
      speakByKey(_key, text) { this.speak(text ?? ''); },
      stop() { playing = false; }, pause() {}, resume() {}, unlock() {},
      setOnCueEnd(cb) { playback.ended = cb; }, getAudioDuration() { return null; }, isPlaying() { return playing; },
      getStatus() { return { status: playing ? 'playing' : 'stopped', voiceName: null, error: null }; },
    };
    const runtime = new PracticeAudioRuntime(engine);
    runtime.start({ practiceId: 'abdominal-breathing', cues, onEvent: event => events.push({ at: Date.now() - start, event }) });
    if (stopEarly) {
      const stale = playback.ended; runtime.stop(); const length = events.length;
      t.mock.timers.tick(30000); stale?.();
      assert.equal(events.length, length); assert.equal(runtime.currentState, 'idle');
    } else for (const [index, cue] of cues.entries()) {
      assert.equal(runtime.currentCueIndex, index);
      if (cue.type === 'voice') {
        t.mock.timers.tick(7000 + index * 11);
        assert.equal(runtime.currentCueIndex, index, 'audio must finish before advancing');
        assert.equal(events.filter(e => e.event.type === 'subtitle').at(-1)?.event.subtitle, cue.displayText);
        playing = false; playback.ended?.();
        if (cue.isFinalCue) { assert.equal(runtime.currentState, 'running'); t.mock.timers.tick(400); }
      } else if (cue.type === 'silence') {
        holds.push(runtime.holdRemainingSeconds);
        runtime.pause(); t.mock.timers.tick(11000); assert.equal(runtime.holdRemainingSeconds, cue.durationSec);
        runtime.resume(); t.mock.timers.tick(cue.durationSec! * 1000 - 1); assert.equal(runtime.currentCueIndex, index);
        t.mock.timers.tick(1);
      }
    }
    if (!stopEarly) assert.equal(events.filter(e => e.event.type === 'complete').length, 1);
    runtime.dispose(); return { events, spoken, holds };
  };
  const baseline = before.abdominal!.guide as PracticeCue[], current = definition().guide.cues;
  assert.deepEqual(run(current), run(baseline));
  assert.deepEqual(run(current, true), run(baseline, true));
});
