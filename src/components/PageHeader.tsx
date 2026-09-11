import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  onBackHome?: () => void;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, subtitle, onBackHome, actions }: PageHeaderProps) {
  return (
    <section className="hero-panel compact-hero page-header-unified">
      <div className="page-header-content">
        <div className="page-header-top-row">
          {onBackHome && (
            <button type="button" className="ghost-button page-header-back" onClick={onBackHome}>
              ← TOPへ戻る
            </button>
          )}
          <span className="eyebrow">{eyebrow}</span>
        </div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
        {actions && <div className="page-header-actions">{actions}</div>}
      </div>
    </section>
  );
}

interface SectionTocProps {
  items: { id: string; label: string }[];
}

export function SectionToc({ items }: SectionTocProps) {
  return (
    <nav className="section-toc">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className="section-toc-chip"
          onClick={() => {
            const el = document.getElementById(item.id);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
