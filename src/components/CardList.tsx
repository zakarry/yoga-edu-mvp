import { SearchItem } from '../data';

interface CardListProps {
  title: string;
  items: SearchItem[];
  onDetail?: (item: SearchItem) => void;
  emptyMessage?: string;
  variant?: 'default' | 'prioritySchool';
  stepLabel?: string;
  description?: string;
}

type CardBadge = {
  key: string;
  label: string;
  tone: 'gold' | 'blue' | 'navy' | 'green' | 'purple';
};

const typeLabel: Record<SearchItem['type'], string> = {
  school: 'スクール',
  teacher: '先生',
  event: 'イベント',
  club: 'ヨガクラブ',
};

const foreignLabel = (item: SearchItem) => {
  if (item.type === 'teacher' || item.type === 'school') return item.foreignSupportStatus;
  return item.foreignParticipantStatus;
};

const tagsOf = (item: SearchItem) => {
  if (item.type === 'teacher') return [...item.specialties, ...item.formats].slice(0, 5);
  if (item.type === 'school') return [...item.programs, ...item.strengths].slice(0, 5);
  if (item.type === 'event') return [...item.eventTypes, ...item.contentTags].slice(0, 5);
  return [...item.clubTypes, ...item.activities].slice(0, 5);
};

const isProYoga = (item: SearchItem) => {
  if (item.type === 'teacher') return item.proYogaStatus.includes('取得');
  if (item.type === 'school') return item.proYogaSupported;
  if (item.type === 'event') return item.contentTags.includes('プロYoga');
  return item.activities.some((value) => value.includes('プロYoga'));
};

const isForeignFriendly = (item: SearchItem) => !foreignLabel(item).includes('不可');

const supportsEnglish = (item: SearchItem) => item.languages.includes('英語');

const isBeginnerFriendly = (item: SearchItem) => {
  if (item.type === 'teacher') return item.targetLevels.includes('初心者');
  if (item.type === 'school') return item.strengths.includes('初心者に強い') || item.programs.includes('体験レッスン');
  if (item.type === 'event') return item.eventTypes.includes('体験会') || item.description.includes('初心者');
  return item.description.includes('初心者');
};

const supportsCertification = (item: SearchItem) => {
  if (item.type === 'teacher') {
    return item.specialties.includes('資格対策') || item.certifications.some((value) => /RYT|認定|講師|ファシリテーター/.test(value));
  }
  if (item.type === 'school') {
    return item.programs.some((value) => /指導者養成|プロYoga|検定|講座/.test(value)) || item.strengths.includes('資格取得に強い');
  }
  if (item.type === 'event') {
    return item.contentTags.includes('資格対策') || item.contentTags.includes('プロYoga') || item.eventTypes.includes('講座');
  }
  return item.activities.some((value) => /検定|学習会|プロYoga/.test(value));
};

const badgesOf = (item: SearchItem): CardBadge[] => {
  const badges: CardBadge[] = [];

  if (isProYoga(item)) badges.push({ key: 'pro', label: 'プロYoga対応', tone: 'gold' });
  if (isForeignFriendly(item)) badges.push({ key: 'foreign', label: '外国人対応', tone: 'blue' });
  if (supportsEnglish(item)) badges.push({ key: 'english', label: '英語対応', tone: 'navy' });
  if (isBeginnerFriendly(item)) badges.push({ key: 'beginner', label: '初心者歓迎', tone: 'green' });
  if (supportsCertification(item)) badges.push({ key: 'certification', label: '資格対応', tone: 'purple' });

  return badges.slice(0, 5);
};

const cardIntro = (item: SearchItem) => {
  switch (item.type) {
    case 'school':
      return '信頼して通えるスクール';
    case 'teacher':
      return '先生プロフィール';
    case 'event':
      return '気軽に参加できるイベント';
    default:
      return '地域で続けるコミュニティ';
  }
};

const detailLabel = (item: SearchItem) => {
  switch (item.type) {
    case 'school':
      return 'スクール詳細を見る';
    case 'teacher':
      return 'プロフィールを見る';
    case 'event':
      return '参加詳細を見る';
    default:
      return '活動を見る';
  }
};

const accentMeta = (item: SearchItem) => {
  switch (item.type) {
    case 'school':
      return item.internationalSupportLevel;
    case 'teacher':
      return item.languageLevel;
    case 'event':
      return `${item.date} / ${item.organizerType}主催`;
    default:
      return item.internationalExchangeAvailable ? '国際交流あり' : '地域で続けやすい活動';
  }
};

const isAdminRecommendedSchool = (item: SearchItem): item is Extract<SearchItem, { type: 'school' }> => {
  return item.type === 'school' && item.adminRecommended;
};

export function CardList({
  title,
  items,
  onDetail,
  emptyMessage = '該当データがありません。',
  variant = 'default',
  stepLabel,
  description,
}: CardListProps) {
  const isPrioritySchool = variant === 'prioritySchool';
  const defaultDescription = isPrioritySchool
    ? 'まずここを確認すればOKです。継続しやすさ・学びやすさ・国際対応を踏まえた最優先候補を並べています。'
    : undefined;

  const renderCard = (item: SearchItem, index: number, emphasized = false) => {
    const className = [
      'entity-card',
      `${item.type}-card`,
      isPrioritySchool ? 'priority-entity-card' : '',
      emphasized ? 'top-priority-card featured-school-card' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const badges = badgesOf(item);

    return (
      <article key={item.id} className={className}>
        <div className="entity-topline">
          <span className={`type-pill ${item.type}`}>{typeLabel[item.type]}</span>
          <div className="entity-badge-group">
            {isPrioritySchool && index === 0 && <span className="badge-priority">まず見る</span>}
            {isAdminRecommendedSchool(item) && <span className="badge-admin-recommendation">運営おすすめ</span>}
          </div>
        </div>
        <div className="entity-title-block">
          <span className={`entity-kicker ${item.type}`}>{cardIntro(item)}</span>
          {isPrioritySchool && index === 0 && <span className="badge-special-recommendation">あなたに特におすすめ</span>}
          <h4>{item.name}</h4>
          {badges.length > 0 && (
            <div className="card-badge-row" aria-label="カード特徴バッジ">
              {badges.map((badge) => (
                <span key={`${item.id}-${badge.key}`} className={`card-badge ${badge.tone}`}>
                  {badge.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <p>{item.description}</p>
        <div className={`entity-accent-strip ${item.type}`}>{accentMeta(item)}</div>
        <dl className="entity-meta">
          <div><dt>地域</dt><dd>{item.area}</dd></div>
          <div><dt>対応言語</dt><dd>{item.languages.join(' / ')}</dd></div>
          <div><dt>国際対応</dt><dd>🌐 {foreignLabel(item)}</dd></div>
        </dl>
        <div className="tag-row">
          {tagsOf(item).map((tag) => (
            <span className="mini-tag" key={`${item.id}-${tag}`}>{tag}</span>
          ))}
        </div>
        {onDetail && (
          <button className={`detail-button ${item.type}`} onClick={() => onDetail(item)} type="button">
            {detailLabel(item)}
          </button>
        )}
      </article>
    );
  };

  const [featuredItem, ...otherItems] = items;

  return (
    <section className={isPrioritySchool ? 'panel result-section priority-school-section' : 'panel result-section'}>
      <div className={isPrioritySchool ? 'section-inline-header tight priority-school-header' : 'section-inline-header tight'}>
        <div className="result-section-heading">
          {stepLabel && <span className="result-step-badge">{stepLabel}</span>}
          <h3>{title}</h3>
          {(description || defaultDescription) && <p className="result-section-copy">{description ?? defaultDescription}</p>}
        </div>
        <span>{items.length}件</span>
      </div>
      {items.length === 0 ? (
        <div className="empty-box">{emptyMessage}</div>
      ) : isPrioritySchool && featuredItem ? (
        <div className="priority-stack">
          {renderCard(featuredItem, 0, true)}
          {otherItems.length > 0 && (
            <div className="card-grid secondary-priority-grid">
              {otherItems.map((item, index) => renderCard(item, index + 1))}
            </div>
          )}
        </div>
      ) : (
        <div className="card-grid">
          {items.map((item, index) => renderCard(item, index))}
        </div>
      )}
    </section>
  );
}
