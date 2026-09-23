import { useState } from 'react';
import { recordConsent, CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from '../lib/consentService';
import { useAuth } from '../lib/auth';

interface ConsentGateProps {
  onAgree: () => void;
  onNavigateTerms: () => void;
  onNavigatePrivacy: () => void;
  onLogout: () => void;
}

export function ConsentGate({ onAgree, onNavigateTerms, onNavigatePrivacy, onLogout }: ConsentGateProps) {
  const auth = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAgree = async () => {
    if (!auth.user) {
      setError('認証情報が取得できません。再度ログインしてください。');
      return;
    }
    setBusy(true);
    setError(null);
    const ok = await recordConsent(auth.user.id);
    setBusy(false);
    if (ok) {
      onAgree();
    } else {
      setError('同意の保存に失敗しました。もう一度お試しください。');
    }
  };

  return (
    <div className="consent-gate-overlay">
      <div className="consent-gate-card">
        <h2 className="consent-gate-title">利用規約・プライバシーポリシーへの同意</h2>
        <p className="consent-gate-body">
          サービスをご利用いただくには、最新の利用規約およびプライバシーポリシーへのご同意が必要です。
          以下をご確認のうえ、同意して続けてください。
        </p>
        <div className="consent-gate-links">
          <button type="button" className="consent-gate-link" onClick={onNavigateTerms}>
            利用規約（v{CURRENT_TERMS_VERSION}）を見る
          </button>
          <button type="button" className="consent-gate-link" onClick={onNavigatePrivacy}>
            プライバシーポリシー（v{CURRENT_PRIVACY_VERSION}）を見る
          </button>
        </div>
        {error && <p className="consent-gate-error">{error}</p>}
        <div className="consent-gate-actions">
          <button type="button" className="primary-button consent-gate-agree" onClick={handleAgree} disabled={busy}>
            {busy ? '保存中…' : '同意して続ける'}
          </button>
          <button type="button" className="ghost-button consent-gate-decline" onClick={onLogout} disabled={busy}>
            同意せずログアウト
          </button>
        </div>
      </div>
    </div>
  );
}
