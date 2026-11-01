import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Test-only entry point: never imported by the product or a production build.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const allowed = 'https://htnouayipmqvpckppbzv.supabase.co';
const form = document.querySelector<HTMLFormElement>('#acceptance')!;
const output = document.querySelector<HTMLPreElement>('#results')!;
const button = document.querySelector<HTMLButtonElement>('#run')!;
const input = (id: string) => document.querySelector<HTMLInputElement>(`#${id}`)!;
type Row = Record<string, unknown>;
const results: { name: string; status: 'PASS' | 'FAIL'; detail?: string }[] = [];
const report = (name: string, ok: boolean, detail?: string) => {
  results.push({ name, status: ok ? 'PASS' : 'FAIL', ...(detail ? { detail } : {}) });
  output.textContent = JSON.stringify({ project: 'independent-staging', results }, null, 2);
  if (!ok) throw new Error('acceptance failed');
};
const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
async function own(c: SupabaseClient, id: string): Promise<Row> {
  const { data, error } = await c.from('ai_teacher_settings').select('*').eq('user_id', id).single();
  if (error || !data) throw new Error('own read failed');
  return data;
}
const same = (a: Row, b: Row) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

form.addEventListener('submit', async event => {
  event.preventDefault(); button.disabled = true; results.length = 0;
  let a: SupabaseClient | undefined, b: SupabaseClient | undefined;
  let passwordA = input('password-a').value, passwordB = input('password-b').value;
  input('password-a').value = ''; input('password-b').value = '';
  try {
    report('固定の独立staging・PC内接続', ['127.0.0.1', 'localhost'].includes(location.hostname) && url === allowed && key.startsWith('sb_publishable_'));
    a = client(); b = client();
    const loginA = await a.auth.signInWithPassword({ email: input('email-a').value, password: passwordA });
    const loginB = await b.auth.signInWithPassword({ email: input('email-b').value, password: passwordB });
    report('A・Bの実GoTrueログイン', !loginA.error && !loginB.error);
    const verifiedA = await a.auth.getUser(), verifiedB = await b.auth.getUser();
    const idA = verifiedA.data.user?.id, idB = verifiedB.data.user?.id;
    report('サーバー検証済みJWT・異なるユーザーID', !verifiedA.error && !verifiedB.error && !!idA && !!idB && idA !== idB);
    const beforeA = await own(a, idA!), beforeB = await own(b, idB!);
    report('A・B本人の既存設定取得（正の対照）', beforeA.user_id === idA && beforeB.user_id === idB && typeof beforeA.teacher_name === 'string' && typeof beforeB.teacher_name === 'string');
    for (const [label, c, foreignId, foreignRow] of [
      ['A→B', a, idB!, beforeB], ['B→A', b, idA!, beforeA],
    ] as const) {
      const read = await c.from('ai_teacher_settings').select('*').eq('user_id', foreignId);
      report(`${label} 他人のSELECT不可`, !read.error && read.data?.length === 0, `status=${read.status}; rows=${read.data?.length ?? 'unknown'}`);
      const update = await c.from('ai_teacher_settings').update({ teacher_name: foreignRow.teacher_name }).eq('user_id', foreignId).select('user_id');
      report(`${label} 他人のUPDATE不可`, !update.error && update.data?.length === 0, `status=${update.status}; rows=${update.data?.length ?? 'unknown'}`);
      const insert = await c.from('ai_teacher_settings').insert({ user_id: foreignId, teacher_name: null });
      report(`${label} 他人IDでのINSERT拒否`, insert.error?.code === '42501', `status=${insert.status}; code=${insert.error?.code ?? 'none'}`);
    }
    report('A・Bの設定内容とrevisionが不変', same(beforeA, await own(a, idA!)) && same(beforeB, await own(b, idB!)));
    const anonymous = client();
    const anon = await anonymous.from('ai_teacher_settings').select('user_id');
    report('未認証アクセス拒否', !!anon.error && [401, 403].includes(anon.status), `status=${anon.status}; code=${anon.error?.code ?? 'none'}`);
    for (const [label, c, email, password, id, before] of [
      ['A', a, input('email-a').value, passwordA, idA!, beforeA],
      ['B', b, input('email-b').value, passwordB, idB!, beforeB],
    ] as const) {
      const logout = await c.auth.signOut({ scope: 'local' });
      const signedOut = await c.auth.getSession();
      report(`${label} ログアウトでセッション破棄`, !logout.error && !signedOut.data.session);
      const relogin = await c.auth.signInWithPassword({ email, password });
      const verified = await c.auth.getUser();
      report(`${label} 再ログインで同一ユーザー復元`, !relogin.error && !verified.error && verified.data.user?.id === id);
      const after = await own(c, id);
      report(`${label} 名前・性格・指導言語・revision復元`, same(before, after), `${String(after.teacher_name)} / ${String(after.personality)} / ${String(after.teaching_language)} / revision=${String(after.revision)}`);
    }
  } catch {
    if (!results.some(row => row.status === 'FAIL')) results.push({ name: '接続または実JWT検証', status: 'FAIL', detail: '詳細の認証情報は記録しません。以降の検証は未実施です。' });
  } finally {
    passwordA = ''; passwordB = '';
    await Promise.allSettled([a?.auth.signOut({ scope: 'local' }), b?.auth.signOut({ scope: 'local' })]);
    output.textContent = JSON.stringify({ project: 'independent-staging', results, complete: results.length === 18 && results.every(row => row.status === 'PASS') }, null, 2);
    button.disabled = false;
  }
});

