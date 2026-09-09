import type { SearchItem } from '../data';

interface MyAITeacherPageProps {
  onBackHome: () => void;
  onOpenSearch: () => void;
  onOpenMyPage: () => void;
  onOpenProYoga: () => void;
  onDetail: (item: SearchItem) => void;
}

const pillars = [
  { key: 'asana', label: 'Asana', subtitle: 'アーサナ', desc: '目的や体調に合わせて、今日のポーズを選んで実践します。' },
  { key: 'pranayama', label: 'Pranayama', subtitle: '呼吸法', desc: 'ボックスブリージングなど、リズムを整える呼吸を案内します。' },
  { key: 'dhyana', label: 'Dhyana', subtitle: '瞑想', desc: '1分の静かな時間で、心を落ち着かせます。' },
] as const;

export function MyAITeacherPage({ onBackHome, onOpenSearch, onOpenMyPage, onOpenProYoga, onDetail }: MyAITeacherPageProps) {
  void onOpenSearch;
  void onDetail;
  return (
    <div className="page-shell ai-teacher-shell">
      <section className="hero-panel compact-hero ai-teacher-hero">
        <div>
          <button className="ghost-button" onClick={onBackHome}>TOPへ戻る</button>
          <span className="eyebrow">My AI Teacher</span>
          <h2>今日のヨガをAI先生と始める</h2>
          <p>あなたの目的や記録に合わせて、アーサナ・呼吸・瞑想の実践をサポートします。</p>
        </div>
      </section>

      <section className="panel ai-teacher-pillars-panel">
        <div className="section-inline-header tight">
          <h3>今日の実践を選ぶ</h3>
        </div>
        <div className="ai-teacher-pillar-grid">
          {pillars.map((p) => (
            <article key={p.key} className="ai-teacher-pillar-card">
              <span className="ai-teacher-pillar-label">{p.label}</span>
              <strong>{p.subtitle}</strong>
              <p>{p.desc}</p>
              <button type="button" className="secondary-button ai-teacher-pillar-button" disabled>
                近日公開
              </button>
            </article>
          ))}
        </div>
        <p className="ai-teacher-safety-note">
          医療診断・治療助言・痛みに対する個別処方は行いません。体調に不安がある場合は無理をせず、専門家に相談してください。
        </p>
      </section>

      <section className="panel ai-teacher-quick-links">
        <div className="section-inline-header tight">
          <h3>関連する機能</h3>
        </div>
        <div className="quick-link-grid">
          <button className="quick-link-card" onClick={onOpenMyPage}><strong>myYOGAカルテ</strong><span>実践記録と診断履歴を見る</span></button>
          <button className="quick-link-card" onClick={onOpenProYoga}><strong>Pro Yoga</strong><span>資格・検定の学習を始める</span></button>
        </div>
      </section>
    </div>
  );
}
