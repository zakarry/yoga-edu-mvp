import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { jawRelease } from '../../src/lib/jawRelease';
import { validatePracticeDefinitions } from '../../src/lib/practiceDefinition';
import timing from '../../src/assets/jaw-release/timing.json';

test('registration and rendered audio fit all 35 cue slots', () => {
  expect(validatePracticeDefinitions([jawRelease])).toEqual([]);
  expect(jawRelease.guide.cues.filter(cue => cue.type === 'silence').map(cue => cue.durationSec))
    .toEqual([5, 4, 5, 4, 5, 4, 5, 4, 5, 4]);
  const intro = readFileSync('src/assets/jaw-release/intro.wav');
  const practice = readFileSync('src/assets/jaw-release/practice.wav');
  expect(intro.length).toBe(44 + 2 * timing.introFrames);
  expect(practice.length).toBe(44 + 2 * timing.sampleRate * 45);
  expect(practice.readUInt32LE(24)).toBe(timing.sampleRate);
  expect(timing.segments).toHaveLength(35);
  for (const [index, segment] of timing.segments.entries()) {
    expect(segment.start).toBe(Math.floor(index / 7) * 9 + index % 7);
    const end = segment.start * timing.sampleRate + segment.frames;
    const next = (timing.segments[index + 1]?.start ?? 45) * timing.sampleRate;
    expect(end).toBeLessThan(next);
    const clip = practice.subarray(44 + 2 * segment.start * timing.sampleRate, 44 + 2 * end);
    expect(clip.some(byte => byte !== 0)).toBe(true);
    expect(practice.subarray(44 + 2 * end, 44 + 2 * next).every(byte => byte === 0)).toBe(true);
  }
});

declare global {
  interface Window { jawTracks: HTMLAudioElement[]; jawOverlap: boolean }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const NativeAudio = window.Audio;
    window.jawTracks = [];
    window.jawOverlap = false;
    window.Audio = function (url?: string) {
      const track = new NativeAudio(url);
      const prior = window.jawTracks.slice();
      track.addEventListener('playing', () => {
        if (prior.some(other => !other.paused && !other.ended)) window.jawOverlap = true;
      });
      window.jawTracks.push(track);
      return track;
    } as typeof Audio;
  });
  await page.goto('/jaw-release.html');
  await page.getByRole('checkbox').check();
});

test('plays actual WAVs, waits for intro, and follows the practice media clock', async ({ page }) => {
  test.setTimeout(80000);
  const clock = page.getByLabel('実践残り秒数');
  const start = page.getByRole('button', { name: '説明から開始' });
  await start.evaluate(button => button.addEventListener('click', () => (button as HTMLButtonElement).click(), { once: true }));
  await start.click();
  await expect(clock).toHaveText('0:45');
  await expect.poll(() => page.evaluate(() => window.jawTracks[0]?.currentTime)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.jawTracks.length)).toBe(1);
  await expect(page.getByText('1 / 5 回')).toBeVisible({ timeout: 22000 });
  await expect(page.getByRole('img', { name: '上下の歯を少し離す模式図' })).toBeVisible();
  await expect(page.getByTestId('spoken-cue')).toHaveText('4');
  await expect(clock).toHaveText('0:44');
  await expect(page.getByText('顎の力を抜いて休みます。')).toBeVisible({ timeout: 8000 });
  await expect(page.getByRole('img', { name: '顎を休める模式図' })).toBeVisible();
  await page.getByRole('button', { name: '一時停止' }).click();
  const pausedTime = await page.evaluate(() => window.jawTracks[1].currentTime);
  const pausedText = await clock.textContent();
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => window.jawTracks[1].currentTime)).toBe(pausedTime);
  await expect(clock).toHaveText(pausedText!);
  await page.getByRole('button', { name: '再開' }).click();
  await expect(page.getByText('実践を終了しました。')).toBeVisible({ timeout: 50000 });
  await expect(clock).toHaveText('0:00');
  expect(await page.evaluate(() => ({ tracks: window.jawTracks.length, overlap: window.jawOverlap })))
    .toEqual({ tracks: 2, overlap: false });
});

test('stops on media failure or premature end, and ignores notifications after exit', async ({ page }) => {
  const start = page.getByRole('button', { name: '説明から開始' });
  const error = page.getByText('音声を再生できませんでした。', { exact: false });
  await start.click();
  await page.evaluate(() => window.jawTracks.at(-1)!.dispatchEvent(new Event('ended')));
  await expect(error).toBeVisible();
  await start.click();
  await page.evaluate(() => window.jawTracks.at(-1)!.dispatchEvent(new Event('error')));
  await expect(error).toBeVisible();
  await start.click();
  await page.evaluate(() => {
    window.dispatchEvent(new Event('pagehide'));
    window.jawTracks.at(-1)!.dispatchEvent(new Event('ended'));
  });
  await expect(page.getByText('説明のあとに45秒実践します。')).toBeVisible();
  await expect(page.getByLabel('実践残り秒数')).toHaveText('0:45');
  expect(await page.evaluate(() => window.jawTracks.every(track => track.paused))).toBe(true);
});
