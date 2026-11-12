import { test, expect } from '@playwright/test';

for (const width of [320, 390, 1280]) {
  test(`surya requires membership before video and practice at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?entry=surya-namaskar');
    await expect(page.getByRole('heading', { name: '無料会員登録して、太陽礼拝を始めましょう' })).toBeVisible();
    await expect(page.locator('.surya-official-video')).toHaveCount(0);
    await expect(page.locator('.surya-namaskar-experience')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'YouTubeで動画を見る（再生できない場合はこちら）' })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const signup = page.getByRole('button', { name: '無料会員登録して始める', exact: true });
    if (await signup.count()) {
      await signup.click();
      await expect(page.getByRole('button', { name: 'Googleで続ける' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'LINEで続ける' })).toBeVisible();
      await page.getByRole('button', { name: '閉じる', exact: true }).click();
      await expect(page.locator('.surya-official-video')).toHaveCount(0);
      await expect(page.locator('.surya-namaskar-experience')).toHaveCount(0);
    } else {
      await expect(page.getByRole('status')).toContainText('現在、会員機能に接続できません');
    }
  });
}

test('menu and direct reload cannot bypass the Surya member gate', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'メニュー', exact: true }).click();
  await page.getByRole('button', { name: '太陽礼拝（スーリヤ・ナマスカーラ）', exact: true }).click();
  await expect(page.getByRole('heading', { name: '無料会員登録して、太陽礼拝を始めましょう' })).toBeVisible();
  await expect(page.locator('.surya-namaskar-experience')).toHaveCount(0);
  await page.goto('/?entry=surya-namaskar#surya-practice');
  await page.reload();
  await expect(page.locator('.surya-official-video')).toHaveCount(0);
  await expect(page.locator('.surya-namaskar-experience')).toHaveCount(0);
});
