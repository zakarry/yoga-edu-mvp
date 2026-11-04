import { expect, test } from '@playwright/test';
import { jawRelease } from '../../src/lib/jawRelease';
import { validatePracticeDefinitions } from '../../src/lib/practiceDefinition';

test('registration has five 5-second holds and four seconds of rest per round', () => {
  expect(validatePracticeDefinitions([jawRelease])).toEqual([]);
  expect(jawRelease.guide.cues.filter(cue => cue.type === 'silence').map(cue => cue.durationSec))
    .toEqual([5, 4, 5, 4, 5, 4, 5, 4, 5, 4]);
});

declare global {
  interface Window { jawSpeech: { count: number; end: () => void; fail: () => void } }
}

test.beforeEach(async ({ page }) => {
  await page.clock.install();
  await page.addInitScript(() => {
    const state = window.jawSpeech = { count: 0, end: () => {}, fail: () => {} };
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class {
      onstart?: () => void;
    } });
    Object.defineProperties(window.speechSynthesis, {
      getVoices: { value: () => [{ lang: 'ja-JP', localService: true }] },
      speak: { value: (utterance: SpeechSynthesisUtterance) => {
        state.count++;
        const end = utterance.onend;
        const fail = utterance.onerror;
        (utterance.onstart as (() => void) | null)?.();
        state.end = () => end?.call(utterance, new Event('end') as SpeechSynthesisEvent);
        state.fail = () => fail?.call(utterance, new Event('error') as SpeechSynthesisErrorEvent);
      } },
      cancel: { value: () => {} },
    });
  });
  await page.goto('/jaw-release.html');
  await page.getByRole('checkbox').check();
});

test('waits for audio, synchronizes phase, and freezes while paused', async ({ page }) => {
  const clock = page.getByLabel('実践残り秒数');
  await page.getByRole('button', { name: '説明から開始' }).click();
  await page.clock.runFor(7000);
  await expect(clock).toHaveText('0:45');
  expect(await page.evaluate(() => window.jawSpeech.count)).toBe(1);
  await page.evaluate(() => window.jawSpeech.end());
  await expect(page.getByText('1 / 5 回')).toBeVisible();
  await expect(page.getByRole('img', { name: '上下の歯を少し離す模式図' })).toBeVisible();
  await page.clock.runFor(5100);
  await expect(clock).toHaveText('0:40');
  await expect(page.getByText('顎の力を抜いて休みます。')).toBeVisible();
  await expect(page.getByRole('img', { name: '顎を休める模式図' })).toBeVisible();
  await page.getByRole('button', { name: '一時停止' }).click();
  await page.clock.runFor(8000);
  await expect(clock).toHaveText('0:40');
  await page.getByRole('button', { name: '再開' }).click();
  await page.clock.runFor(40200);
  await expect(clock).toHaveText('0:00');
  await expect(page.getByText('実践を終了しました。')).toBeVisible();
});

test('audio failure, timeout and stale end after stop cannot start practice', async ({ page }) => {
  const start = page.getByRole('button', { name: '説明から開始' });
  await start.click();
  await page.getByRole('button', { name: '停止' }).click();
  await page.evaluate(() => window.jawSpeech.end());
  await expect(page.getByText('説明のあとに45秒実践します。')).toBeVisible();
  await start.click();
  await page.evaluate(() => { window.jawSpeech.fail(); window.jawSpeech.end(); });
  await expect(page.getByText('音声を再生できませんでした。', { exact: false })).toBeVisible();
  await start.click();
  await page.clock.fastForward(46000);
  await expect(page.getByText('音声を再生できませんでした。', { exact: false })).toBeVisible();
  await expect(page.getByLabel('実践残り秒数')).toHaveText('0:45');
});
