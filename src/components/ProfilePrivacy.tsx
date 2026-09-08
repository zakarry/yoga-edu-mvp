import { useState } from 'react';
import { useAuth, type PrivacySettings } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';

const privacyItems: Array<{
  key: keyof PrivacySettings;
  label: string;
  description: string;
}> = [
  { key: 'save_diagnosis', label: 'AI診断を保存する', description: '診断結果をクラウドに保存し、別の端末からも見返せるようにします。' },
  { key: 'save_practice_history', label: '実践履歴を保存する', description: 'アーサナ・呼吸法・瞑想の実践記録をクラウドに保存します。' },
  { key: 'allow_ai_memory', label: 'AI先生に好みを記憶させる', description: 'AI先生があなたの好みや傾向を記憶し、より合った提案ができるようにします。' },
  { key: 'allow_teacher_sharing', label: 'リアル先生との共有を許可する', description: 'ONにしても現段階で自動共有は行いません。将来、あなたが確認したタイミングでのみ共有します。' },
  { key: 'allow_sensitive_data_storage', label: '身体状態などセンシティブ情報の保存を許可する', description: '痛み・けが・妊娠・既往症などの情報をクラウドに保存することを許可します。' },
];

export function ProfileSection() {
  const auth = useAuth();
  const [displayName, setDisplayName] = useState(auth.profile?.display_name ?? '');
  const [role, setRole] = useState(auth.profile?.role ?? 'student');
  const [area, setArea] = useState(auth.profile?.area ?? '');
  const [saved, setSaved] = useState(false);

  if (!isSupabaseConfigured) {
    return (
      <section className="panel mypage-section">
        <h3>プロフィール</h3>
        <p className="auth-unavailable-text">現在クラウド保存を利用できません。</p>
      </section>
    );
  }

  if (!auth.user) {
    return (
      <section className="panel mypage-section">
        <h3>プロフィール</h3>
        <p>クラウドにプロフィールを保存するには、ログインが必要です。</p>
      </section>
    );
  }

  const handleSave = async () => {
    const { error } = await auth.updateProfile({
      display_name: displayName || null,
      role: role as 'student' | 'teacher' | 'both',
      area: area || null,
    });
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  return (
    <section className="panel mypage-section">
      <div className="section-inline-header tight">
        <h3>プロフィール</h3>
      </div>
      <div className="profile-form-grid">
        <label className="profile-field">
          <span>表示名</span>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="ニックネーム" />
        </label>
        <label className="profile-field">
          <span>ロール</span>
          <select value={role} onChange={(e) => setRole(e.target.value as 'student' | 'teacher' | 'both')}>
            <option value="student">生徒</option>
            <option value="teacher">先生</option>
            <option value="both">生徒兼先生</option>
          </select>
        </label>
        <label className="profile-field">
          <span>エリア</span>
          <input type="text" value={area} onChange={(e) => setArea(e.target.value)} placeholder="渋谷、オンラインなど" />
        </label>
      </div>
      <div className="hero-actions">
        <button type="button" className="secondary-button" onClick={handleSave}>保存</button>
        {saved && <span className="profile-saved-badge">保存しました</span>}
      </div>
    </section>
  );
}

export function PrivacySection() {
  const auth = useAuth();
  const [saving, setSaving] = useState(false);

  if (!isSupabaseConfigured) {
    return (
      <section className="panel mypage-section">
        <h3>Yoga Memory設定</h3>
        <p className="auth-unavailable-text">現在クラウド保存を利用できません。</p>
      </section>
    );
  }

  if (!auth.user || !auth.privacy) {
    return (
      <section className="panel mypage-section">
        <h3>Yoga Memory設定</h3>
        <p>クラウド保存の許可設定を利用するには、ログインが必要です。</p>
      </section>
    );
  }

  const toggle = async (key: keyof PrivacySettings) => {
    setSaving(true);
    await auth.updatePrivacy({ [key]: !auth.privacy![key] });
    setSaving(false);
  };

  return (
    <section className="panel mypage-section">
      <div className="section-inline-header tight">
        <h3>Yoga Memory設定</h3>
        <p>何をクラウドに保存するか、あなた自身が選択できます。デフォルトはすべてOFFです。</p>
      </div>
      <div className="privacy-toggle-list">
        {privacyItems.map((item) => (
          <label key={item.key} className="privacy-toggle-row">
            <div className="privacy-toggle-text">
              <strong>{item.label}</strong>
              <p>{item.description}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={auth.privacy![item.key] ? 'true' : 'false'}
              className={`toggle-switch ${auth.privacy![item.key] ? 'on' : ''}`}
              disabled={saving}
              onClick={() => toggle(item.key)}
            >
              <span className="toggle-knob" />
            </button>
          </label>
        ))}
      </div>
    </section>
  );
}
