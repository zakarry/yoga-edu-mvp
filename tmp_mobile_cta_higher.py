from pathlib import Path

app = Path('/home/user/yoga-edu-mvp/src/App.tsx')
css = Path('/home/user/yoga-edu-mvp/src/styles/global.css')

app_text = app.read_text()
old = '''            <section className="hero-panel federation-hero student-hero-panel">
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
'''
new = '''            <section className="hero-panel federation-hero student-hero-panel">
              <div className="hero-copy-block">
                <span className="eyebrow">For Students</span>
                <h1>AI診断で、あなたに合うヨガと出会う</h1>
                <p className="hero-subcopy">先生・スクール・イベント・ヨガクラブから、あなたに合うヨガ体験を提案します。</p>
              </div>
              <div className="hero-actions wrap student-hero-actions">
                <button className="primary-button hero-primary-cta" onClick={() => moveTo('diagnosis')}>無料診断を始める</button>
              </div>
              <p className="hero-support-copy">
                まずは無料診断から。目的、身体状態、通いやすいエリア、国際対応ニーズに合わせて、スクールを中心におすすめを表示します。
              </p>
              <div className="hero-card-grid stats-cards">
'''
if old not in app_text:
    raise SystemExit('Hero block not found in App.tsx')
app.write_text(app_text.replace(old, new))

css_text = css.read_text()
old_grid = '''.federation-hero {
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, .55fr);
  grid-template-areas:
    "copy stats"
    "actions stats";
  gap: 26px;
'''
new_grid = '''.federation-hero {
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, .55fr);
  grid-template-areas:
    "copy stats"
    "support stats"
    "actions stats";
  gap: 22px 26px;
'''
if old_grid not in css_text:
    raise SystemExit('Desktop hero grid block not found')
css_text = css_text.replace(old_grid, new_grid)

old_areas = '''.hero-copy-block {
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
new_areas = '''.hero-copy-block {
  grid-area: copy;
}

.hero-support-copy {
  grid-area: support;
  max-width: 42rem;
  font-size: 15px;
  line-height: 1.95;
}

.student-hero-actions {
  grid-area: actions;
  align-self: start;
  margin-top: 0;
}

.hero-card-grid,
.stats-cards {
  grid-area: stats;
}
'''
if old_areas not in css_text:
    raise SystemExit('Hero area mapping block not found')
css_text = css_text.replace(old_areas, new_areas)

css_text = css_text.replace('.hero-copy-block > p:last-of-type {\n  max-width: 42rem;\n  font-size: 15px;\n  line-height: 1.95;\n}\n\n.student-hero-actions {\n  margin-top: 10px;\n}\n', '')
css_text = css_text.replace('.federation-hero.student-hero-panel > .hero-copy-block {\n    order: 0;\n    max-width: 100%;\n  }\n\n  .federation-hero.student-hero-panel > .student-hero-actions {\n    order: 0;\n    width: 100%;\n    margin-top: 0;\n  }\n\n  .federation-hero.student-hero-panel > .hero-card-grid,\n', '.federation-hero.student-hero-panel > .hero-copy-block {\n    order: 0;\n    max-width: 100%;\n  }\n\n  .federation-hero.student-hero-panel > .student-hero-actions {\n    order: 0;\n    width: 100%;\n    margin-top: 0;\n  }\n\n  .federation-hero.student-hero-panel > .hero-support-copy {\n    order: 0;\n    margin-top: -6px;\n  }\n\n  .federation-hero.student-hero-panel > .hero-card-grid,\n')
css_text = css_text.replace('    grid-template-areas:\n      "copy"\n      "actions"\n      "stats";\n', '    grid-template-areas:\n      "copy"\n      "actions"\n      "support"\n      "stats";\n')
css_text = css_text.replace('.federation-hero.student-hero-panel .hero-subcopy {\n    text-wrap: balance;\n  }\n', '.federation-hero.student-hero-panel .hero-subcopy {\n    text-wrap: balance;\n  }\n\n  .federation-hero.student-hero-panel .hero-support-copy {\n    text-wrap: pretty;\n  }\n')
css_text = css_text.replace('.federation-hero.student-hero-panel .hero-copy-block > p:last-of-type {\n    font-size: 13.5px;\n    line-height: 1.75;\n  }\n', '.federation-hero.student-hero-panel .hero-support-copy {\n    font-size: 13.5px;\n    line-height: 1.72;\n    margin-top: -2px;\n  }\n')

css.write_text(css_text)
print('Updated hero CTA placement for mobile.')
