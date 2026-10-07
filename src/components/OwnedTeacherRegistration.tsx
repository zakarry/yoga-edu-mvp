import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { RegisterForm, type FormSectionConfig } from './RegisterForm';

type Values = Record<string, string | string[]>;

export function OwnedTeacherRegistration({ sections }: { sections: FormSectionConfig[] }) {
  const auth = useAuth();
  const ownerRef = useRef(auth.user?.id);
  ownerRef.current = auth.user?.id;
  const [loadedOwner, setLoadedOwner] = useState<string | undefined>();
  const [values, setValues] = useState<Values | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setValues(null); setBusy(true); setError(''); setSaved(false);
    if (!auth.user || !supabase) { setBusy(false); return; }
    Promise.resolve(supabase.from('teacher_registration_drafts').select('values').eq('user_id', auth.user.id).maybeSingle())
      .then(({ data, error }) => {
        if (cancelled) return;
        setLoadedOwner(auth.user?.id);
        if (error) setError('登録情報を読み込めませんでした。再試行してください。');
        else setValues((data?.values as Values | undefined) ?? {});
        setBusy(false);
      }).catch(() => {
        if (cancelled) return;
        setLoadedOwner(auth.user?.id);
        setError('登録情報を読み込めませんでした。再試行してください。');
        setBusy(false);
      });
    return () => { cancelled = true; };
  }, [auth.user?.id, version]);
  if (auth.loading || !auth.authReady || (auth.user && loadedOwner !== auth.user.id) || busy && !values) return <p role="status">登録情報を確認しています…</p>;
  if (!auth.user) return <section className="panel"><h2>先生登録・登録内容を編集</h2><p>ログインすると、自分の登録情報を保存して後から編集できます。上部の「ログイン / 無料会員登録」から進んでください。</p></section>;
  return <>
    <section className="panel">
      <h2>自分の先生登録を確認・編集</h2>
      <p>登録内容は本人用の下書きとして保存されます。公開掲載・資格確認は別途審査が必要です。既存の掲載情報を自動的に取り込むことはありません。</p>
      {error && <p role="alert">{error}</p>}
      {!values && <button className="secondary-button" onClick={() => setVersion(v => v + 1)}>再試行</button>}
      {saved && <p role="status">登録内容を保存しました。次回もこの画面で確認・編集できます。</p>}
    </section>
    {values && <RegisterForm key={`${auth.user.id}:${version}`} title="先生登録・編集" subtitle="自分の登録情報を保存・更新します。" sections={sections.map(s => ({ ...s, fields: s.fields.map(f => f.type === 'file' ? { ...f, type: 'url' as const, label: 'プロフィール写真URL', placeholder: 'https://…' } : f) }))} initialValues={values} submitLabel="登録内容を保存する" busy={busy} onSubmit={async next => {
      if (busy || !supabase || !auth.user) return;
      const owner = auth.user.id;
      setBusy(true); setError(''); setSaved(false);
      try {
        const { error } = await supabase.from('teacher_registration_drafts').upsert({ user_id: owner, values: next, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
        if (ownerRef.current !== owner) return;
        if (error) setError('保存できませんでした。入力内容を保ったまま再試行できます。');
        else { setValues(next); setSaved(true); }
      } catch {
        if (ownerRef.current === owner) setError('保存できませんでした。入力内容を保ったまま再試行できます。');
      } finally {
        if (ownerRef.current === owner) setBusy(false);
      }
    }} />}
  </>;
}
