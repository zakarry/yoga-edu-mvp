import { TopBackLink } from './TopBackLink';

type SiteData = {
  name: string;
  region: string;
  description: string;
  image: string;
  imageAlt: string;
  credit: string;
  creditUrl: string;
};

const japanSites: SiteData[] = [
  {
    name: '西之表市',
    region: '鹿児島・種子島',
    description:
      '鉄砲伝来の地として知られる歴史性を持ち、日本が外の文化や技術と出会った象徴的な土地です。海と風を感じる環境の中で、歴史と新しい学びの交差点としてヨガ文化の文脈を重ねやすい場所として紹介しています。',
    image:
      'https://commons.wikimedia.org/wiki/Special:FilePath/%E6%B5%A6%E7%94%B0%E6%B5%B7%E6%B0%B4%E6%B5%B4%E5%A0%B4_(9739915363).jpg?width=960',
    imageAlt: '鹿児島県西之表市の浦田海水浴場の風景',
    credit: '浦田海水浴場 / over hilowsee / CC BY-SA 2.0',
    creditUrl:
      'https://commons.wikimedia.org/wiki/File:%E6%B5%A6%E7%94%B0%E6%B5%B7%E6%B0%B4%E6%B5%B4%E5%A0%B4_(9739915363).jpg',
  },
  {
    name: '東京スカイツリー',
    region: '東京都',
    description:
      '高さ634mを誇る世界最大級の電波塔で、東京のシンボルとして親しまれています。展望デッキからは街並みが一望でき、現代的なランドマークとして都市型ヨガやウェルネスの発信拠点としても親しみやすい存在です。',
    image:
      'https://images.pexels.com/photos/20378132/pexels-photo-20378132.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    imageAlt: '青空を背景にそびえ立つ東京スカイツリーの空撮',
    credit: 'Photo: Rin Gakusho / Pexels',
    creditUrl: 'https://www.pexels.com/photo/20378132/',
  },
  {
    name: '久高島',
    region: '沖縄県南城市',
    description:
      '沖縄県南城市の久高島は、琉球の創世神アマミキヨが最初に降り立ったと伝わる「神の島」。琉球王国時代から祈りの場とされ、現在も島の祭祀や年中行事が受け継がれています。クボー御嶽など立ち入りのできない聖域もあり、訪れる際は島の暮らしと信仰を尊重することが大切です。',
    image:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Kudakajimacoast-dec2012.jpg?width=960',
    imageAlt: '沖縄県久高島の海岸線の風景',
    credit: 'Kudakajimacoast-dec2012 / Nesnad / CC BY-SA 3.0',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:Kudakajimacoast-dec2012.jpg',
  },
];

const worldSites: SiteData[] = [
  {
    name: 'Rishikesh',
    region: 'インド',
    description:
      'ガンジス川沿いに広がる代表的なヨガの聖地で、アシュラム文化や呼吸法・瞑想の伝統に触れやすい場所です。学びと内省を重ねたい実践者が世界中から集まります。',
    image:
      'https://images.pexels.com/photos/6157502/pexels-photo-6157502.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    imageAlt: 'リシケシのガンジス川沿いでヨガのポーズをとる人物',
    credit: 'Photo: Dvine Yoga / Pexels',
    creditUrl: 'https://www.pexels.com/photo/6157502/',
  },
  {
    name: 'Mysore',
    region: 'インド',
    description:
      '伝統的なアシュタンガヨガの拠点として知られ、毎日の積み重ねを大切にする実践文化が息づく街です。落ち着いた生活の中で深い練習に向き合えます。',
    image:
      'https://images.pexels.com/photos/34962788/pexels-photo-34962788.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    imageAlt: 'マイソール宮殿の精巧な建築と緑豊かな庭園',
    credit: 'Photo: Sachin Shettigar / Pexels',
    creditUrl: 'https://www.pexels.com/photo/34962788/',
  },
  {
    name: 'Bali',
    region: 'インドネシア',
    description:
      '自然、癒やし、国際交流が重なる人気のリトリートエリアです。初心者から指導者層まで幅広く受け入れる空気があり、滞在型でヨガ文化に親しめます。',
    image:
      'https://images.pexels.com/photos/35428411/pexels-photo-35428411.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    imageAlt: 'バリの熱帯林に囲まれた緑豊かな棚田の空撮',
    credit: 'Photo: Tom Fisk / Pexels',
    creditUrl: 'https://www.pexels.com/photo/35428411/',
  },
  {
    name: 'Sedona',
    region: 'アメリカ',
    description:
      '赤い岩山の景観と精神性の高い旅先として語られることが多く、瞑想や自己対話、心身を整える体験と相性の良い場所です。',
    image:
      'https://images.pexels.com/photos/26867471/pexels-photo-26867471.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    imageAlt: 'セドナの赤い岩山が夕日に照らされる風景',
    credit: 'Photo: Allen Boguslavsky / Pexels',
    creditUrl: 'https://www.pexels.com/photo/26867471/',
  },
];

function SacredSiteCard({
  name,
  region,
  description,
  image,
  imageAlt,
  credit,
  creditUrl,
  featured = false,
}: SiteData & { featured?: boolean }) {
  return (
    <article className={featured ? 'sacred-site-card featured-japan-site' : 'sacred-site-card'}>
      <div className="sacred-site-image">
        <img src={image} alt={imageAlt} loading="lazy" />
        <a
          className="sacred-site-credit"
          href={creditUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {credit}
        </a>
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
            日本の中でヨガ文化の文脈を感じられる場所と、世界で広く知られるヨガ・瞑想・ウェルネス文化の拠点を、文化的な文脈とともに一覧で紹介するページです。
          </p>
        </div>
        <div className="status-card gold-accent sacred-sites-summary">
          <strong>将来拡張を見据えた紹介ページ</strong>
          <p>各カードは今後、詳細記事や特集ページへ遷移できる構成を想定しています。現時点では一覧UIのみの実装です。</p>
        </div>
      </section>

      <section className="panel sacred-section sacred-section-featured">
        <div className="section-inline-header tight sacred-section-header">
          <div>
            <span className="result-step-badge gold">SECTION 1</span>
            <h3>日本のヨガの聖地</h3>
            <p className="result-section-copy">日本ならではの自然・都市・歴史・精神文化の文脈を感じられる場所を、少し強調したトーンで紹介します。</p>
          </div>
        </div>
        <div className="sacred-site-grid featured-grid">
          {japanSites.map((site) => (
            <SacredSiteCard key={site.name} {...site} featured />
          ))}
        </div>
      </section>

      <section className="panel sacred-section">
        <div className="section-inline-header tight sacred-section-header">
          <div>
            <span className="result-step-badge">SECTION 2</span>
            <h3>世界のヨガの聖地</h3>
            <p className="result-section-copy">世界で広く知られるヨガ・瞑想・ウェルネス文化の拠点を、やわらかく比較しながら見られる一覧です。</p>
          </div>
        </div>
        <div className="sacred-site-grid">
          {worldSites.map((site) => (
            <SacredSiteCard key={site.name} {...site} />
          ))}
        </div>
      </section>
    </div>
  );
}
