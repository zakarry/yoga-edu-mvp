import { test, expect } from '@playwright/test';
const googleEnabled = process.env.STAGING_GOOGLE_TEST === 'true';
const backend = 'https://htnouayipmqvpckppbzv.supabase.co';
test('isolated artifact: product loads, explicit Google gate, LINE disabled, foreign fetch/Edge/navigation blocked', async ({ page, context }) => {
  const unexpected: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', route => {
    const target = new URL(route.request().url());
    if (target.origin === 'http://127.0.0.1:4178') return route.continue();
    if (target.origin === backend && target.pathname.startsWith('/rest/v1/')) return route.fulfill({ json: [] });
    unexpected.push(target.origin + target.pathname); return route.abort();
  });
  const response = await page.goto('/');
  expect(response?.headers()['content-security-policy']).toContain(`${backend}/auth/v1/`);
  await expect(page.getByText(googleEnabled ? '検証専用 — Google・メールログイン／LINEは無効' : '検証専用 — メールログインのみ・外部リンクは無効')).toBeVisible();
  await page.getByRole('button', { name: 'ログイン / 無料会員登録', exact: true }).click();
  await expect(page.getByRole('button', { name: /Googleで続ける/ })).toBeEnabled({ enabled: googleEnabled });
  await expect(page.getByRole('button', { name: /LINEで続ける/ })).toBeDisabled();
  const blocked = await page.evaluate(async () => {
    const denied: boolean[] = [];
    for (const url of ['https://unapproved.invalid/rest/v1/settings',
      'https://htnouayipmqvpckppbzv.supabase.co/functions/v1/line-auth/start']) {
      try { await fetch(url); denied.push(false); } catch { denied.push(true); }
    }
    return { denied, popup: window.open('https://unapproved.invalid') === null };
  });
  expect(blocked).toEqual({ denied: [true, true], popup: true });
  expect(unexpected).toEqual([]);
  expect(errors).toEqual([]);
});


test('Google opt-in navigates only to isolated Supabase with current-origin return', async ({ page, context }) => {
  test.skip(!googleEnabled, 'Email-only artifact intentionally has Google disabled');
  const unexpected: string[] = [];
  let authorize: URL | undefined;
  await context.route('**/*', route => {
    const target = new URL(route.request().url());
    if (target.origin === 'http://127.0.0.1:4178') return route.continue();
    if (target.origin === backend && target.pathname === '/auth/v1/authorize') {
      authorize = target;
      return route.fulfill({ contentType: 'text/plain', body: 'Isolated authorize intercepted; no live OAuth request' });
    }
    if (target.origin === backend && target.pathname.startsWith('/rest/v1/')) return route.fulfill({ json: [] });
    unexpected.push(target.origin + target.pathname); return route.abort();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'ログイン / 無料会員登録', exact: true }).click();
  await page.getByRole('button', { name: /Googleで続ける/ }).click();
  await expect.poll(() => authorize?.pathname).toBe('/auth/v1/authorize');
  expect(authorize!.searchParams.get('provider')).toBe('google');
  expect(authorize!.searchParams.get('redirect_to')).toBe('http://127.0.0.1:4178');
  expect(unexpected).toEqual([]);
});
