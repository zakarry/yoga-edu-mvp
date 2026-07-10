import { TopBackLink } from './TopBackLink';

const worldSites = [
  {
    name: 'Rishikesh',
    region: 'インド',
    description:
      'ガンジス川沿いに広がる代表的なヨガの聖地で、アシュラム文化や呼吸法・瞑想の伝統に触れやすい場所です。学びと内省を重ねたい実践者が世界中から集まります。',
  },
  {
    name: 'Mysore',
    region: 'インド',
    description:
      '伝統的なアシュタンガヨガの拠点として知られ、毎日の積み重ねを大切にする実践文化が息づく街です。落ち着いた生活の中で深い練習に向き合えます。',
  },
  {
    name: 'Bali',
    region: 'インドネシア',
    description:
      '自然、癒やし、国際交流が重なる人気のリトリートエリアです。初心者から指導者層まで幅広く受け入れる空気があり、滞在型でヨガ文化に親しめます。',
  },
  {
    name: 'Sedona',
    region: 'アメリカ',
    description:
      '赤い岩山の景観と精神性の高い旅先として語られることが多く、瞑想や自己対話、心身を整える体験と相性の良い場所です。',
  },
];

const japanSites = [
  {
    name: '西之表市',
    region: '鹿児島・種子島',
    description:
      '鉄砲伝来の地として知られる歴史性を持ち、日本が外の文化や技術と出会った象徴的な土地です。海と風を感じる環境の中で、歴史と新しい学びの交差点としてヨガ文化の文脈を重ねやすい場所として紹介しています。',
  },
  {
    name: '東京スカイツリー周辺',
    region: '東京都',
    description:
      '都市の象徴性とアクセス性を備え、イベント、発信、国際交流と結びつけやすい現代的なウェルネス拠点です。観光導線とも重なり、都市型ヨガ文化の広がりを表現しやすいエリアです。',
  },
  {
    name: '久高島',
    region: '沖縄県南城市',
    description:
      '祈りや静けさのイメージと結びつきやすく、内省的な体験やリトリートの文脈に重ねやすい場所です。自然と精神文化の近さを感じながら、自分の内側に向き合う時間を想起させます。',
  },
];

function SacredSiteCard({
  name,
  region,
  description,
  featured = false,
}: {
  name: string;
  region: string;
  description: string;
  featured?: boolean;
}) {
  return (
    <article className={featured ? 'sacred-site-card featured-japan-site' : 'sacred-site-card'}>
      <div className="sacred-site-image" aria-hidden="true">
        <span>{featured ? 'Japan Sacred Site' : 'Sacred Site'}</span>
      </div>
      <div className="sacred-site-copy">
        {featured && <span className="sacred-site-badge">注目の日本の聖地</span>}
        <h3>{name}</h3>
        <p className="sacred-site-region">{region}</p>
        <p>{description}</p>
        <div className="sacred-site-actions">
          <button type="button" className="secondary-button sacred-site-link" disabled>
            詳しく見る
          </button>
          <span className="sacred-site-future-note">詳細ページ準備中</span>
        </div>
      </div>
    </article>
  );
}

export function SacredSitesPage({ onBackHome }: { onBackHome: () => void }) {
  return (
    <div className="page-shell sacred-sites-page">
      <section className="hero-panel sacred-sites-hero">
        <div>
          <TopBackLink onBackHome={onBackHome} />
          <span className="eyebrow">Yoga Culture</span>
          <h2>ヨガの聖地と文化</h2>
          <p>
            世界の代表的なヨガの聖地と、日本の中で今後さらに注目される可能性がある場所を、文化的な文脈とともに一覧で紹介するページです。
          </p>
        </div>
        <div className="status-card gold-accent sacred-sites-summary">
          <strong>将来拡張を見据えた紹介ページ</strong>
          <p>各カードは今後、詳細記事や特集ページへ遷移できる構成を想定しています。現時点では一覧UIのみの実装です。</p>
        </div>
      </section>

      <section className="panel sacred-section">
        <div className="section-inline-header tight sacred-section-header">
          <div>
            <span className="result-step-badge">SECTION 1</span>
            <h3>世界のヨガ聖地</h3>
            <p className="result-section-copy">世界で広く知られるヨガ・瞑想・ウェルネス文化の拠点を、やわらかく比較しながら見られる一覧です。</p>
          </div>
        </div>
        <div className="sacred-site-grid">
          {worldSites.map((site) => (
            <SacredSiteCard key={site.name} {...site} />
          ))}
        </div>
      </section>

      <section className="panel sacred-section sacred-section-featured">
        <div className="section-inline-header tight sacred-section-header">
          <div>
            <span className="result-step-badge gold">SECTION 2</span>
            <h3>日本のヨガ聖地</h3>
            <p className="result-section-copy">日本ならではの自然・都市・歴史・精神文化の文脈を感じられる場所を、少し強調したトーンで紹介します。</p>
          </div>
        </div>
        <div className="sacred-site-grid featured-grid">
          {japanSites.map((site) => (
            <SacredSiteCard key={site.name} {...site} featured />
          ))}
        </div>
      </section>
    </div>
  );
}
