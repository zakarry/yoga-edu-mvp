import { TopBackLink } from './TopBackLink';

interface ProYogaPageProps {
  onStartDiagnosis: () => void;
  onBackHome: () => void;
  onOpenDrill: () => void;
}

export function ProYogaPage({ onStartDiagnosis, onBackHome, onOpenDrill }: ProYogaPageProps) {
  return (
    <div className="page-shell pro-yoga-page">
      <section className="hero-panel federation-hero pro-yoga-hero">
        <div>
          <TopBackLink onBackHome={onBackHome} />
          <span className="eyebrow">Professional Yoga Certification</span>
          <h2>プロフェッショナルYoga検定とは</h2>
          <p>
            指導品質・教育理解・現場実装力を可視化するための認定イメージページです。MVPでは、先生・スクール向けの信頼向上導線として、取得者・対応スクールを検索優遇や認定バッジ表示で表現しています。
          </p>
        </div>
      </section>

      <div className="feature-showcase pro-yoga-benefits">
        <section className="panel">
          <h3>先生・スクールにとってのメリット</h3>
          <ul className="check-list">
            <li>検索・おすすめ結果での優遇表示</li>
            <li>認定バッジ風UIでの信頼強化</li>
            <li>イベント登壇候補としての訴求強化</li>
            <li>教育プラットフォーム上での専門性の見える化</li>
          </ul>
        </section>
        <section className="panel">
          <h3>取得後の見せ方</h3>
          <div className="status-card gold-accent">
            <strong>検索優遇 / 認定バッジ / イベント登壇優先</strong>
            <p>MVP上では、Pro Yoga 対応をゴールドの認定ラベルで表現しています。</p>
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
          <p>スマホでも見やすい形で、診断導線と受験導線をまとめています。興味があればここから次のアクションに進めます。</p>
        </div>
        <div className="hero-actions pro-yoga-mobile-actions">
          <button className="secondary-button" onClick={onStartDiagnosis}>無料診断を始める</button>
          <button className="gold-button">受験申込ボタン</button>
        </div>
      </section>
    </div>
  );
}
