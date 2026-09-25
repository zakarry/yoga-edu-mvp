import assert from 'node:assert/strict';
import { CameraMirrorController, cameraError, cameraExternalUrl, type CameraState } from '../src/lib/cameraMirror';

let passed = 0;
async function test(name: string, run: () => void | Promise<void>) {
  await run(); ++passed; console.log(`PASS ${name}`);
}
function media() {
  const track = { stops: 0, stop() { this.stops++; }, getSettings: () => ({ facingMode: 'user' }) };
  return { track, stream: { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream };
}
function video(play: () => Promise<void> = async () => {}) {
  return { srcObject: null, muted: false, playsInline: false, autoplay: false, play } as unknown as HTMLVideoElement;
}
function fixture(get: (c: MediaStreamConstraints) => Promise<MediaStream>, secure = true, available = true) {
  const states: CameraState[] = [];
  const calls: MediaStreamConstraints[] = [];
  const controller = new CameraMirrorController(s => states.push(s), () => ({ secure,
    devices: available ? { getUserMedia: (c: MediaStreamConstraints) => { calls.push(c); return get(c); } } as MediaDevices : undefined as unknown as MediaDevices,
  }));
  return { controller, calls, states, last: () => states.at(-1)! };
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }

await test('front preference; getUserMedia called in click stack; muted inline autoplay and srcObject/play', async () => {
  const m = media(); let plays = 0; const v = video(async () => { plays++; });
  const f = fixture(async () => m.stream); f.controller.attach(v);
  const start = f.controller.start(); assert.equal(f.calls.length, 1); await start;
  assert.deepEqual(f.calls[0], { video: { facingMode: { ideal: 'user' } }, audio: false });
  assert.equal(v.srcObject, m.stream); assert.ok(v.muted && v.playsInline && v.autoplay); assert.equal(plays, 1);
  assert.equal(f.last().status, 'playing');
  f.controller.stop(); assert.equal(v.srcObject, null); assert.equal(m.track.stops, 1);
});
for (const name of ['NotAllowedError', 'NotReadableError', 'SecurityError', 'AbortError']) {
  await test(`${name}: original details and actionable guidance; no retry`, async () => {
    const f = fixture(async () => { throw new DOMException(`actual ${name}`, name); });
    await f.controller.start(); assert.equal(f.calls.length, 1);
    assert.equal(f.last().error?.name, name); assert.equal(f.last().error?.message, `actual ${name}`);
    assert.ok(f.last().error?.guidance); assert.equal(f.last().status, 'error');
  });
}
for (const name of ['OverconstrainedError', 'NotFoundError']) {
  await test(`${name}: one unconstrained video fallback`, async () => {
    const m = media(); let count = 0;
    const f = fixture(async () => { if (++count === 1) throw new DOMException('device selection', name); return m.stream; });
    f.controller.attach(video()); await f.controller.start();
    assert.deepEqual(f.calls[1], { video: true, audio: false }); assert.equal(f.last().status, 'playing'); f.controller.stop();
  });
}
await test('no camera fallback failure retains real NotFoundError', async () => {
  const f = fixture(async () => { throw new DOMException('no devices', 'NotFoundError'); });
  await f.controller.start(); assert.equal(f.calls.length, 2); assert.equal(f.last().error?.name, 'NotFoundError');
});
await test('secure context and missing API do not call getUserMedia', async () => {
  for (const [secure, available, expected] of [[false, true, 'SecurityError'], [true, false, 'NotSupportedError']] as const) {
    const f = fixture(async () => media().stream, secure, available); await f.controller.start();
    assert.equal(f.calls.length, 0); assert.equal(f.last().error?.name, expected);
  }
});
await test('switch stops previous camera BEFORE requesting another; close and reopen', async () => {
  const first = media(), second = media(); let count = 0;
  const f = fixture(async () => { if (++count === 1) return first.stream; assert.equal(first.track.stops, 1); return second.stream; });
  f.controller.attach(video()); await f.controller.start(); await f.controller.start('environment');
  assert.deepEqual(f.calls[1].video, { facingMode: { ideal: 'environment' } });
  f.controller.stop(); assert.equal(second.track.stops, 1); assert.equal(f.last().status, 'idle');
  await f.controller.start(); assert.equal(f.last().status, 'playing'); f.controller.stop();
});
await test('close/exit while permission pending releases late stream', async () => {
  const m = media(), d = deferred<MediaStream>(); const f = fixture(() => d.promise);
  const start = f.controller.start(); f.controller.stop(); d.resolve(m.stream); await start;
  assert.equal(m.track.stops, 1); assert.equal(f.last().status, 'idle');
});
await test('guide swaps to practice before permission resolves: attach to latest video', async () => {
  const m = media(), d = deferred<MediaStream>(); const f = fixture(() => d.promise);
  const guide = video(), practice = video(); f.controller.attach(guide);
  const start = f.controller.start(); f.controller.attach(null); f.controller.attach(practice);
  d.resolve(m.stream); await start; assert.equal(guide.srcObject, null); assert.equal(practice.srcObject, m.stream);
  f.controller.stop();
});
await test('permission resolves before React mounts video: later ref plays stream', async () => {
  const m = media(); const f = fixture(async () => m.stream); await f.controller.start();
  const v = video(); f.controller.attach(v); await Promise.resolve();
  assert.equal(v.srcObject, m.stream); assert.equal(f.last().status, 'playing'); f.controller.stop();
});
await test('play rejection is visible and manually retryable', async () => {
  const m = media(); let attempts = 0; const f = fixture(async () => m.stream);
  f.controller.attach(video(async () => { if (++attempts === 1) throw new DOMException('play blocked', 'NotAllowedError'); }));
  await f.controller.start(); assert.equal(f.last().error?.stage, 'play'); assert.equal(f.last().error?.message, 'play blocked');
  await f.controller.play(); assert.equal(f.last().status, 'playing'); assert.equal(f.last().error, undefined); f.controller.stop();
});
await test('rapid start requests release stale stream instead of overwriting current', async () => {
  const old = media(), current = media(), d = deferred<MediaStream>(); let count = 0;
  const f = fixture(() => ++count === 1 ? d.promise : Promise.resolve(current.stream)); f.controller.attach(video());
  const oldStart = f.controller.start(); await f.controller.start('environment'); d.resolve(old.stream); await oldStart;
  assert.equal(old.track.stops, 1); assert.equal(current.track.stops, 0); f.controller.stop(); assert.equal(current.track.stops, 1);
});
await test('LINE fallback preserves only intended entry, never auth query/hash', () => {
  assert.equal(cameraExternalUrl('https://yogai.net/?entry=event-demo&code=secret#access_token=secret'), 'https://yogai.net/?entry=event-demo&openExternalBrowser=1');
  assert.equal(cameraExternalUrl('https://yogai.net/?entry=karte'), 'https://yogai.net/?entry=teacher&openExternalBrowser=1');
  assert.notEqual(cameraError(new DOMException('x', 'NotFoundError'), 'access').guidance, cameraError(new DOMException('x', 'NotReadableError'), 'access').guidance);
});
console.log(`${passed} camera controller tests passed (simulated devices; not Android/LINE hardware verification).`);
