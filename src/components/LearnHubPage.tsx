import { PageHeader, SectionToc } from './PageHeader';

interface LearnHubPageProps {
  onBackHome: () => void;
  onOpenProYoga: () => void;
  onOpenBoxBreathing: () => void;
  onOpenBreathingMeditation: () => void;
  onOpenAITeacher: () => void;
  onOpenSacredSites: () => void;
}

export function LearnHubPage({
  onBackHome,
  onOpenProYoga,
  onOpenBoxBreathing,
  onOpenBreathingMeditation,
  onOpenAITeacher,
  onOpenSacredSites,
}: LearnHubPageProps) {
  return (
    <div className="page-shell learn-hub-page">
      <PageHeader
        eyebrow="学び・検定"
        title="学び・検定"
        subtitle="学ぶ・資格を取る・実践する。実践から理解へつなぐ学びの総合入口です。"
        onBackHome={onBackHome}
      />
      <SectionToc items={[
        { id: 'learn-knowledge', label: 'Yoga Knowledge' },
        { id: 'learn-cert', label: '資格・検定' },
        { id: 'learn-practice', label: '今日から実践' },
        { id: 'learn-sacred', label: 'ヨガの聖地と文化' },
      ]} />

      {/* A. Yoga Knowledge */}
      <section id="learn-knowledge" className="panel learn-hub-section">
        <div className="section-inline-header">
          <h3>Yoga Knowledge</h3>
        </div>
        <div className="top-knowledge-grid">
          <a className="top-knowledge-card" href="https://yogaorg.jp/yoga_zukan/" target="_blank" rel="noopener noreferrer">
            <span className="top-knowledge-icon">📖</span>
            <strong>ヨガ図鑑</strong>
            <p>ヨガの哲学、人体、指導、アーサナ、呼吸、瞑想まで。体系的に理解するための知識ライブラリ。</p>
            <span className="top-knowledge-cta">ヨガ図鑑を見る →</span>
          </a>
        </div>
      </section>

      {/* B. 資格・検定 */}
      <section id="learn-cert" className="panel learn-hub-section">
        <div className="section-inline-header">
          <h3>資格・検定</h3>
        </div>
        <div className="top-learning-grid">
          <div className="top-learning-group">
            <h4>一般向け</h4>
            <a className="top-learning-item" href="https://yogaorg.jp/exam/index.html" target="_blank" rel="noopener noreferrer">ヨガ検定3級</a>
            <a className="top-learning-item" href="https://mem.yogaorg.jp/ent/e/Sw8T5uAYnpjxcEdm/" target="_blank" rel="noopener noreferrer">ヨガ検定3級 申込</a>
            <a className="top-learning-item" href="https://yogaorg.jp/breathing/" target="_blank" rel="noopener noreferrer">呼吸マネージャー検定 教科書</a>
            <a className="top-learning-item" href="https://breathing-manager-ce-rktk.bolt.host/" target="_blank" rel="noopener noreferrer">呼吸マネージャー検定 Bolt版</a>
          </div>
          <div className="top-learning-group">
            <h4>深く学ぶ</h4>
            <span className="top-learning-item top-learning-item-disabled">ヨガ検定2級（準備中）</span>
          </div>
          <div className="top-learning-group">
            <h4>指導者向け</h4>
            <a className="top-learning-item" href="https://proyogakentei.com/" target="_blank" rel="noopener noreferrer">プロフェッショナルYoga検定</a>
            <a className="top-learning-item" href="https://proyogakentei.com/what/" target="_blank" rel="noopener noreferrer">プロフェッショナルYoga検定とは</a>
            <button className="top-learning-item" onClick={onOpenProYoga}>Pro Yoga 認定ページ</button>
          </div>
        </div>
        <p className="learn-hub-note">
          プロフェッショナルYoga検定は、全日本ヨガ連盟の組織系統にあるヨガ検定協会が実施する認定です。
          試験実施主体の独立性を保ちつつ、学び・検定の導線からアクセスできます。
        </p>
      </section>

      {/* C. 今日から実践 */}
      <section id="learn-practice" className="panel learn-hub-section">
        <div className="section-inline-header">
          <h3>今日から実践</h3>
        </div>
        <div className="top-daily-grid">
          <button className="top-daily-card" onClick={onOpenBoxBreathing}>
            <span className="top-daily-time">2分</span>
            <strong>呼吸（Box Breathing）</strong>
            <span>4秒吸う・止める・吐く・止める</span>
          </button>
          <button className="top-daily-card" onClick={onOpenBreathingMeditation}>
            <span className="top-daily-time">5分</span>
            <strong>呼吸＋瞑想</strong>
            <span>呼吸3分＋短い瞑想2分</span>
          </button>
          <button className="top-daily-card" onClick={onOpenAITeacher}>
            <span className="top-daily-time">AI</span>
            <strong>My AI Teacher</strong>
            <span>AI先生と呼吸・ヨガを学ぶ</span>
          </button>
        </div>
      </section>

      {/* D. ヨガの聖地と文化 */}
      <section id="learn-sacred" className="panel learn-hub-section">
        <div className="section-inline-header">
          <h3>ヨガの聖地と文化</h3>
        </div>
        <button className="top-daily-card" onClick={onOpenSacredSites}>
          <strong>ヨガの聖地と文化を見る</strong>
          <span>聖地や文化を知ることで、実践がより深くなります</span>
        </button>
      </section>
    </div>
  );
}
