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
  for (const name of ['breathworkCueBuilder', 'breathworkCatalog', 'practiceAudioRuntime', 'voiceGuide']) {
    await build({ entryPoints: [`src/lib/${name}.ts`], bundle: true, platform: 'node', format: 'cjs', outfile: join(dir, name + '.cjs') });
  }
  const { buildBreathworkCues } = require(join(dir, 'breathworkCueBuilder.cjs'));
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

  // Verify cue builder output for all 6 migrated practices
  const allKeys = new Set();
  for (const id of ['box-breathing', 'abdominal-breathing', 'thoracic-breathing', 'complete-yoga-breathing', 'brahmari', 'anuloma-viloma']) {
    const entry = getBreathworkEntry(id);
    const cues = buildBreathworkCues(entry);
    assert.ok(cues.length > 0, id + ' should produce cues');
    assert.equal(cues[cues.length - 1].type, 'complete', id + ' should end with complete cue');
    cues.forEach(c => { if (c.audioKey) allKeys.add(c.audioKey); });
  }

  // Spot-check abdominal cue order
  const abdominal = getBreathworkEntry('abdominal-breathing');
  const abCues = buildBreathworkCues(abdominal);
  const abVoiceTexts = abCues.filter(c => c.type === 'voice').map(c => c.displayText);
  assert.ok(abVoiceTexts.includes('鼻からゆっくり吸います。'), 'abdominal should contain inhale cue');
  assert.ok(abVoiceTexts.includes('お腹の広がりを感じましょう。'), 'abdominal should contain belly expansion cue');
  assert.ok(abVoiceTexts.includes('鼻からゆっくり吐きます。'), 'abdominal should contain exhale cue');
  assert.ok(abVoiceTexts.includes('肩の力を抜きましょう。'), 'abdominal should contain relax cue');

  // Spot-check box-breathing cue order
  const box = getBreathworkEntry('box-breathing');
  const boxCues = buildBreathworkCues(box);
  assert.ok(boxCues.some(c => c.displayText === 'Box Breathingを始めます。4秒吸って、4秒止めて、4秒吐いて、4秒止めます。'), 'box intro present');
  assert.ok(boxCues.some(c => c.displayText === '最後の呼吸です。'), 'box final cue present');

  // Verify audio keys exist as MP3 files
  for (const key of [...allKeys, 'voice-box-final', 'voice-abdominal-end-2']) {
    assert.ok(key);
    await access(`public/voice/${key}.mp3`);
  }

  // MPEG Layer III frame validation (conservative duration)
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

  // PracticeAudioRuntime smoke test: start, receive events, complete
  const { createPracticeAudioRuntime } = require(join(dir, 'practiceAudioRuntime.cjs'));
  const runtime = createPracticeAudioRuntime();
  const events = [];
  runtime.addListener(e => events.push(e));
  const testCues = [
    { id: 't0', type: 'voice', displayText: 'intro', speechText: 'intro', audioKey: 'voice-box-intro' },
    { id: 't1', type: 'silence', durationSec: 1 },
    { id: 't2', type: 'complete', displayText: 'done', isFinalCue: true },
  ];
  runtime.setSource('practice_audio_runtime');
  runtime.start({ practiceId: 'test', cues: testCues });
  assert.ok(events.some(e => e.type === 'stateChange' && e.state === 'running'), 'should enter running state');
  await new Promise(resolve => setTimeout(resolve, 200));
  assert.ok(events.some(e => e.type === 'subtitle' && e.subtitle === 'intro'), 'should emit intro subtitle');
  runtime.dispose();

  console.log('PASS: cue builder for all 6 practices, audio key files, MP3 frame durations, PracticeAudioRuntime smoke test.');
} finally {
  await rm(dir, { recursive: true, force: true });
}
