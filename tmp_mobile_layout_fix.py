from pathlib import Path

app = Path('/home/user/yoga-edu-mvp/src/App.tsx')
css = Path('/home/user/yoga-edu-mvp/src/styles/global.css')

app_text = app.read_text()
old_app = '''            <section className="hero-panel federation-hero student-hero-panel">
              <div className="hero-copy-block">
                <span className="eyebrow">For Students</span>
                <h1>AI診断で、あなたに合うヨガと出会う</h1>
                <p className="hero-subcopy">先生・スクール・イベント・ヨガクラブから、あなたに合うヨガ体験を提案します。</p>
                <p>
                  まずは無料診断から。目的、身体状態、通いやすいエリア、国際対応ニーズに合わせて、スクールを中心におすすめを表示します。
                </p>
                <div className="hero-actions wrap student-hero-actions">
                  <button className="primary-button hero-primary-cta" onClick={() => moveTo('diagnosis')}>無料診断を始める</button>
                </div>
              </div>
              <div className="hero-card-grid">
                <div className="stats-card"><strong>{schoolList.length}</strong><span>おすすめスクール</span></div>
                <div className="stats-card"><strong>{teacherList.length}</strong><span>おすすめ先生</span></div>
                <div className="stats-card"><strong>{eventList.length}</strong><span>イベント</span></div>
                <div className="stats-card"><strong>{clubList.length}</strong><span>ヨガクラブ</span></div>
              </div>
            </section>
'''
new_app = '''            <section className="hero-panel federation-hero student-hero-panel">
              <div className="hero-copy-block">
                <span className="eyebrow">For Students</span>
                <h1>AI診断で、あなたに合うヨガと出会う</h1>
                <p className="hero-subcopy">先生・スクール・イベント・ヨガクラブから、あなたに合うヨガ体験を提案します。</p>
                <p>
                  まずは無料診断から。目的、身体状態、通いやすいエリア、国際対応ニーズに合わせて、スクールを中心におすすめを表示します。
                </p>
              </div>
              <div className="hero-actions wrap student-hero-actions">
                <button className="primary-button hero-primary-cta" onClick={() => moveTo('diagnosis')}>無料診断を始める</button>
              </div>
              <div className="hero-card-grid stats-cards">
                <div className="stats-card"><strong>{schoolList.length}</strong><span>おすすめスクール</span></div>
                <div className="stats-card"><strong>{teacherList.length}</strong><span>おすすめ先生</span></div>
                <div className="stats-card"><strong>{eventList.length}</strong><span>イベント</span></div>
                <div className="stats-card"><strong>{clubList.length}</strong><span>ヨガクラブ</span></div>
              </div>
            </section>
'''
if old_app not in app_text:
    raise SystemExit('Expected hero section not found in App.tsx')
app.write_text(app_text.replace(old_app, new_app))

css_text = css.read_text()
old_css = '''.federation-hero {
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, .55fr);
  gap: 26px;
  background:
    radial-gradient(circle at top right, rgba(201,165,76,.1), transparent 28%),
    radial-gradient(circle at left center, rgba(145,196,159,.16), transparent 34%),
    linear-gradient(135deg, #ffffff 0%, #f5faf5 54%, #fbf7ee 100%);
}
'''
new_css = '''.federation-hero {
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, .55fr);
  grid-template-areas:
    "copy stats"
    "actions stats";
  gap: 26px;
  background:
    radial-gradient(circle at top right, rgba(201,165,76,.1), transparent 28%),
    radial-gradient(circle at left center, rgba(145,196,159,.16), transparent 34%),
    linear-gradient(135deg, #ffffff 0%, #f5faf5 54%, #fbf7ee 100%);
}
'''
if old_css not in css_text:
    raise SystemExit('Expected federation-hero block not found in CSS')
css_text = css_text.replace(old_css, new_css)

insert_after = '''.hero-copy-block {
  max-width: 800px;
  display: grid;
  gap: 16px;
  align-content: center;
}
'''
addition = '''.hero-copy-block {
  grid-area: copy;
}

.student-hero-actions {
  grid-area: actions;
  align-self: start;
}

.hero-card-grid,
.stats-cards {
  grid-area: stats;
}
'''
if addition not in css_text:
    css_text = css_text.replace(insert_after, insert_after + '\n' + addition)

start = css_text.find('/* --- hero mobile layout fix --- */')
if start == -1:
    raise SystemExit('Expected mobile layout fix block not found')
end = css_text.find('/* --- mobile CTA tap target improvement --- */')
if end == -1:
    raise SystemExit('Expected mobile CTA block not found')
new_mobile = '''/* --- hero mobile layout fix --- */
@media (max-width: 768px) {
  .federation-hero.student-hero-panel {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-areas:
      "copy"
      "actions"
      "stats";
    gap: 18px;
    align-items: start;
  }

  .federation-hero.student-hero-panel > .hero-copy-block {
    order: 0;
    max-width: 100%;
  }

  .federation-hero.student-hero-panel > .student-hero-actions {
    order: 0;
    width: 100%;
    margin-top: 0;
  }

  .federation-hero.student-hero-panel > .hero-card-grid,
  .federation-hero.student-hero-panel > .stats-cards {
    order: 0;
    position: static !important;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 16px;
    inset: auto !important;
    top: auto !important;
    right: auto !important;
    bottom: auto !important;
    left: auto !important;
    transform: none !important;
    width: 100%;
    align-self: stretch;
  }

  .federation-hero.student-hero-panel .stats-card {
    position: static !important;
    transform: none !important;
    min-width: 0;
  }
}

'''
css_text = css_text[:start] + new_mobile + css_text[end:]

old_cta = '''/* --- mobile CTA tap target improvement --- */
@media (max-width: 768px) {
  .federation-hero.student-hero-panel .student-hero-actions {
    width: 100%;
    margin-top: 14px;
  }

  .federation-hero.student-hero-panel .hero-primary-cta {
    width: min(100%, 560px);
    min-height: 52px;
    padding: 14px 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
}

@media (max-width: 640px) {
  .federation-hero.student-hero-panel .hero-primary-cta {
    width: 100%;
    min-height: 54px;
    padding: 15px 18px;
    border-radius: 18px;
    font-size: 16px;
    line-height: 1.35;
  }
}
'''
new_cta = '''/* --- mobile CTA tap target improvement --- */
@media (max-width: 768px) {
  .federation-hero.student-hero-panel .hero-primary-cta {
    width: min(100%, 560px);
    min-height: 52px;
    padding: 14px 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
}

@media (max-width: 640px) {
  .federation-hero.student-hero-panel .hero-primary-cta {
    width: 100%;
    min-height: 54px;
    padding: 15px 18px;
    border-radius: 18px;
    font-size: 16px;
    line-height: 1.35;
  }
}
'''
if old_cta in css_text:
    css_text = css_text.replace(old_cta, new_cta)

css.write_text(css_text)
print('Updated App.tsx and global.css successfully.')
