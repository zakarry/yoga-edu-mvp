import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  onSuccess: () => void;
}

type SetupStep = 'loading' | 'scan' | 'verify' | 'error';

export default function AdminMfaSetup({ onSuccess }: Props) {
  const [step, setStep] = useState<SetupStep>('loading');
  const [qrCode, setQrCode] = useState<string>('');
  const [factorId, setFactorId] = useState<string>('');
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    void enroll();
  }, []);

  async function enroll() {
    if (!supabase) { setStep('error'); return; }
    setStep('loading');
    setErrorMsg(null);

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Yoga AI Admin',
    });

    if (error || !data) {
      setErrorMsg('MFA設定を開始できませんでした。再度お試しください。');
      setStep('error');
      return;
    }

    setQrCode(data.totp.qr_code);
    setFactorId(data.id);
    setStep('scan');
  }

  async function handleVerify() {
    if (!supabase || !factorId || code.length !== 6) return;
    setVerifying(true);
    setErrorMsg(null);

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challengeData) {
      setErrorMsg('認証コードを確認してください。');
      setVerifying(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });

    if (verifyError) {
      setErrorMsg('認証コードを確認してください。');
      setVerifying(false);
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
    maxWidth: 420,
    width: '100%',
    boxShadow: '0 2px 12px rgba(0,0,0,.08)',
  };

  if (step === 'loading') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <p style={{ textAlign: 'center', color: '#667', fontSize: 14 }}>MFA設定を準備中…</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#102542', marginBottom: 12 }}>管理者セキュリティ設定</h2>
          <p style={{ color: '#c33', fontSize: 14, marginBottom: 20 }}>{errorMsg ?? 'MFA設定を開始できませんでした。'}</p>
          <button
            onClick={() => { setCode(''); void enroll(); }}
            style={{ width: '100%', padding: '12px', background: '#102542', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#667', letterSpacing: '0.08em', marginBottom: 6 }}>管理者セキュリティ設定</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#102542', margin: 0 }}>多要素認証を設定</h2>
        </div>

        <p style={{ fontSize: 14, color: '#556', lineHeight: 1.7, marginBottom: 24 }}>
          Yoga AIの会員情報を保護するため、管理画面では多要素認証を使用します。Google Authenticator や Microsoft Authenticator などのアプリでQRコードをスキャンしてください。
        </p>

        {qrCode && (
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <img
              src={qrCode}
              alt="MFA QRコード"
              style={{ width: 180, height: 180, border: '1px solid #e0e4f0', borderRadius: 8, padding: 4 }}
            />
            <p style={{ fontSize: 12, color: '#889', marginTop: 8 }}>QRコードをAuthenticatorアプリでスキャン</p>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#445', marginBottom: 6 }}>
            アプリに表示された6桁のコード
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
          {verifying ? '確認中…' : 'MFAを有効にする'}
        </button>
      </div>
    </div>
  );
}
