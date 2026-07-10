interface StaticInfoSection {
  heading: string;
  body: string;
}

interface StaticInfoPageProps {
  eyebrow: string;
  title: string;
  intro: string;
  sections: StaticInfoSection[];
}

export function StaticInfoPage({ eyebrow, title, intro, sections }: StaticInfoPageProps) {
  return (
    <div className="page-shell static-info-page">
      <section className="hero-panel compact-hero static-info-hero">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{intro}</p>
        </div>
      </section>

      <section className="panel static-info-panel">
        <div className="static-info-stack">
          {sections.map((section) => (
            <article key={section.heading} className="static-info-block">
              <h3>{section.heading}</h3>
              <p>{section.body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
