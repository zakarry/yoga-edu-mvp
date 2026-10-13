import { test, expect, type Page } from '@playwright/test';
import { settingsDatabase, asUser, USER_A, USER_B } from '../helpers/teacher-settings-db';
import { randomUUID } from 'node:crypto';

async function fixture(page: Page) {
  const db = await settingsDatabase(), tokens = new Map<string, string>();
  const state = { failRead: false, failSave: false, delayRead: 0, writes: 0, blocked: [] as string[] };
  const users = { 'a@example.test': USER_A, 'b@example.test': USER_B };
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === 'http://127.0.0.1:4175') return route.continue();
    if (url.origin !== 'http://127.0.0.1:54329') { state.blocked.push(url.origin); return route.abort(); }
    const respond = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body), headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4175' } });
    if (request.method() === 'OPTIONS') return respond({});
    const body = request.postDataJSON() as Record<string, unknown> | null;
    const token = request.headers().authorization?.replace('Bearer ', '') ?? '', owner = tokens.get(token);
    const user = (id: string, email: string) => ({ id, email, aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, created_at: '2026-10-13T00:00:00Z' });
    if (url.pathname === '/auth/v1/token') {
      const email = String(body?.email), id = users[email as keyof typeof users];
      if (!id || body?.password !== 'fixture-password') return respond({ message: 'fixture credentials invalid' }, 400);
      const payload = Buffer.from(JSON.stringify({ sub: id, exp: Math.floor(Date.now()/1000)+3600, aud: 'authenticated', role: 'authenticated' })).toString('base64url');
      const access = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')+'.'+payload+'.'+randomUUID();
      tokens.set(access, id);
      return respond({ access_token: access, refresh_token: randomUUID(), token_type: 'bearer', expires_in: 3600, user: user(id, email) });
    }
    if (url.pathname === '/auth/v1/logout') { tokens.delete(token); return respond({}); }
    if (url.pathname === '/auth/v1/user' && owner) return respond(user(owner, owner === USER_A ? 'a@example.test' : 'b@example.test'));
    if (!url.pathname.startsWith('/rest/v1/')) return respond({ message: 'not allowed' }, 403);
    if (!owner) return respond({ message: 'unauthorized' }, 401);
    const table = url.pathname.split('/').at(-1);
    const singular = request.headers().accept?.includes('vnd.pgrst.object');
    if (table === 'profiles') return respond({ id: owner, display_name: owner === USER_A ? 'Fixture A' : 'Fixture B', role: 'student', preferred_language: 'ja', is_admin: false });
    if (table === 'privacy_settings') return respond({ user_id: owner, allow_ai_memory: false, allow_sensitive_data_storage: false });
    if (table === 'user_consents') return respond({ id: 'fixture-consent' });
    if (table !== 'ai_teacher_settings') return respond(singular ? null : []);
    if (request.method() === 'GET') {
      const requested = url.searchParams.get('user_id')?.replace('eq.', '') ?? owner;
      const rows = await asUser(db, owner, async tx => (await tx.query('SELECT * FROM public.ai_teacher_settings WHERE user_id=$1', [requested])).rows);
      if (state.delayRead) await new Promise(resolve => setTimeout(resolve, state.delayRead));
      if (state.failRead) return respond({ code: 'fixture_read_error', message: 'offline' }, 503);
      return respond(singular ? rows[0] ?? null : rows);
    }
    if (state.failSave) return respond({ code: 'fixture_write_error', message: 'offline' }, 503);
    try {
      const result = await asUser(db, owner, async tx => {
        const keys = Object.keys(body!), values = Object.values(body!);
        if (request.method() === 'POST') return (await tx.query(`INSERT INTO public.ai_teacher_settings (${keys.join(',')}) VALUES (${keys.map((_, i) => '$'+(i+1)).join(',')}) RETURNING *`, values)).rows;
        if (request.method() !== 'PATCH') throw Error('unsupported');
        const id = url.searchParams.get('user_id')?.replace('eq.', ''), revision = Number(url.searchParams.get('revision')?.replace('eq.', ''));
        return (await tx.query(`UPDATE public.ai_teacher_settings SET ${keys.map((key,i) => key+'=$'+(i+1)).join(',')} WHERE user_id=$${values.length+1} AND revision=$${values.length+2} RETURNING *`, [...values, id, revision])).rows;
      });
      if (result.length !== 1) return respond({ code: 'PGRST116', message: 'revision conflict' }, 406);
      state.writes++; return respond(singular ? result[0] : result);
    } catch { return respond({ code: '42501', message: 'write rejected' }, 403); }
  });
  return { db, state };
}
async function signIn(page: Page, account: 'a' | 'b') {
  await page.getByRole('button', { name: 'メニューを開く', exact: true }).click();
  await page.getByRole('button', { name: 'ログイン / 無料会員登録', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  if (await dialog.getByRole('button', { name: 'メールアドレスで続ける' }).isVisible()) await dialog.getByRole('button', { name: 'メールアドレスで続ける' }).click();
  await dialog.getByPlaceholder('メールアドレス', { exact: true }).fill(account+'@example.test');
  await dialog.getByPlaceholder('パスワード', { exact: true }).fill('fixture-password');
  await dialog.locator('button[type=submit]').click();
  await expect(page.getByRole('button', { name: 'メニューを開く', exact: true })).toBeVisible();
  await expect(page.locator('.auth-compact-logout')).toHaveCount(1);
  await expect(page.locator('.consent-gate-overlay')).toHaveCount(0);
}
async function signOut(page: Page) {
  await page.getByRole('button', { name: 'メニューを開く', exact: true }).click();
  const loggedOut = page.waitForResponse(response => new URL(response.url()).pathname === '/auth/v1/logout' && response.status() === 200);
  await page.getByRole('button', { name: 'ログアウト', exact: true }).click();
  await loggedOut;
  await expect(page.locator('.auth-compact-logout')).toHaveCount(0);
}
async function openSettings(page: Page) {
  await page.getByRole('button', { name: 'AI先生設定', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'STEP 4 — AI先生設定' })).toBeVisible();
}

test('real settings UI + isolated Postgres: save, reload, logout/relogin, account separation, prefs and deletion', async ({ page }) => {
  const { db, state } = await fixture(page);
  try {
    await page.addInitScript(() => localStorage.setItem('yogaTeacher', JSON.stringify({ name: 'Legacy teacher', avatar: '🌿', personality: 'gentle', specialty: 'hatha', uiLanguage: 'ja', teachingLanguage: 'ja', createdAt: '2026-10-13T00:00:00Z' })));
    await page.goto('/?entry=teacher'); await signIn(page, 'a'); await openSettings(page);
    await expect(page.getByRole('textbox', { name: '先生の名前' })).toHaveValue('');
    await page.getByRole('textbox', { name: '先生の名前' }).fill('Account A teacher');
    await page.getByLabel('Teacher Personality').selectOption('precise');
    await page.getByLabel('指導言語', { exact: true }).selectOption('en');
    await page.getByRole('button', { name: '保存する', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('アカウントに');
    await page.getByRole('button', { name: '先生の成長', exact: true }).click();
    await page.locator('.ai-teacher-prefs-section').getByRole('button', { name: '詳しく', exact: true }).click();
    await expect(page.locator('.ai-teacher-prefs-section').getByRole('button', { name: '詳しく', exact: true })).toHaveClass(/active/);
    await page.reload();
    await page.getByRole('button', { name: '先生の成長', exact: true }).click();
    await expect(page.locator('.ai-teacher-prefs-section').getByRole('button', { name: '詳しく', exact: true })).toHaveClass(/active/);
    await openSettings(page);
    await expect(page.locator('.ai-teacher-persona-fields')).toContainText('Account A teacher');
    await expect(page.locator('.ai-teacher-persona-fields')).toContainText('論理的で丁寧');
    await expect(page.locator('.ai-teacher-persona-fields')).toContainText('English');
    await signOut(page);
    await expect(page.locator('.ai-teacher-hero-teacher')).toContainText('Legacy teacher');
    await signIn(page, 'b');
    await expect(page.getByRole('textbox', { name: '先生の名前' })).toHaveValue('');
    await expect(page.locator('.ai-teacher-hero-teacher')).toHaveCount(0);
    await page.getByRole('button', { name: '先生の成長', exact: true }).click();
    await expect(page.locator('.ai-teacher-prefs-section').getByRole('button', { name: '標準', exact: true })).toHaveClass(/active/);
    await openSettings(page);
    await page.getByRole('textbox', { name: '先生の名前' }).fill('Account B teacher');
    await page.getByRole('button', { name: '保存する', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('アカウントに');
    await signOut(page); await signIn(page, 'a');
    await expect(page.locator('.ai-teacher-persona-fields')).toContainText('Account A teacher');
    await page.getByRole('button', { name: '先生の成長', exact: true }).click();
    await expect(page.locator('.ai-teacher-prefs-section').getByRole('button', { name: '詳しく', exact: true })).toHaveClass(/active/);
    await openSettings(page);
    await page.getByRole('button', { name: '削除する', exact: true }).click();
    await expect(page.getByRole('textbox', { name: '先生の名前' })).toHaveValue('');
    await page.reload(); await openSettings(page); await expect(page.getByRole('textbox', { name: '先生の名前' })).toHaveValue('');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('yogaTeacher')!).name)).toBe('Legacy teacher');
    expect(state.writes).toBe(4); expect(state.blocked.filter(origin => origin.includes('supabase'))).toEqual([]);
  } finally { await db.close(); }
});

test('read failure blocks writes; failed save keeps typed inputs and supports retry', async ({ page }) => {
  const { db, state } = await fixture(page);
  try {
    state.failRead = true;
    await page.goto('/?entry=teacher'); await signIn(page, 'a'); await openSettings(page);
    await expect(page.getByRole('status')).toContainText('読み込めません');
    await expect(page.getByRole('button', { name: '保存する', exact: true })).toHaveCount(0); expect(state.writes).toBe(0);
    state.failRead = false; await page.getByRole('button', { name: '先生設定を再読み込み' }).click();
    await page.getByRole('textbox', { name: '先生の名前' }).fill('Unsaved input');
    state.failSave = true; await page.getByRole('button', { name: '保存する', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('保存できません');
    await expect(page.getByRole('textbox', { name: '先生の名前' })).toHaveValue('Unsaved input'); expect(state.writes).toBe(0);
    state.failSave = false; await page.getByRole('button', { name: '保存する', exact: true }).click();
    await expect(page.locator('.ai-teacher-persona-fields')).toContainText('Unsaved input'); expect(state.writes).toBe(1);
  } finally { await db.close(); }
});
