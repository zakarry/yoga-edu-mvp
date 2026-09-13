import { build } from 'esbuild';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const dir = await mkdtemp(join(tmpdir(), 'yoga-susokukan-'));
const require = createRequire(import.meta.url);
try {
  await build({ entryPoints: ['src/lib/susokukanSession.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: join(dir, 'session.cjs') });
  const { SusokukanSession, susokukanSubtitle } = require(join(dir, 'session.cjs'));
  const captions = JSON.parse(await readFile('src/lib/susokukanNarration.json', 'utf8'));
  const text = captions.map(c => c.text).join('');
  for (const required of ['吸って吐いて、みっつー。', 'とう（十）まで行ったら、また一に戻ります。', '雑念がうまれたら、一から数え直します。', 'それでは、ここから静寂に入ります']) assert.ok(text.includes(required), required);
  assert.equal(captions.length, 11);
  assert.equal(captions[5].spokenText, 'すって、はいて、ひとぉーつ、');
  assert.equal(captions.at(-1).spokenText, 'それでは、ここからせいじゃくにはいります');
  assert.ok(captions.every(c => !c.spokenText.includes('静寂に入ります')));
  assert.ok(captions.every((c, i) => c.atSec < 60 && (i === 0 || c.atSec > captions[i - 1].atSec)));
  const wav = await readFile('public/voice/susokukan-intro-full-v2.wav');
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  let rate, dataBytes;
  for (let pos = 12; pos + 8 <= wav.length;) {
    const size = wav.readUInt32LE(pos + 4);
    const tag = wav.toString('ascii', pos, pos + 4);
    if (tag === 'fmt ') rate = wav.readUInt32LE(pos + 16);
    if (tag === 'data') dataBytes = size;
    pos += 8 + size + (size % 2);
  }
  assert.equal(dataBytes / rate, 60, 'Narration file is exactly 60 seconds');
  assert.match(susokukanSubtitle(59), /静寂に入ります/);
  assert.match(susokukanSubtitle(60), /^静寂/);
  let now = 0, state, frameId = 0;
  const frames = new Map();
  globalThis.requestAnimationFrame = fn => { frames.set(++frameId, fn); return frameId; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  const tick = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn()); };
  const audios = [];
  const createAudio = () => {
    const audio = { currentTime: 0, paused: true, playCount: 0,
      play() { this.paused = false; this.playCount++; this.onplaying?.(); return Promise.resolve(); },
      pause() { this.paused = true; }, removeAttribute() {}, load() {},
    };
    audios.push(audio);
    return audio;
  };
  const player = new SusokukanSession(value => { state = value; }, createAudio, () => now);
  player.start();
  const audio = audios[0];
  audio.currentTime = 44; now = 90000; tick();
  assert.equal(state.elapsed, 44, 'Buffering/wall clock cannot skip narration');
  assert.equal(audio.playCount, 1, 'No scheduled cues interrupt the single recording');
  player.pause(); now += 30000; tick();
  assert.equal(state.elapsed, 44);
  assert.ok(audio.paused);
  player.resume(); audio.currentTime = 59; tick();
  assert.equal(state.elapsed, 59);
  audio.currentTime = 60; audio.onended(); tick();
  assert.equal(state.elapsed, 60);
  now += 100000; tick(); player.pause();
  assert.equal(state.elapsed, 160);
  now += 60000; tick();
  assert.equal(state.elapsed, 160, 'Pausing also freezes silence');
  player.resume(); now += 139000; tick();
  assert.equal(state.elapsed, 299);
  now += 1000; tick();
  assert.equal(state.status, 'completed');
  assert.equal(state.elapsed, 300);
  assert.equal(frames.size, 0);
  player.start(); const oldEnded = audios[1].onended;
  player.stop(); oldEnded(); tick();
  assert.equal(state.status, 'idle', 'Late old audio completion cannot restart silence');
  player.start(); audios[2].onerror();
  assert.equal(state.status, 'error', 'Missing audio is not reported as successful silence');
  assert.equal(frames.size, 0);
  player.dispose();
  console.log('PASS: complete script, 60-second audio, media-synced captions, pause/resume, 240-second silence, stop/restart, audio error');
} finally { await rm(dir, { recursive: true, force: true }); }
