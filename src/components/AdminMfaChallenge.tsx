import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  onSuccess: () => void;
}

export default function AdminMfaChallenge({ onSuccess }: Props) {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    void startChallenge();
  }, []);

  async function startChallenge() {
    if (!supabase) { setLoadError(true); return; }
    setErrorMsg(null);

    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError || !factors?.totp?.length) {
      setLoadError(true);
      return;
    }

    const factor = factors.totp[0];
    setFactorId(factor.id);

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
    if (challengeError || !challengeData) {
      setLoadError(true);
      return;
    }

    setChallengeId(challengeData.id);
  }

  async function handleVerify() {
    if (!supabase || !factorId || !challengeId || code.length !== 6) return;
    setVerifying(true);
    setErrorMsg(null);

    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });

    if (error) {
      setErrorMsg('認証コードを確認してください。');
      setVerifying(false);
      void startChallenge();
      return;
    }

    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalData?.currentLevel === 'aal2') {
      onSuccess();
    } else {
      setErrorMsg('追加認証は完了しましたが、セッションを更新できませんでした。ページを再読み込みしてください。');
      setVerifying(false);
    }
  }

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#f4f7fb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 20px',
  };

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 16,
    padding: '36px 32px',
    maxWidth: 400,
    width: '100%',
    boxShadow: '0 2px 12px rgba(0,0,0,.08)',
  };

  if (loadError) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#102542', marginBottom: 12 }}>管理者認証</h2>
          <p style={{ color: '#c33', fontSize: 14, marginBottom: 20 }}>認証の準備に失敗しました。再度ページを読み込んでください。</p>
        </div>
      </div>
    );
  }

  if (!challengeId) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <p style={{ textAlign: 'center', color: '#667', fontSize: 14 }}>認証を準備中…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#667', letterSpacing: '0.08em', marginBottom: 6 }}>管理者認証</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#102542', margin: 0 }}>追加認証</h2>
        </div>

        <p style={{ fontSize: 14, color: '#556', lineHeight: 1.7, marginBottom: 28 }}>
          Authenticatorアプリに表示されている6桁のコードを入力してください。
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#445', marginBottom: 6 }}>
            認証コード
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={(e) => e.key === 'Enter' && !verifying && code.length === 6 && void handleVerify()}
            placeholder="000000"
            autoFocus
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '1px solid #ccd',
              borderRadius: 8,
              fontSize: 22,
              letterSpacing: '0.25em',
              textAlign: 'center',
              color: '#102542',
              fontWeight: 700,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {errorMsg && (
          <p style={{ color: '#c33', fontSize: 13, marginBottom: 12 }}>{errorMsg}</p>
        )}

        <button
          onClick={() => void handleVerify()}
          disabled={verifying || code.length !== 6}
          style={{
            width: '100%',
            padding: '13px',
            background: code.length === 6 && !verifying ? '#102542' : '#c0c8d8',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: code.length === 6 && !verifying ? 'pointer' : 'default',
            transition: 'background 0.2s',
          }}
        >
          {verifying ? '確認中…' : '認証する'}
        </button>
      </div>
    </div>
  );
}
