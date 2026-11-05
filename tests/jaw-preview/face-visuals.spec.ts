import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import timing from '../../src/assets/face-balance/timing.json' with { type: 'json' };

test('pilot MP4s retain supplied bytes and contain no audio track', () => {
  const assets = [
    ['05_lip_o_smile.mp4', '5e5a849869f550bfe98e4536373d056e0d8e9a4d86f05cf6a1fc1310593c85d9'],
    ['07_griva_gentle_corrected.mp4', 'cf24412626db1ad936214887ab6a116b56e624861ac578a465a299f2f0201807'],
  ];
  for (const [name, hash] of assets) {
    const bytes = readFileSync('src/assets/face-visuals/' + name);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(hash);
    const handlers: string[] = [];
    let position = bytes.indexOf('hdlr');
    while (position >= 0) {
      handlers.push(bytes.toString('ascii', position + 12, position + 16));
      position = bytes.indexOf('hdlr', position + 4);
    }
    expect(handlers).toContain('vide');
    expect(handlers).not.toContain('soun');
  }
});

declare global {
  interface Window { visualAudio: HTMLAudioElement[]; oldFaceVideo: HTMLVideoElement }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const Original = window.Audio;
    window.visualAudio = [];
    window.Audio = function (url?: string) {
      const audio = new Original(url);
      window.visualAudio.push(audio);
      return audio;
    } as typeof Audio;
  });
});

async function openPractice(page: Page, id: 'lip' | 'griva') {
  await page.goto('/face-balance.html');
  await page.getByRole('combobox', { name: '種目', exact: true }).selectOption(id);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: '説明から開始' }).click();
  await expect(page.locator('p[role=status]')).toHaveText(timing[id].segments[0].caption, { timeout: 20000 });
}

async function seekPractice(page: Page, seconds: number) {
  await page.getByRole('button', { name: '一時停止' }).click();
  await page.evaluate(time => { window.visualAudio[1].currentTime = time; }, seconds);
  await page.getByRole('button', { name: '再開' }).click();
}

async function expectFrame(page: Page, frame: number, frameSeconds: number) {
  const visual = page.getByTestId('face-animation');
  await expect(visual).toHaveAttribute('data-frame', String(frame));
  await expect(visual).toHaveAttribute('data-visual-status', 'ready');
  const state = await page.locator('video').evaluate(video => ({
    time: video.currentTime, paused: video.paused, muted: video.muted, loop: video.loop,
  }));
  expect(state.time).toBeCloseTo((frame + 0.5) * frameSeconds, 2);
  expect(state).toMatchObject({ paused: true, muted: true, loop: false });
}

test('Lip follows instruction, hold, smile, release and rounds three to five without looping', async ({ page }, info) => {
  await openPractice(page, 'lip');
  await expectFrame(page, 4, 0.5); // No premature O movement during its long narration.
  for (const [seconds, frame] of [[4.1, 0], [5.2, 1], [6.1, 2], [7.2, 3], [8.1, 4], [12.5, 5], [20.1, 6], [36.1, 0], [68.1, 0]]) {
    await seekPractice(page, seconds);
    await expectFrame(page, frame, 0.5);
  }
  await page.getByRole('button', { name: '一時停止' }).click();
  const position = await page.locator('video').evaluate(video => video.currentTime);
  const countdown = await page.getByLabel('実践残り秒数').textContent();
  await page.waitForTimeout(9000);
  expect(await page.locator('video').evaluate(video => video.currentTime)).toBe(position);
  await expect(page.getByLabel('実践残り秒数')).toHaveText(countdown!);
  await page.getByTestId('face-animation').screenshot({ path: info.outputPath('lip-o.png') });
  // Inspect crop geometry without changing the supplied video.
  expect(await page.locator('video').evaluate(video => parseFloat(getComputedStyle(video).top))).toBeLessThan(0);
});

test('Griva selects corrected right/front/left frames for all three rounds, down and final return', async ({ page }, info) => {
  await openPractice(page, 'griva');
  const sequence = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 12, 12];
  for (const [index, frame] of sequence.entries()) {
    await seekPractice(page, index * 4 + 0.2);
    await expectFrame(page, frame, 0.45);
    if (index === 0) {
      await page.getByRole('button', { name: '一時停止' }).click();
      await page.getByTestId('face-animation').screenshot({ path: info.outputPath('griva-right.png') });
      await page.getByRole('button', { name: '再開' }).click();
    }
  }
  await expect(page.locator('video')).toHaveCSS('transform', 'matrix(-1, 0, 0, 1, 0, 0)');
  await page.getByRole('button', { name: '停止', exact: true }).click();
  await expectFrame(page, 0, 0.45);
});

test('video error falls back to SVG while the audio can finish', async ({ page }) => {
  await page.route('**/*.mp4', route => route.abort());
  await openPractice(page, 'lip');
  await expect(page.getByTestId('face-animation')).toHaveAttribute('data-visual-status', 'fallback');
  await expect(page.getByRole('img', { name: timing.lip.segments[0].caption })).toBeVisible();
  await seekPractice(page, 79.8);
  await expect(page.getByText('検品再生が終了しました。')).toBeVisible();
});

test('old video events after changing practice cannot replace the new visual', async ({ page }) => {
  await page.goto('/face-balance.html');
  await page.getByRole('combobox', { name: '種目', exact: true }).selectOption('lip');
  await expectFrame(page, 4, 0.5);
  await page.evaluate(() => { window.oldFaceVideo = document.querySelector('video')!; });
  await page.getByRole('combobox', { name: '種目', exact: true }).selectOption('griva');
  await expectFrame(page, 0, 0.45);
  await page.evaluate(() => {
    window.oldFaceVideo.dispatchEvent(new Event('error'));
    window.oldFaceVideo.dispatchEvent(new Event('seeked'));
  });
  await expectFrame(page, 0, 0.45);
  expect(await page.evaluate(() => window.oldFaceVideo.paused && !window.oldFaceVideo.hasAttribute('src'))).toBe(true);
});

for (const width of [320, 390, 430]) {
  test('animation fits ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/face-balance.html');
    for (const id of ['lip', 'griva']) {
      await page.getByRole('combobox', { name: '種目', exact: true }).selectOption(id);
      await expect(page.getByTestId('face-animation')).toHaveAttribute('data-visual-status', 'ready');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      const box = await page.getByTestId('face-animation').boundingBox();
      expect(box!.width).toBeLessThanOrEqual(width - 40);
    }
  });
}
