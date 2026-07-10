from pathlib import Path

app = Path('/home/user/yoga-edu-mvp/src/App.tsx')
result_page = Path('/home/user/yoga-edu-mvp/src/components/ResultPage.tsx')
css = Path('/home/user/yoga-edu-mvp/src/styles/global.css')

app_text = app.read_text()
app_text = app_text.replace(
    "import { DiagnosisResult, ResultPage } from './components/ResultPage';",
    "import { DiagnosisResult, ResultPage, YogaFlowStep } from './components/ResultPage';",
)

marker = """function buildResult(input: StudentDiagnosisInput, items: SearchItem[]): DiagnosisResult {
"""
if marker not in app_text:
    raise SystemExit('buildResult marker not found')

insert_block = '''function hasAny(values: string[], targets: string[]) {
  return targets.some((target) => values.includes(target));
}

function buildRecommendedYogaFlow(input: StudentDiagnosisInput): YogaFlowStep[] {
  const beginner = ['未経験', '少しある'].includes(input.yogaExperience);
  const wantsRelax = hasAny(input.goals, ['リラックス', 'ストレス軽減', '睡眠改善', '瞑想・呼吸法'])
    || hasAny(input.bodyConditions, ['睡眠の悩み', '自律神経の乱れ', '疲れやすい']);
  const wantsPosture = hasAny(input.goals, ['姿勢改善', '肩こり改善']) || hasAny(input.bodyConditions, ['肩こり', '首こり']);
  const wantsBackCare = input.goals.includes('腰痛改善') || input.bodyConditions.includes('腰痛');
  const wantsFlexibility = input.goals.includes('柔軟性向上') || input.bodyConditions.includes('股関節の硬さ');
  const wantsBalance = input.preferredStyles.includes('バランス型');
  const wantsDynamic = input.preferredStyles.includes('しっかり動く') || input.goals.includes('運動不足解消');
  const wantsMeditation = input.goals.includes('瞑想・呼吸法') || input.preferredStyles.includes('瞑想重視') || input.preferredStyles.includes('呼吸法重視');
  const wantsDigestiveCare = hasAny(input.bodyConditions, ['冷え', 'むくみ']);

  const preparation: YogaFlowStep = {
    phase: '準備・姿勢',
    title: '楽な姿勢で呼吸を整える',
    description: 'いすでも床でも座りやすい姿勢をとり、背すじをやさしく伸ばして3呼吸ほど落ち着きます。',
    guidance: '体を動かす前に、今の呼吸と姿勢を確かめる時間として役立つとされています。',
  };

  const standing: YogaFlowStep = wantsBalance && !beginner
    ? {
        phase: '立位ポーズ',
        title: 'ヴリクシャーサナ（木のポーズ）',
        description: '片足に少しずつ体重をのせ、ぐらつかない範囲でバランスをとります。',
        guidance: 'バランス感覚と集中を整えたいときに役立つとされています。',
      }
    : wantsFlexibility
      ? {
          phase: '立位ポーズ',
          title: 'パダ・ハスターサナ（前屈のポーズ）',
          description: 'ひざを軽くゆるめながら上体を前に倒し、背面を気持ちよく伸ばします。',
          guidance: '脚まわりのこわばりをやわらげたいときに役立つとされています。',
        }
      : wantsDynamic && !beginner
        ? {
            phase: '立位ポーズ',
            title: 'トリコナーサナ（三角のポーズ）',
            description: '足幅を広げ、片手をすねや太ももに添えながら体の横を伸ばします。',
            guidance: '体側を広げて、全身を気持ちよく動かしたいときに役立つとされています。',
          }
        : {
            phase: '立位ポーズ',
            title: 'タダーサナ（山のポーズ）',
            description: '足裏で床を感じながらまっすぐ立ち、肩の力を抜いて姿勢を整えます。',
            guidance: '姿勢を見直したいときや、はじめの一歩として役立つとされています。',
          };

  const seated: YogaFlowStep = wantsPosture && !beginner
    ? {
        phase: '座位ポーズ',
        title: 'ウシュトラーサナ（胸ひらきのポーズ）',
        description: 'ひざ立ちから胸をやさしく持ち上げ、首をつめない範囲で前側を広げます。',
        guidance: '肩まわりを広げて、呼吸をしやすくしたいときに役立つとされています。',
      }
    : wantsFlexibility
      ? {
          phase: '座位ポーズ',
          title: 'バッダ・コナーサナ（合せきのポーズ）',
          description: '足裏を合わせて座り、背中を丸めすぎないように股関節まわりをゆるめます。',
          guidance: '股関節まわりをやさしくほぐしたいときに役立つとされています。',
        }
      : {
          phase: '座位ポーズ',
          title: 'ヴァジュラーサナ（正座のポーズ）',
          description: '無理のない正座で座り、背すじを長く保ちながら落ち着いて呼吸します。',
          guidance: '初心者でも姿勢を整えやすく、呼吸を落ち着ける時間に役立つとされています。',
        };

  const resting: YogaFlowStep = wantsBackCare && !beginner
    ? {
        phase: '寝ポーズ',
        title: 'ブジャンガーサナ（コブラのポーズ）',
        description: 'うつ伏せから胸を少し持ち上げ、腰を反らしすぎない範囲で前側を広げます。',
        guidance: '腰まわりや胸まわりをやさしく動かしたいときに役立つとされています。',
      }
    : wantsBackCare || wantsRelax
      ? {
          phase: '寝ポーズ',
          title: 'セツ・バンダーサナ（橋のポーズ）',
          description: '仰向けでひざを立て、足で床を押しながらお尻を小さく持ち上げます。',
          guidance: '胸をひらいて呼吸を深め、落ち着きを取り戻したいときに役立つとされています。',
        }
      : wantsDigestiveCare
        ? {
            phase: '寝ポーズ',
            title: 'パヴァン・ムクターサナ（ひざ抱えのポーズ）',
            description: '仰向けで片ひざずつ、または両ひざを抱え、腰まわりをやさしくゆるめます。',
            guidance: 'お腹まわりをゆるめて、やさしく体を休めたいときに役立つとされています。',
          }
        : {
            phase: '寝ポーズ',
            title: 'セツ・バンダーサナ（橋のポーズ）',
            description: '仰向けでひざを立て、無理のない高さでお尻を持ち上げて胸を広げます。',
            guidance: '全身をゆるやかに目覚めさせたいときに役立つとされています。',
          };

  const breathing: YogaFlowStep = wantsMeditation && wantsRelax
    ? {
        phase: '呼吸・瞑想',
        title: '瞑想（1分）',
        description: '最後に目を閉じて1分ほど静かに座り、自然な呼吸の出入りを見守ります。',
        guidance: '気持ちを落ち着け、今の自分の状態に気づく時間として役立つとされています。',
      }
    : wantsRelax
      ? {
          phase: '呼吸・瞑想',
          title: 'ブラマリ（ハチの呼吸）',
          description: '息を吐くときに小さくハミングし、頭や顔まわりの力みをゆるめます。',
          guidance: '緊張を手放し、リラックスしたいときに役立つとされています。',
        }
      : {
          phase: '呼吸・瞑想',
          title: 'ナディ・ショーダナ（片鼻呼吸）',
          description: '左右の鼻を交互に使い、慌てずゆっくりと呼吸のリズムを整えます。',
          guidance: '呼吸のバランスを整えて、集中したいときに役立つとされています。',
        };

  return [preparation, standing, seated, resting, breathing];
}

'''
app_text = app_text.replace(marker, insert_block + marker)

old_return = '''  return {
    typeName,
    summary,
    recommendedSchools,
    recommendedTeachers,
    recommendedEvents,
    recommendedClubs,
    allRecommendedItems: [...recommendedSchools, ...recommendedTeachers, ...recommendedEvents, ...recommendedClubs],
    shouldHighlightProYoga: wantsCertification,
  };
}
'''
new_return = '''  return {
    typeName,
    summary,
    recommendedYogaFlow: buildRecommendedYogaFlow(input),
    recommendedSchools,
    recommendedTeachers,
    recommendedEvents,
    recommendedClubs,
    allRecommendedItems: [...recommendedSchools, ...recommendedTeachers, ...recommendedEvents, ...recommendedClubs],
    shouldHighlightProYoga: wantsCertification,
  };
}
'''
if old_return not in app_text:
    raise SystemExit('buildResult return block not found')
app_text = app_text.replace(old_return, new_return)
app.write_text(app_text)

result_page.write_text('''import { SearchItem } from '../data';
import { CardList } from './CardList';
import { MapView } from './MapView';

export interface YogaFlowStep {
  phase: string;
  title: string;
  description: string;
  guidance: string;
}

export interface DiagnosisResult {
  typeName: string;
  summary: string;
  recommendedYogaFlow: YogaFlowStep[];
  recommendedSchools: SearchItem[];
  recommendedTeachers: SearchItem[];
  recommendedEvents: SearchItem[];
  recommendedClubs: SearchItem[];
  allRecommendedItems: SearchItem[];
  shouldHighlightProYoga: boolean;
}

interface ResultPageProps {
  result: DiagnosisResult;
  onRestart: () => void;
  onOpenProYoga: () => void;
  onDetail: (item: SearchItem) => void;
}

export function ResultPage({ result, onRestart, onOpenProYoga, onDetail }: ResultPageProps) {
  return (
    <div className="page-shell result-page-shell">
      <section className="hero-panel result-hero result-type-panel">
        <div>
          <span className="eyebrow">AI Result</span>
          <h1 className="result-type-heading">あなたの診断タイプ：{result.typeName}</h1>
          <p className="result-type-summary">{result.summary}</p>
        </div>

        <div className="result-hero-aside">
          <div className="result-focus-card">
            <span className="result-focus-label">すぐ試す</span>
            <strong>おすすめヨガフロー</strong>
            <p>診断タイプに合わせて、家で始めやすい約5分の流れをまとめています。最初の一歩として気軽に試せます。</p>
          </div>

          <div className="result-order-card">
            <span className="result-focus-label">表示順</span>
            <ol className="result-order-list">
              <li><span>1</span><div>診断タイプ</div></li>
              <li><span>2</span><div>おすすめヨガフロー</div></li>
              <li><span>3</span><div>おすすめスクール</div></li>
              <li><span>4</span><div>おすすめ先生</div></li>
              <li><span>5</span><div>おすすめイベント</div></li>
              <li><span>6</span><div>おすすめヨガクラブ</div></li>
              <li><span>7</span><div>プロYoga検定</div></li>
              <li><span>8</span><div>地図</div></li>
            </ol>
          </div>

          <div className="hero-actions result-hero-actions">
            <button className="primary-button" onClick={onRestart}>もう一度診断する</button>
          </div>
        </div>
      </section>

      <section className="panel result-section yoga-flow-panel">
        <div className="section-inline-header tight">
          <div className="result-section-heading">
            <span className="result-step-badge gold">STEP 2</span>
            <h3>あなたにおすすめのヨガフロー（約5分）</h3>
            <p className="result-section-copy">
              インド政府制定「共通ヨガ・プロトコル」を参考に、診断内容に合わせて自宅で始めやすい流れに整えました。痛みが出るほど無理をせず、呼吸が苦しくない範囲で進めてください。
            </p>
          </div>
        </div>

        <div className="yoga-flow-grid">
          {result.recommendedYogaFlow.map((step, index) => (
            <article
              key={`${step.phase}-${step.title}`}
              className={step.phase === '準備・姿勢' ? 'yoga-flow-card is-prep' : 'yoga-flow-card'}
            >
              <div className="yoga-flow-card-header">
                <span className="yoga-flow-order">{index + 1}</span>
                <div className="yoga-flow-heading-group">
                  <span className="yoga-flow-phase">{step.phase}</span>
                  <h4>{step.title}</h4>
                </div>
              </div>
              <p>{step.description}</p>
              <p className="yoga-flow-guidance">{step.guidance}</p>
            </article>
          ))}
        </div>

        <p className="yoga-flow-note">
          体調に不安がある場合や、医師から運動制限がある場合は無理をせず、必要に応じて専門家に相談しながら進めてください。
        </p>
      </section>

      <CardList
        title="おすすめスクール"
        items={result.recommendedSchools}
        onDetail={onDetail}
        variant="prioritySchool"
        stepLabel="STEP 3"
        description="まずここを確認すればOKです。あなたに合う学びの入口として、スクールを最優先で大きく表示しています。"
      />

      <CardList
        title="おすすめ先生"
        items={result.recommendedTeachers}
        onDetail={onDetail}
        stepLabel="STEP 4"
        description="スクール候補の次に、相性の良い先生を確認できます。"
      />

      <CardList
        title="おすすめイベント"
        items={result.recommendedEvents}
        onDetail={onDetail}
        stepLabel="STEP 5"
        description="体験参加や短期参加から始めたい方に向くイベントです。"
      />

      <CardList
        title="おすすめヨガクラブ"
        items={result.recommendedClubs}
        onDetail={onDetail}
        stepLabel="STEP 6"
        description="地域で継続しやすい交流先やコミュニティ候補です。"
      />

      <section className="panel result-section pro-yoga-guide-panel">
        <div className="section-inline-header tight">
          <div className="result-section-heading">
            <span className="result-step-badge">STEP 7</span>
            <h3>プロYoga検定導線</h3>
            <p className="result-section-copy">本格的に学びたい方や資格に関心がある方は、次にこちらを確認してください。</p>
          </div>
        </div>
        <div className="pro-yoga-guide-actions">
          <button className={result.shouldHighlightProYoga ? 'gold-button' : 'secondary-button'} onClick={onOpenProYoga}>
            プロYoga検定を見る
          </button>
        </div>
      </section>

      <MapView items={result.allRecommendedItems} onSelectItem={onDetail} />
    </div>
  );
}
''')

css_text = css.read_text()
if '.yoga-flow-panel' not in css_text:
    css_text += '''

.yoga-flow-panel {
  padding: 34px;
}

.yoga-flow-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.yoga-flow-card {
  display: grid;
  gap: 12px;
  padding: 22px;
  border-radius: 22px;
  border: 1px solid rgba(108,138,118,.16);
  background: linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(245,250,245,1) 100%);
  box-shadow: 0 14px 30px rgba(16,37,66,.04);
}

.yoga-flow-card.is-prep {
  grid-column: 1 / -1;
  border-color: rgba(201,165,76,.26);
  background: linear-gradient(135deg, #fffdf8 0%, #ffffff 56%, #f5faf5 100%);
}

.yoga-flow-card-header {
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: 12px;
  align-items: start;
}

.yoga-flow-order {
  display: inline-grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: rgba(201,165,76,.18);
  color: #8b6b18;
  font-weight: 800;
}

.yoga-flow-heading-group {
  display: grid;
  gap: 4px;
}

.yoga-flow-phase {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .05em;
  color: #557565;
}

.yoga-flow-card h4 {
  font-size: 21px;
  line-height: 1.35;
}

.yoga-flow-card p {
  line-height: 1.8;
}

.yoga-flow-guidance {
  padding-top: 10px;
  border-top: 1px solid rgba(108,138,118,.12);
  color: #557565;
}

.yoga-flow-note {
  margin-top: 16px;
  font-size: 14px;
  color: var(--muted);
}

@media (max-width: 900px) {
  .yoga-flow-grid {
    grid-template-columns: 1fr;
  }

  .yoga-flow-card.is-prep {
    grid-column: auto;
  }
}

@media (max-width: 640px) {
  .yoga-flow-panel {
    padding: 24px 22px;
  }

  .yoga-flow-card {
    padding: 18px;
    border-radius: 18px;
  }

  .yoga-flow-card h4 {
    font-size: 18px;
  }

  .yoga-flow-note {
    font-size: 13px;
    line-height: 1.7;
  }
}
'''
css.write_text(css_text)
print('Added yoga flow result section, logic, and styles.')
