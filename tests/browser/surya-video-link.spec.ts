import { test, expect } from '@playwright/test';

for (const width of [320, 390, 1280]) {
  test(`Surya video entrance does not overlap its instructions at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?entry=teacher', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: '実践する', exact: true }).click();
    const intro = page.locator('.sequence-beginner-intro');
    const text = intro.locator('p').first();
    const link = intro.getByRole('link', { name: '練習前に公式動画を見る（別タブ）' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/?entry=surya-namaskar');
    await expect(link).toHaveAttribute('target', '_blank');
    const textBox = (await text.boundingBox())!;
    const linkBox = (await link.boundingBox())!;
    const introBox = (await intro.boundingBox())!;
    expect(linkBox.y - (textBox.y + textBox.height)).toBeGreaterThanOrEqual(12);
    expect(linkBox.x).toBeGreaterThanOrEqual(introBox.x);
    expect(linkBox.x + linkBox.width).toBeLessThanOrEqual(introBox.x + introBox.width);
    expect(linkBox.y + linkBox.height).toBeLessThanOrEqual(introBox.y + introBox.height);
    expect(linkBox.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
