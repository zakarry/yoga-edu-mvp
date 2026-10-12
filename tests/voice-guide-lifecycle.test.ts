import test from 'node:test';
import assert from 'node:assert/strict';
import { getVoiceGuideEngine } from '../src/lib/voiceGuide';

const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
test('real shared engine cancels stale resume/decode/ended, defers paused loads and never duplicates sources', async t => {
  const sources: { onended: (() => void) | null; stopped: boolean; start(): void; stop(): void }[] = [];
  const wakeup = { resolve: null as (() => void) | null };
  const decodes: (() => void)[] = [];
  let active = 0, maximum = 0, completions = 0;
  class Context {
    state = 'suspended'; destination = {};
    resume() { return new Promise<void>(resolve => { wakeup.resolve = () => { this.state = 'running'; resolve(); }; }); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    decodeAudioData() { return new Promise(resolve => decodes.push(() => resolve({ duration: 20 }))); }
    createBufferSource() {
      const source = { buffer: null, playbackRate: { value: 1 }, onended: null as (() => void) | null, stopped: false,
        connect() {}, start() { active++; maximum = Math.max(maximum, active); },
        stop() { if (!this.stopped) { active--; this.stopped = true; this.onended?.(); } } };
      sources.push(source); return source;
    }
  }
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) }) as Response);
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { AudioContext: Context } });
  t.after(() => { if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow); else Reflect.deleteProperty(globalThis, 'window'); });
  const engine = getVoiceGuideEngine();
  engine.setOnCueEnd(() => completions++);

  // A context wakeup must not resurrect a stopped request.
  engine.speakByKey('q05-cancel-resume'); engine.stop(); wakeup.resolve?.(); await flush();
  assert.equal(sources.length, 0); assert.equal(decodes.length, 0);

  // A stale decode must not replace the newer queued guide.
  engine.speakByKey('q05-old-decode'); await flush(); engine.speakByKey('q05-new-decode'); await flush();
  decodes.shift()?.(); await flush(); assert.equal(sources.length, 0);
  decodes.shift()?.(); await flush(); assert.equal(sources.length, 1); assert.equal(active, 1);
  const staleEnded = sources[0].onended;
  engine.speakByKey('q05-new-decode'); assert.equal(active, 1); staleEnded?.(); assert.equal(completions, 0);
  const ended = sources.at(-1)!.onended; sources.at(-1)!.stop(); ended?.();
  assert.equal(completions, 1); // Duplicate native ended cannot finish the next guide.
  engine.stop(); assert.equal(active, 0);

  // Loading during pause stays queued until resume; repeated resume starts once.
  engine.speakByKey('q05-paused-decode'); await flush(); engine.pause(); decodes.shift()?.(); await flush();
  const count = sources.length; assert.equal(active, 0); assert.equal(engine.isPlaying(), true);
  engine.resume(); engine.resume(); wakeup.resolve?.(); await flush(); assert.equal(sources.length, count + 1); assert.equal(active, 1);
  engine.pause(); engine.resume(); engine.resume(); wakeup.resolve?.(); await flush(); assert.equal(sources.length, count + 1);
  engine.stop(); assert.equal(active, 0); assert.equal(maximum, 1); assert.equal(engine.isPlaying(), false);

  // Pause during a pending context wakeup cannot start audio in the background.
  engine.pause(); engine.resume(); engine.speakByKey('q05-stop-wakeup'); engine.pause(); wakeup.resolve?.(); await flush();
  assert.equal(active, 0); engine.stop();
});
