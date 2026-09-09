import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';

interface AuthPanelProps {
  onOpenMyPage: () => void;
  openSignal?: number;
}

export function AuthPanel({ onOpenMyPage, openSignal = 0 }: AuthPanelProps) {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (openSignal > 0) {
      setOpen(true);
      setMode('signin');
    }
  }, [openSignal]);

  if (!isSupabaseConfigured) {
    return (
      <span className="auth-unavailable-text">クラウド保存未接続</span>
    );
  }

  if (auth.user) {
    const name = auth.profile?.display_name || auth.user.email?.split('@')[0] || 'ユーザー';
    return (
      <div className="auth-logged-in">
        <span className="auth-user-name">{name} さん</span>
        <button type="button" className="ghost-button auth-action-button" onClick={onOpenMyPage}>myYOGAカルテ</button>
        <button type="button" className="ghost-button auth-action-button" onClick={() => auth.signOut()}>ログアウト</button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fn = mode === 'signin' ? auth.signIn : auth.signUp;
    const { error: err } = await fn(email, password);
    setBusy(false);
    if (err) {
      setError(err);
    } else if (mode === 'signup') {
      setError('確認メールをご確認ください。登録完了後ログインできます。');
      setMode('signin');
    } else {
      setOpen(false);
      setEmail('');
      setPassword('');
    }
  };

  return (
    <>
      <button
        type="button"
        className="ghost-button auth-trigger-button"
        onClick={() => setOpen((v) => !v)}
      >
        ログイン / myYOGAカルテを保存
      </button>
      {open && (
        <div className="auth-dropdown" role="dialog">
          <div className="auth-tabs">
            <button type="button" className={mode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')}>ログイン</button>
            <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>新規登録</button>
          </div>
          <form onSubmit={handleSubmit} className="auth-form">
            <input
              type="email"
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <input
              type="password"
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={6}
            />
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" className="primary-button auth-submit" disabled={busy}>
              {busy ? '送信中…' : mode === 'signin' ? 'ログイン' : 'アカウント作成'}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
