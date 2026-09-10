import { useEffect, useState } from 'react';
import { useAuth, OAUTH_PROVIDERS } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';

interface AuthPanelProps {
  onOpenMyPage: () => void;
  openSignal?: number;
}

type OAuthId = 'google' | 'apple' | 'line';

const OAUTH_ORDER: OAuthId[] = ['google', 'apple', 'line'];

const OAUTH_SVGS: Record<OAuthId, React.ReactElement> = {
  google: (
    <svg className="oauth-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  ),
  apple: (
    <svg className="oauth-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="#000" d="M17.05 12.04c-.03-2.62 2.14-3.87 2.24-3.94-1.22-1.79-3.12-2.04-3.79-2.07-1.61-.16-3.16.95-3.98.95-.83 0-2.09-.93-3.44-.9-1.77.03-3.42 1.03-4.34 2.62-1.85 3.22-.47 7.98 1.33 10.59.88 1.28 1.93 2.72 3.29 2.67 1.32-.05 1.82-.85 3.42-.85 1.59 0 2.05.85 3.45.82 1.43-.03 2.33-1.31 3.2-2.6 1.01-1.49 1.43-2.94 1.45-3.02-.03-.01-2.77-1.06-2.8-4.22zM14.2 4.46c.73-.88 1.22-2.11 1.09-3.33-1.05.04-2.32.7-3.07 1.58-.67.78-1.26 2.03-1.1 3.23 1.17.09 2.36-.59 3.08-1.48z"/>
    </svg>
  ),
  line: (
    <svg className="oauth-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="#06C755" d="M12 1C5.37 1 0 5.27 0 10.5c0 4.7 4.29 8.64 10.09 9.38.39.08.93.25 1.07.57.12.29.08.74.04 1.03l-.17 1.03c-.05.3-.25 1.16 1.07.63s7.25-4.27 9.9-7.32C23.5 14.5 24 12.56 24 10.5 24 5.27 18.63 1 12 1z"/>
      <path fill="#fff" d="M19.5 10.5h-1.2v-3.6h.6c.33 0 .6-.27.6-.6s-.27-.6-.6-.6h-3.6c-.33 0-.6.27-.6.6s.27.6.6.6h.6v3.6h-3.6v-3.6h.6c.33 0 .6-.27.6-.6s-.27-.6-.6-.6h-3.6c-.33 0-.6.27-.6.6s.27.6.6.6h.6v3.6H8.7v-3.6h.6c.33 0 .6-.27.6-.6s-.27-.6-.6-.6H5.7c-.33 0-.6.27-.6.6s.27.6.6.6h.6v3.6H5.1c-.33 0-.6.27-.6.6s.27.6.6.6h14.4c.33 0 .6-.27.6-.6s-.27-.6-.6-.6z"/>
    </svg>
  ),
};

export function AuthPanel({ onOpenMyPage, openSignal = 0 }: AuthPanelProps) {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

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

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setBusy(true);
    setError(null);
    const { error: err } = await auth.signInWithOAuth(provider);
    setBusy(false);
    if (err) setError(err);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup' && password.length < 8) {
      setError('パスワードは8文字以上でご入力ください。');
      return;
    }
    setBusy(true);
    setError(null);
    const fn = mode === 'signin' ? auth.signIn : auth.signUp;
    const { error: err } = await fn(email, password);
    setBusy(false);
    if (mode === 'signup') {
      // Always the same response, whether or not the address already has an
      // account, so this form cannot be used to discover who is registered.
      setError('ご登録を受け付けました。ログイン画面からお進みください。');
      setMode('signin');
      return;
    }
    if (err) {
      setError(err);
    } else {
      setOpen(false);
      setEmail('');
      setPassword('');
    }
  };

  const enabledProviders = OAUTH_ORDER.filter((id) => OAUTH_PROVIDERS[id].enabled);
  const disabledProviders = OAUTH_ORDER.filter((id) => !OAUTH_PROVIDERS[id].enabled);

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
          <div className="auth-welcome">
            <h3>Yoga AIをはじめる</h3>
            <p>登録もログインも同じ入口です</p>
          </div>
          {enabledProviders.length > 0 && (
            <div className="oauth-buttons">
              {enabledProviders.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`oauth-button oauth-${id}`}
                  onClick={() => handleOAuth(id as 'google' | 'apple')}
                  disabled={busy}
                >
                  {OAUTH_SVGS[id]}
                  {OAUTH_PROVIDERS[id].label}
                </button>
              ))}
            </div>
          )}
          {disabledProviders.length > 0 && (
            <div className="oauth-buttons">
              {disabledProviders.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`oauth-button oauth-${id} oauth-disabled`}
                  disabled
                >
                  {OAUTH_SVGS[id]}
                  <span>{OAUTH_PROVIDERS[id].label}</span>
                  <span className="oauth-coming-soon">準備中</span>
                </button>
              ))}
            </div>
          )}
          <div className="auth-divider">
            <span>または</span>
          </div>
          {!showEmailForm ? (
            <button
              type="button"
              className="oauth-button oauth-email"
              onClick={() => setShowEmailForm(true)}
            >
              メールアドレスで続ける
            </button>
          ) : (
            <>
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
                  minLength={mode === 'signin' ? 6 : 8}
                />
                {error && <p className="auth-error">{error}</p>}
                <button type="submit" className="primary-button auth-submit" disabled={busy}>
                  {busy ? '送信中…' : mode === 'signin' ? 'ログイン' : 'アカウント作成'}
                </button>
              </form>
            </>
          )}
          {error && !showEmailForm && <p className="auth-error">{error}</p>}
        </div>
      )}
    </>
  );
}
