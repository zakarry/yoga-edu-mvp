import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import timing from '../../src/assets/face-balance/timing.json' with { type: 'json' };

declare global {
  interface Window { faceTracks: HTMLAudioElement[]; faceOverlap: boolean }
}

test('all seven audio timelines preserve complete non-overlapping cue windows', () => {
  for (const [id, item] of Object.entries(timing)) {
    const wav = (part: string, frames: number) => {
      const bytes = readFileSync('src/assets/face-balance/' + id + '-' + part + '.wav');
      expect(bytes.readUInt32LE(24)).toBe(item.sampleRate);
      expect(bytes.length).toBe(44 + 2 * frames);
      return bytes;
    };
    wav('intro', item.introFrames);
    wav('transition', item.transitionFrames);
    const practice = wav('practice', item.practiceSec * item.sampleRate);
    let start = 0;
    for (const cue of item.segments) {
      expect(cue.start).toBe(start);
      const begin = 44 + 2 * start * item.sampleRate;
      expect(practice.subarray(begin, begin + 2 * cue.frames).some(byte => byte !== 0)).toBe(true);
      start += cue.seconds;
      expect(practice.subarray(begin + 2 * cue.frames, 44 + 2 * start * item.sampleRate).every(byte => byte === 0)).toBe(true);
      expect(cue.frames).toBeLessThan(cue.seconds * item.sampleRate);
    }
    expect(start).toBe(item.practiceSec);
  }
});

for (const [id, item] of Object.entries(timing)) {
  test(id + ' uses real media, shows phase on its boundary and drains transition', async ({ page }) => {
    await page.addInitScript(() => {
      const Original = window.Audio;
      window.faceTracks = [];
      window.faceOverlap = false;
      window.Audio = function (url?: string) {
        const track = new Original(url);
        track.addEventListener('playing', () => {
          if (window.faceTracks.some(other => other !== track && !other.paused && !other.ended)) window.faceOverlap = true;
        });
        window.faceTracks.push(track);
        return track;
      } as typeof Audio;
    });
    await page.goto('/face-balance.html');
    await page.getByLabel('種目').selectOption(id);
    await expect(page.getByText('開発検品用・公開不可')).toBeVisible();
    await page.getByRole('checkbox').check();
    const clock = page.getByLabel('実践残り秒数');
    const format = (seconds: number) => Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
    await page.getByRole('button', { name: '説明から開始' }).click();
    await expect(clock).toHaveText(format(item.practiceSec));
    await expect(page.locator('p[role=status]')).toHaveText(item.intro);
    expect(await page.evaluate(() => window.faceTracks.length)).toBe(1);
    await expect(page.locator('p[role=status]')).toHaveText(item.segments[0].caption, { timeout: 18000 });
    await page.getByRole('button', { name: '一時停止' }).click();
    const second = item.segments[1];
    await page.evaluate(start => { window.faceTracks[1].currentTime = start; }, second.start);
    await page.getByRole('button', { name: '再開' }).click();
    await expect(page.locator('p[role=status]')).toHaveText(second.caption);
    await expect(page.getByRole('img', { name: second.caption })).toBeVisible();
    await expect(clock).toHaveText(format(item.practiceSec - second.start));
    await page.evaluate(() => { const track = window.faceTracks[1]; track.currentTime = track.duration - 0.2; });
    await expect(page.locator('p[role=status]')).toHaveText(item.transitionCaption);
    await expect(clock).toHaveText('0:00');
    await expect(page.locator('p[role=status]')).toHaveText('検品再生が終了しました。');
    expect(await page.evaluate(() => ({ tracks: window.faceTracks.length, overlap: window.faceOverlap }))).toEqual({ tracks: 3, overlap: false });
  });
}
