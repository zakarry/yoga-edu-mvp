interface SiteMapPageProps {
  onNavigate: (page: string) => void;
  onOpenSearchWithType: (type: 'all' | 'school' | 'teacher' | 'event' | 'club') => void;
}

interface SitemapGroup {
  title: string;
  items: Array<{
    label: string;
    page?: string;
    action?: () => void;
    disabled?: boolean;
    comingLater?: boolean;
  }>;
}

export function SiteMapPage({ onNavigate, onOpenSearchWithType }: SiteMapPageProps) {
  const groups: SitemapGroup[] = [
    {
      title: '自分を知る',
      items: [
        { label: 'AI診断', page: 'diagnosis' },
        { label: '先生AI診断', page: 'teacher-diagnosis' },
      ],
    },
    {
      title: '実践する',
      items: [
        { label: 'My AI Teacher', page: 'ai-teacher' },
        { label: 'Asana（アーサナ）', page: 'ai-teacher' },
        { label: 'Pranayama（呼吸法）', page: 'ai-teacher' },
        { label: 'Dhyana（瞑想）', page: 'ai-teacher' },
      ],
    },
    {
      title: '探す',
      items: [
        { label: '先生を探す', action: () => onOpenSearchWithType('teacher') },
        { label: 'スクールを探す', action: () => onOpenSearchWithType('school') },
        { label: 'イベントを探す', action: () => onOpenSearchWithType('event') },
        { label: 'ヨガクラブを探す', action: () => onOpenSearchWithType('club') },
        { label: '地図から探す', page: 'search' },
      ],
    },
    {
      title: '記録する',
      items: [
        { label: 'myYOGAカルテ', page: 'my-page' },
        { label: '診断履歴', page: 'my-page' },
        { label: 'My Practice', page: 'my-page' },
        { label: 'My Teacher', page: 'my-page' },
        { label: 'My Teaching Journey', page: 'my-page' },
      ],
    },
    {
      title: '学ぶ',
      items: [
        { label: 'ヨガ検定3級', page: 'pro-yoga' },
        { label: 'ヨガ検定2級', page: 'pro-yoga' },
        { label: '呼吸検定', page: 'pro-yoga' },
        { label: 'Pro Yoga', page: 'pro-yoga' },
      ],
    },
    {
      title: 'ヨガを知る',
      items: [
        { label: 'ヨガの聖地と文化', page: 'sacred-sites' },
      ],
    },
    {
      title: 'その他',
      items: [
        { label: 'Yoga AIでできること', page: 'site-map' },
        { label: '利用規約', page: 'terms' },
        { label: 'プライバシーポリシー', page: 'privacy' },
        { label: 'AI Guru', comingLater: true },
      ],
    },
  ];

  const handleClick = (item: SitemapGroup['items'][number]) => {
    if (item.disabled || item.comingLater) return;
    if (item.action) { item.action(); return; }
    if (item.page) onNavigate(item.page);
  };

  return (
    <div className="page-shell site-map-shell">
      <section className="hero-panel compact-hero">
        <div>
          <button className="ghost-button" onClick={() => onNavigate('home')}>TOPへ戻る</button>
          <span className="eyebrow">Site Map</span>
          <h2>Yoga AIでできること</h2>
          <p>このサイトでできることを、目的ごとに整理しています。</p>
        </div>
      </section>

      <div className="site-map-grid">
        {groups.map((group) => (
          <section key={group.title} className="panel site-map-group">
            <h3>{group.title}</h3>
            <ul className="site-map-list">
              {group.items.map((item) => (
                <li key={item.label}>
                  <button
                    type="button"
                    className={`site-map-link ${item.comingLater ? 'is-coming-later' : ''}`}
                    disabled={item.disabled || item.comingLater}
                    onClick={() => handleClick(item)}
                  >
                    <span>{item.label}</span>
                    {item.comingLater && <small>Coming Later</small>}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
