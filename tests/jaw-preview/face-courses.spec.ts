import { expect, test, type Page } from '@playwright/test';

declare global {
  interface Window { courseTracks: HTMLAudioElement[]; courseOverlap: boolean }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const Original = window.Audio;
    window.courseTracks = [];
    window.courseOverlap = false;
    window.Audio = function (url?: string) {
      const track = new Original(url);
      track.addEventListener('playing', () => {
        if (window.courseTracks.some(other => other !== track && !other.paused && !other.ended)) window.courseOverlap = true;
      });
      window.courseTracks.push(track);
      return track;
    } as typeof Audio;
  });
  await page.goto('/face-balance.html');
});

async function start(page: Page, course: string) {
  await page.getByLabel('連続再生コース').selectOption(course);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: '説明から開始' }).click();
}

async function drain(page: Page, count: number, file: string) {
  await expect.poll(() => page.evaluate(() => window.courseTracks.length)).toBe(count);
  await expect.poll(() => page.evaluate(() => window.courseTracks.at(-1)?.currentTime ?? 0)).toBeGreaterThan(0);
  await page.evaluate(expected => {
    const track = window.courseTracks.at(-1)!;
    if (!track.currentSrc.includes(expected)) throw new Error(track.currentSrc + ' does not match ' + expected);
    track.currentTime = track.duration - 0.1;
  }, file);
}

const courses = [
  { index: '0', ids: ['jaw', 'lip', 'smile'], practice: 180, total: '239.435' },
  { index: '1', ids: ['kapola', 'simhasana', 'tongue'], practice: 180, total: '223.140' },
  { index: '2', ids: ['jaw', 'griva', 'relax'], practice: 165, total: '199.035' },
  { index: '3', ids: ['jaw', 'kapola', 'tongue', 'smile', 'relax'], practice: 300, total: '354.470' },
  { index: '4', ids: ['jaw', 'kapola', 'simhasana', 'tongue', 'lip', 'smile', 'griva', 'relax'], practice: 480, total: '599.240' },
];

for (const course of courses) {
  test('course ' + course.index + ' drains real audio in order with measured totals', async ({ page }) => {
    test.setTimeout(75000);
    await expect(page.getByText('実践 ' + course.practice + '秒 ／ 総尺 ' + course.total + '秒')).toBeVisible();
    await start(page, course.index);
    const step = page.getByTestId('course-step');
    let count = 0;
    for (const [i, id] of course.ids.entries()) {
      const prefix = (i + 1) + ' / ' + course.ids.length + ' 種目 · ';
      await expect(step).toHaveText(prefix + '説明');
      await drain(page, ++count, id === 'jaw' ? '/jaw-release/intro.wav' : id + '-intro.wav');
      await expect(step).toHaveText(prefix + '実践');
      if (id === 'jaw') {
        await expect.poll(() => page.evaluate(() => window.courseTracks.at(-1)?.currentTime ?? 0)).toBeGreaterThan(0);
        await page.evaluate(() => { window.courseTracks.at(-1)!.currentTime = 42.2; });
        await expect(step).toHaveText(prefix + '切替（実践枠内）');
        await drain(page, ++count, '/jaw-release/practice.wav');
      } else {
        await drain(page, ++count, id + '-practice.wav');
        await expect(step).toHaveText(prefix + '切替');
        await drain(page, ++count, id + '-transition.wav');
      }
    }
    await expect(page.getByText('検品再生が終了しました。')).toBeVisible();
    expect(await page.evaluate(() => [window.courseTracks.length, window.courseOverlap])).toEqual([count, false]);
  });
}

test('pauses and resumes a transition, and ignores old notifications after stop and exit', async ({ page }) => {
  await start(page, '1');
  await drain(page, 1, 'kapola-intro.wav');
  await drain(page, 2, 'kapola-practice.wav');
  await expect(page.getByTestId('course-step')).toHaveText('1 / 3 種目 · 切替');
  await expect.poll(() => page.evaluate(() => window.courseTracks[2].currentTime)).toBeGreaterThan(0);
  await page.getByRole('button', { name: '一時停止' }).click();
  const paused = await page.evaluate(() => window.courseTracks[2].currentTime);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.courseTracks[2].currentTime)).toBe(paused);
  await page.getByRole('button', { name: '再開' }).click();
  await expect.poll(() => page.evaluate(() => window.courseTracks[2].currentTime)).toBeGreaterThan(paused);
  await page.getByRole('button', { name: '停止', exact: true }).click();
  await page.evaluate(() => window.courseTracks[2].dispatchEvent(new Event('ended')));
  await expect(page.getByTestId('course-step')).toHaveText('1 / 3 種目 · 待機');
  await page.getByRole('button', { name: '説明から開始' }).click();
  await page.evaluate(() => {
    window.dispatchEvent(new Event('pagehide'));
    window.courseTracks[3].dispatchEvent(new Event('ended'));
  });
  await expect(page.getByTestId('course-step')).toHaveText('1 / 3 種目 · 待機');
  expect(await page.evaluate(() => [window.courseTracks.length, window.courseOverlap, window.courseTracks.every(track => track.paused)]))
    .toEqual([4, false, true]);
});

test('a transition error blocks the next exercise even if ended arrives late', async ({ page }) => {
  await start(page, '1');
  await drain(page, 1, 'kapola-intro.wav');
  await drain(page, 2, 'kapola-practice.wav');
  await expect(page.getByTestId('course-step')).toHaveText('1 / 3 種目 · 切替');
  await page.evaluate(() => {
    const transition = window.courseTracks[2];
    transition.dispatchEvent(new Event('error'));
    transition.dispatchEvent(new Event('ended'));
  });
  await expect(page.getByText('音声を再生できませんでした。')).toBeVisible();
  expect(await page.evaluate(() => [window.courseTracks.length, window.courseTracks.every(track => track.paused)]))
    .toEqual([3, true]);
});
