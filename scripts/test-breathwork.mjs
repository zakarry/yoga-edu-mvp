import { build } from 'esbuild';
import { mkdtemp, rm, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const dir = await mkdtemp(join(tmpdir(), 'yoga-breathwork-'));
const require = createRequire(import.meta.url);
try {
  for (const name of ['breathworkSequence', 'breathworkCatalog', 'voiceGuide']) {
    await build({ entryPoints: [`src/lib/${name}.ts`], bundle: true, platform: 'node', format: 'cjs', outfile: join(dir, name + '.cjs') });
  }
  const sequence = require(join(dir, 'breathworkSequence.cjs'));
  const { getBreathworkEntry } = require(join(dir, 'breathworkCatalog.cjs'));
  await build({ entryPoints: ['src/components/BreathworkVisual.tsx'], jsx: 'automatic', bundle: true, platform: 'node', format: 'cjs', outfile: join(dir, 'visual.cjs') });
  const { BreathworkVisual } = require(join(dir, 'visual.cjs'));
  const visual = (id, phase, remainingSeconds, activeLayer) => renderToStaticMarkup(createElement(BreathworkVisual, {
    breathwork: getBreathworkEntry(id), phase, remainingSeconds, activeLayer, isRunning: true, isCompleted: false,
  }));
  for (const [id, region] of [['abdominal-breathing', 'belly'], ['thoracic-breathing', 'chest']]) {
    const inhaled = visual(id, 'inhale', 0);
    const exhaled = visual(id, 'exhale', 0);
    assert.ok(inhaled.includes('bw-body-' + region));
    assert.ok(inhaled.includes('<svg'));
    assert.ok(inhaled.includes('scale(1.08)'));
    assert.ok(exhaled.includes('scale(0.85)'));
  }
  assert.ok(visual('box-breathing', 'hold-in', 2).includes('scale(1)'));
  assert.ok(visual('box-breathing', 'hold-out', 2).includes('scale(0.85)'));
  for (const [index, layer] of ['belly', 'chest', 'clavicle'].entries()) {
    assert.ok(visual('complete-yoga-breathing', 'inhale', 3, index).includes('bw-layer-' + layer + ' is-active'));
  }
  console.log('PASS: body expansion/contraction, Box hold sizes, all three complete-breathing layers.');
  const allKeys = new Set();
  for (const id of ['abdominal-breathing', 'thoracic-breathing']) {
    const entry = getBreathworkEntry(id);
    for (let round = 0; round < entry.pattern.rounds; round++) {
      const cues = ['inhale', 'exhale'].flatMap(p => sequence.getBreathworkPhaseSequence(entry, p, round));
      assert.deepEqual(cues.map(c => c.text), [
        '鼻からゆっくり吸います。',
        id === 'abdominal-breathing' ? 'お腹の広がりを感じましょう。' : '胸の広がりを感じましょう。',
        '鼻からゆっくり吐きます。', '肩の力を抜きましょう。',
      ]);
      cues.forEach(c => allKeys.add(c.audioKey));
    }
  }
  const box = getBreathworkEntry('box-breathing');
  assert.deepEqual(sequence.getBreathworkIntro(box), box.voiceGuide.intro);
  box.voiceGuide.intro.forEach(c => allKeys.add(c.audioKey));
  for (let round = 0; round < 4; round++) {
    for (const phase of ['inhale', 'hold-in', 'exhale', 'hold-out']) {
      const cues = sequence.getBreathworkPhaseSequence(box, phase, round);
      assert.equal(cues.length, 1);
      if (phase === 'exhale') assert.equal(cues[0].text, '鼻からゆっくり吐きます。');
      cues.forEach(c => allKeys.add(c.audioKey));
    }
  }
  assert.ok(getBreathworkEntry('complete-yoga-breathing'));
  assert.equal(sequence.usesBreathworkSequence('complete-yoga-breathing'), false);
  for (const key of [...allKeys, 'voice-box-final', 'voice-abdominal-end-2']) {
    assert.ok(key);
    await access(`public/voice/${key}.mp3`);
  }
  // MPEG Layer III frames provide a conservative duration (including padding).
  async function mp3Seconds(key) {
    const data = await readFile(`public/voice/${key}.mp3`);
    let seconds = 0;
    for (let offset = 0; offset + 4 < data.length;) {
      const h = data.readUInt32BE(offset);
      const version = (h >>> 19) & 3, layer = (h >>> 17) & 3;
      const rateIndex = (h >>> 12) & 15, sampleIndex = (h >>> 10) & 3;
      if ((h >>> 21) !== 2047 || version === 1 || layer !== 1 || !rateIndex || rateIndex === 15 || sampleIndex === 3) { offset++; continue; }
      const rates = version === 3 ? [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320] : [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160];
      const sampleRate = [44100,48000,32000][sampleIndex] / (version === 3 ? 1 : version === 2 ? 2 : 4);
      const length = Math.floor((version === 3 ? 144000 : 72000) * rates[rateIndex] / sampleRate) + ((h >>> 9) & 1);
      if (offset + length > data.length) break;
      seconds += (version === 3 ? 1152 : 576) / sampleRate;
      offset += length;
    }
    assert.ok(seconds > 0, key + ' has MPEG frames');
    return seconds;
  }
  for (const key of ['voice-box-inhale', 'voice-box-hold', 'voice-box-exhale', 'voice-box-hold2', 'voice-inhale', 'voice-hold']) {
    const seconds = await mp3Seconds(key);
    assert.ok(seconds < 4, key + ' must fit its four-second phase');
    console.log(key + ': ' + seconds.toFixed(2) + 's');
  }

  const sources = [];
  let resumed = 0;
  class MockContext {
    state = 'suspended';
    destination = {};
    async resume() { resumed++; this.state = 'running'; }
    async decodeAudioData() { return { duration: 0.05 }; }
    createBufferSource() {
      const source = { stopped: false, connect() {}, disconnect() {}, start() { source.started = true; }, stop() { source.stopped = true; } };
      sources.push(source);
      return source;
    }
  }
  globalThis.window = { AudioContext: MockContext };
  globalThis.fetch = async url => ({ ok: !url.includes('missing'), arrayBuffer: async () => new ArrayBuffer(1) });
  const audio = require(join(dir, 'voiceGuide.cjs'));
  const controller = new AbortController();
  let subtitleCount = 0;
  let finished = false;
  const first = audio.playBreathworkAudio({ text: 'first', audioKey: 'first' }, controller.signal, () => subtitleCount++).then(ok => { finished = true; return ok; });
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(finished, false, 'must await actual audio end');
  assert.equal(resumed, 1);
  assert.equal(sources.length, 1);
  assert.equal(sources[0].stopped, false, 'playing cue must not be stopped early');
  sources[0].onended();
  assert.equal(await first, true);
  assert.equal(await audio.playBreathworkAudio({ text: 'missing', audioKey: 'missing' }, controller.signal, () => subtitleCount++), false);
  const next = audio.playBreathworkAudio({ text: 'next', audioKey: 'next' }, controller.signal, () => subtitleCount++);
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(sources.length, 2, 'failed MP3 must not disable later audio');
  controller.abort();
  assert.equal(await next, false);
  assert.equal(sources[1].stopped, true, 'leaving stops owned audio');
  assert.equal(subtitleCount, 3);
  const stale = new AbortController();
  stale.abort();
  assert.equal(await audio.playBreathworkAudio({ text: 'stale', audioKey: 'stale' }, stale.signal, () => assert.fail('stale subtitle')), false);
  assert.equal(sources.length, 2, 'aborted run must not start another source');
  const waitAbort = new AbortController();
  const waiting = sequence.waitForBreathwork(10000, waitAbort.signal);
  waitAbort.abort();
  await waiting;
  console.log('PASS: all-round cue order, Box cues/assets, audio-end gating, resume, MP3 failure recovery, abort and stale-run protection.');
} finally {
  await rm(dir, { recursive: true, force: true });
}
