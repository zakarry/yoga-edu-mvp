import { test, expect } from '@playwright/test';

for (const width of [320, 390, 1280]) {
  test(`surya public video and existing practice at ${width}px`, async ({ page }) => {
    // Third-party availability is checked manually; don't make CI download video.
    await page.route('https://www.youtube.com/**', route => route.fulfill({ body: '' }));
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?entry=surya-namaskar');
    await expect(page.getByRole('heading', { name: '太陽礼拝（スーリヤ・ナマスカーラ）を学ぶ' })).toBeVisible();
    const video = page.locator('.surya-official-video');
    await expect(video).toHaveAttribute('src', 'https://www.youtube.com/embed/mRZ6bczpAgA');
    await expect(video).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'YouTubeで動画を見る（再生できない場合はこちら）' })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=mRZ6bczpAgA');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const box = await video.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(200);
    expect(box!.width).toBeGreaterThanOrEqual(200);
    await page.getByRole('button', { name: '12ステップの練習へ進む' }).click();
    await expect(video).toHaveCount(0);
    await expect(page.getByRole('heading', { name: '12ステップを練習する' })).toBeFocused();
    await expect(page.locator('.surya-namaskar-experience')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: '公式動画をもう一度表示' }).click();
    await expect(video).toBeVisible();
  });
}

test('surya menu entry and account CTA keep public introduction usable', async ({ page }) => {
  await page.route('https://www.youtube.com/**', route => route.fulfill({ body: '' }));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'メニュー', exact: true }).click();
  await page.getByRole('button', { name: '太陽礼拝（スーリヤ・ナマスカーラ）', exact: true }).click();
  await page.getByRole('button', { name: '無料会員登録・ログイン', exact: true }).click();
  // The normal CI build intentionally has no cloud configuration.
  if (await page.getByRole('dialog').count()) {
    await expect(page.getByRole('button', { name: 'Googleで続ける' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'LINEで続ける' })).toBeVisible();
    await page.getByRole('button', { name: '閉じる', exact: true }).click();
  } else {
    await expect(page.getByRole('status')).toContainText('現在、会員機能に接続できません');
  }
  await expect(page.locator('.surya-official-video')).toBeVisible();
  await page.getByRole('button', { name: '12ステップの練習へ進む' }).click();
  await expect(page.locator('.surya-namaskar-experience')).toBeVisible();
});
