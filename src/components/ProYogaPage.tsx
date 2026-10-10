import { useState } from 'react';
import { TopBackLink } from './TopBackLink';
import { useAuth } from '../lib/auth';
import { startProYogaLearning } from '../services/proYogaService';

interface ProYogaPageProps {
  onStartDiagnosis: () => void;
  onBackHome: () => void;
  onOpenDrill: () => void;
}

export function ProYogaPage({ onStartDiagnosis, onBackHome, onOpenDrill }: ProYogaPageProps) {
  const auth = useAuth();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const handleStartLearning = async () => {
    if (!auth.user) return;
    setStarting(true);
    setStartError(null);
    const { error } = await startProYogaLearning(auth.user.id);
    setStarting(false);
    if (error) { setStartError(error); return; }
    setStarted(true);
  };
  return (
    <div className="page-shell pro-yoga-page">
      <section className="hero-panel federation-hero pro-yoga-hero">
        <div>
          <TopBackLink onBackHome={onBackHome} />
          <span className="eyebrow">Professional Yoga Certification</span>
          <h2>プロフェッショナル<wbr /><span className="pro-yoga-title-tail">Yoga検定とは</span></h2>
          <p>
            ヨガ指導者や指導者を目指す方のための学び・検定です。ヨガの知識を学び、指導に生かすための理解を深めましょう。
          </p>
        </div>
      </section>

      <div className="feature-showcase pro-yoga-benefits">
        <section className="panel">
          <h3>学びを指導に生かす</h3>
          <ul className="check-list">
            <li>ヨガの知識を体系的に学ぶ</li>
            <li>指導に必要な理解を深める</li>
            <li>学んだ内容をドリルで復習する</li>
            <li>資格情報を確認して次の学びを選ぶ</li>
          </ul>
        </section>
        <section className="panel">
          <h3>検定について知る・学ぶ</h3>
          <div className="status-card gold-accent">
            <strong>公式の検定情報を確認する</strong>
            <p>受験条件や資格の詳細は、プロフェッショナルYoga検定の公式サイトをご確認ください。</p>
          <a className="secondary-button" href="https://proyogakentei.com/" target="_blank" rel="noopener noreferrer">公式サイトを見る</a>
          </div>
          <div className="status-card soft-green">
            <strong>公式ガイドブックで学ぶ</strong>
            <p>公式教科書 全11章・234項目を図鑑形式で収録。AIドリルで弱点を優先的に復習し、合格を後押しします。</p>
            <button className="secondary-button" onClick={onOpenDrill} style={{ marginTop: '10px' }}>
              ヨガAIドリルを始める
            </button>
          </div>
        </section>
      </div>

      <section className="panel pro-yoga-cta-panel">
        <div className="pro-yoga-cta-copy">
          <h3>次の一歩を確認する</h3>
          <p>自分に合うヨガを知りたい方はAI診断へ。指導者向けの学習を続けたい方は、学習を始めましょう。</p>
        </div>
        <div className="hero-actions pro-yoga-mobile-actions">
          <button className="secondary-button" onClick={onStartDiagnosis}>無料診断を始める</button>
          {!auth.user ? (
            <>
              <p className="pro-yoga-login-hint">学習履歴を保存するにはログインしてください</p>
              <button className="gold-button" disabled>学習を始める</button>
            </>
          ) : auth.profile?.role === 'teacher' || auth.profile?.role === 'both' ? (
            started ? (
              <button className="gold-button" disabled>学習を開始しました</button>
            ) : (
              <button className="gold-button" onClick={handleStartLearning} disabled={starting}>
                {starting ? '処理中…' : '学習を始める'}
              </button>
            )
          ) : (
            <p className="pro-yoga-student-hint">
              プロフェッショナルYoga検定は、ヨガ指導者・指導者を目指す方向けです。
            </p>
          )}
          {startError && <p className="auth-unavailable-text">{startError}</p>}
        </div>
      </section>
    </div>
  );
}
