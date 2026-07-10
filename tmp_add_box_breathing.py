from pathlib import Path

app = Path('/home/user/yoga-edu-mvp/src/App.tsx')
result_page = Path('/home/user/yoga-edu-mvp/src/components/ResultPage.tsx')
css = Path('/home/user/yoga-edu-mvp/src/styles/global.css')

app_text = app.read_text()
app_text = app_text.replace(
    "    allRecommendedItems: [...recommendedSchools, ...recommendedTeachers, ...recommendedEvents, ...recommendedClubs],\n    shouldHighlightProYoga: wantsCertification,\n",
    "    allRecommendedItems: [...recommendedSchools, ...recommendedTeachers, ...recommendedEvents, ...recommendedClubs],\n    shouldShowBoxBreathing: input.goals.includes('ストレス軽減') || input.goals.includes('睡眠改善') || input.bodyConditions.includes('自律神経の乱れ'),\n    shouldHighlightProYoga: wantsCertification,\n",
)
app.write_text(app_text)

result_text = result_page.read_text()
result_text = result_text.replace(
    "  allRecommendedItems: SearchItem[];\n  shouldHighlightProYoga: boolean;\n}",
    "  allRecommendedItems: SearchItem[];\n  shouldShowBoxBreathing: boolean;\n  shouldHighlightProYoga: boolean;\n}",
)

insert_after_pose = '''      </section>\n\n      <CardList\n'''
box_section = '''      </section>\n\n      {result.shouldShowBoxBreathing && (\n        <section className=\"panel result-section breathing-panel\">\n          <div className=\"section-inline-header tight\">\n            <div className=\"result-section-heading\">\n              <span className=\"result-step-badge\">呼吸体験</span>\n              <h3>今すぐできる呼吸法</h3>\n              <p className=\"result-section-copy\">\n                ボックスブリージングは、呼吸のリズムをゆっくりそろえたいときに役立つとされています。苦しくないペースで、上から順に試してみてください。\n              </p>\n            </div>\n          </div>\n\n          <article className=\"breathing-card\">\n            <div className=\"breathing-card-header\">\n              <span className=\"breathing-card-kicker\">Box Breathing</span>\n              <h4>ボックスブリージング体験</h4>\n            </div>\n\n            <div className=\"breathing-steps\">\n              <div className=\"breathing-step\">\n                <span>1</span>\n                <div>\n                  <strong>鼻から4秒吸う</strong>\n                  <p>肩を上げすぎず、やさしく息を取り入れます。</p>\n                </div>\n              </div>\n              <div className=\"breathing-step\">\n                <span>2</span>\n                <div>\n                  <strong>4秒止める</strong>\n                  <p>苦しくない範囲で、呼吸を静かにキープします。</p>\n                </div>\n              </div>\n              <div className=\"breathing-step\">\n                <span>3</span>\n                <div>\n                  <strong>鼻から4秒吐く</strong>\n                  <p>細く長く、力を抜きながら吐いていきます。</p>\n                </div>\n              </div>\n              <div className=\"breathing-step\">\n                <span>4</span>\n                <div>\n                  <strong>4秒止める</strong>\n                  <p>次の呼吸の前に、落ち着いて1回区切ります。</p>\n                </div>\n              </div>\n            </div>\n\n            <p className=\"breathing-repeat\">これを3回繰り返してみましょう。</p>\n          </article>\n        </section>\n      )}\n\n      <CardList\n'''
if insert_after_pose not in result_text:
    raise SystemExit('Could not locate insertion point in ResultPage.tsx')
result_text = result_text.replace(insert_after_pose, box_section, 1)
result_page.write_text(result_text)

css_text = css.read_text()
if '.breathing-panel {' not in css_text:
    css_text += '''\n\n.breathing-panel {\n  padding: 34px;\n}\n\n.breathing-card {\n  display: grid;\n  gap: 18px;\n  padding: 26px;\n  border-radius: 22px;\n  border: 1px solid rgba(108,138,118,.16);\n  background: linear-gradient(180deg, #ffffff 0%, #f5faf5 100%);\n  box-shadow: 0 14px 30px rgba(16,37,66,.04);\n}\n\n.breathing-card-header {\n  display: grid;\n  gap: 8px;\n}\n\n.breathing-card-kicker {\n  display: inline-flex;\n  width: fit-content;\n  padding: 7px 12px;\n  border-radius: 999px;\n  background: rgba(108,138,118,.12);\n  color: #557565;\n  font-size: 12px;\n  font-weight: 800;\n  letter-spacing: .05em;\n}\n\n.breathing-card h4 {\n  font-size: clamp(22px, 3vw, 28px);\n  line-height: 1.35;\n}\n\n.breathing-steps {\n  display: grid;\n  gap: 12px;\n}\n\n.breathing-step {\n  display: grid;\n  grid-template-columns: 36px 1fr;\n  gap: 12px;\n  align-items: start;\n  padding: 14px 0;\n  border-top: 1px solid rgba(108,138,118,.12);\n}\n\n.breathing-step:first-child {\n  border-top: 0;\n  padding-top: 0;\n}\n\n.breathing-step span {\n  display: inline-grid;\n  place-items: center;\n  width: 36px;\n  height: 36px;\n  border-radius: 999px;\n  background: rgba(201,165,76,.18);\n  color: #8b6b18;\n  font-weight: 800;\n}\n\n.breathing-step strong {\n  color: var(--navy);\n}\n\n.breathing-step p {\n  margin-top: 4px;\n  color: var(--muted);\n  line-height: 1.75;\n}\n\n.breathing-repeat {\n  padding: 16px 18px;\n  border-radius: 16px;\n  background: rgba(201,165,76,.12);\n  color: var(--navy);\n  font-weight: 700;\n}\n\n@media (max-width: 640px) {\n  .breathing-panel {\n    padding: 24px 22px;\n  }\n\n  .breathing-card {\n    padding: 20px;\n    border-radius: 18px;\n  }\n\n  .breathing-step {\n    grid-template-columns: 32px 1fr;\n    gap: 10px;\n  }\n\n  .breathing-step span {\n    width: 32px;\n    height: 32px;\n    font-size: 13px;\n  }\n\n  .breathing-repeat {\n    font-size: 14px;\n    line-height: 1.65;\n  }\n}\n'''
css.write_text(css_text)
print('Added conditional box breathing section.')
