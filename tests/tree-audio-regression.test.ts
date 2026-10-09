import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { PracticeAudioRuntime } from '../src/lib/practiceAudioRuntime';
import { buildAsanaCues } from '../src/lib/asanaCueBuilder';
import { getCatalogEntry } from '../src/lib/poseCatalog';

import type { VoiceGuideEngine } from '../src/lib/voiceGuide';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TreeHoldTimer } from '../src/components/TreeHoldTimer';
import pronunciation from '../src/lib/voicePronunciation.json';

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
    assert.equal(cue.audioKey === pronunciation.treeStability.audioKey ? pronunciation.treeStability.speechText : transcripts[cue.audioKey!], cue.speechText);
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

test('吐きます uses the explicit はきます reading in recorded and fallback speech', () => {
  const cues = buildAsanaCues(getCatalogEntry('vrksasana')!, 1);
  const breathing = cues.filter(cue => cue.displayText?.includes('吸って吐きます'));
  assert.equal(breathing.length, 2);
  for (const cue of breathing) {
    assert.match(cue.speechText!, /吸ってはきます。$/);
    assert.doesNotMatch(cue.speechText!, /吐きます|つきます/);
    assert.equal(cue.audioKey, 'voice-tree-v2-stability-hakimasu-v3');
  }
});

test('Tree timer stays numeric during instructions and counts down during each hold', () => {
  for (const remaining of [0, 30, 29, 1, 0]) {
    const html = renderToStaticMarkup(React.createElement(TreeHoldTimer, { remaining, holdSeconds: 30 }));
    assert.match(html, new RegExp('<span>0:' + String(remaining || 30).padStart(2, '0') + '</span>'));
    assert.ok(html.includes(remaining ? '保持中' : '案内中'));
    assert.ok(!html.includes('準備・切替の案内'));
  }
});
