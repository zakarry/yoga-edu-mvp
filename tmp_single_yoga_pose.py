from pathlib import Path

app = Path('/home/user/yoga-edu-mvp/src/App.tsx')
result_page = Path('/home/user/yoga-edu-mvp/src/components/ResultPage.tsx')
css = Path('/home/user/yoga-edu-mvp/src/styles/global.css')

app_text = app.read_text()
app_text = app_text.replace(
    "import { DiagnosisResult, ResultPage, YogaFlowStep } from './components/ResultPage';",
    "import { DiagnosisResult, ResultPage, YogaPoseRecommendation } from './components/ResultPage';",
)

start = app_text.find("function hasAny(values: string[], targets: string[]) {")
end = app_text.find("function buildResult(input: StudentDiagnosisInput, items: SearchItem[]): DiagnosisResult {")
if start == -1 or end == -1 or end <= start:
    raise SystemExit('Could not locate yoga recommendation helper block in App.tsx')
new_helper = '''function hasAny(values: string[], targets: string[]) {
  return targets.some((target) => values.includes(target));
}

function buildRecommendedYogaPose(input: StudentDiagnosisInput): YogaPoseRecommendation {
  const beginner = ['未経験', '少しある'].includes(input.yogaExperience);
  const wantsStressCare = hasAny(input.goals, ['リラックス', 'ストレス軽減', '睡眠改善', '瞑想・呼吸法'])
    || hasAny(input.bodyConditions, ['睡眠の悩み', '自律神経の乱れ', '疲れやすい']);
  const wantsBackCare = input.goals.includes('腰痛改善') || input.bodyConditions.includes('腰痛');
  const wantsShoulderPosture = hasAny(input.goals, ['肩こり改善', '姿勢改善']) || hasAny(input.bodyConditions, ['肩こり', '首こり']);
  const wantsExercise = input.goals.includes('運動不足解消') || input.preferredStyles.includes('しっかり動く');
  const wantsFlexibility = input.goals.includes('柔軟性向上') || input.bodyConditions.includes('股関節の硬さ');
  const wantsBalance = input.preferredStyles.includes('バランス型');
  const wantsBreathFocus = input.preferredStyles.includes('瞑想重視') || input.preferredStyles.includes('呼吸法重視') || input.goals.includes('瞑想・呼吸法');
  const wantsDigestiveSupport = hasAny(input.bodyConditions, ['冷え', 'むくみ']);

  if (wantsBackCare) {
    if (beginner) {
      return {
        category: '仰臥位・伏臥位',
        title: 'セツ・バンダーサナ（橋のポーズ）',
        description: '仰向けでひざを立て、お尻を小さく持ち上げます。背中と胸まわりをやさしく広げ、腰まわりのこわばりをゆるめる助けになるとされています。',
        practice: '10秒 × 3回',
      };
    }

    return {
      category: '仰臥位・伏臥位',
      title: 'ブジャンガーサナ（コブラのポーズ）',
      description: 'うつ伏せから胸をやさしく持ち上げるポーズです。背中を無理なく動かし、腰まわりの緊張をゆるめるのに役立つとされています。',
      practice: '10秒 × 3回',
    };
  }

  if (wantsStressCare || wantsBreathFocus) {
    if (input.goals.includes('瞑想・呼吸法') || input.preferredStyles.includes('瞑想重視')) {
      return {
        category: '呼吸・瞑想',
        title: '瞑想（1分）',
        description: '楽に座って目を閉じ、呼吸の出入りを静かに見守ります。気持ちを落ち着け、自分の状態を整える時間として役立つとされています。',
        practice: '1分 × 1回',
      };
    }

    return {
      category: '呼吸・瞑想',
      title: 'ブラマリ（ハチの呼吸）',
      description: '息を吐くときに小さくハミングする呼吸法です。顔や肩の力みをやわらげ、気分を静めたいときに役立つとされています。',
      practice: '3呼吸 × 3回',
    };
  }

  if (wantsShoulderPosture) {
    if (!beginner && wantsBalance) {
      return {
        category: '立位',
        title: 'ヴリクシャーサナ（木のポーズ）',
        description: '片足に少しずつ体重をのせて立つポーズです。姿勢を整えながら、肩や体幹をやさしく意識する助けになるとされています。',
        practice: '左右10秒 × 2回',
      };
    }

    return {
      category: '立位',
      title: 'タダーサナ（山のポーズ）',
      description: '足裏で床を感じながらまっすぐ立つ基本のポーズです。胸をひらきやすくなり、姿勢を見直したいときに役立つとされています。',
      practice: '10秒 × 3回',
    };
  }

  if (wantsExercise) {
    if (!beginner) {
      return {
        category: '立位',
        title: 'トリコナーサナ（三角のポーズ）',
        description: '足幅を広げて体の横を気持ちよく伸ばすポーズです。全身を大きく使い、運動不足をやさしくほぐす助けになるとされています。',
        practice: '左右10秒 × 2回',
      };
    }

    return {
      category: '立位',
      title: 'タダーサナ（山のポーズ）',
      description: 'まっすぐ立って呼吸を整える基本のポーズです。体を起こしやすくし、最初の一歩として取り入れやすいとされています。',
      practice: '10秒 × 3回',
    };
  }

  if (wantsFlexibility) {
    return {
      category: '座位',
      title: 'バッダ・コナーサナ（合せきのポーズ）',
      description: '足裏を合わせて座り、股関節まわりをゆっくりゆるめます。体の硬さが気になるときに、やさしくほぐす助けになるとされています。',
      practice: '15秒 × 2回',
    };
  }

  if (wantsDigestiveSupport) {
    return {
      category: '座位',
      title: 'ヴァジュラーサナ（正座のポーズ）',
      description: '無理のない正座で背すじを整えて座ります。体を落ち着けながら、お腹まわりを静かに整える時間として役立つとされています。',
      practice: '20秒 × 2回',
    };
  }

  if (beginner) {
    return {
      category: '立位',
      title: 'タダーサナ（山のポーズ）',
      description: '足を腰幅に開いて立ち、肩の力を抜いて呼吸します。はじめてでも取り入れやすく、姿勢を整える基本として役立つとされています。',
      practice: '10秒 × 3回',
    };
  }

  return {
    category: '呼吸・瞑想',
    title: 'ナディ・ショーダナ（片鼻呼吸）',
    description: '左右の鼻を交互に使い、ゆっくり呼吸のリズムを整える方法です。気持ちを切り替えたいときや、呼吸を落ち着けたいときに役立つとされています。',
    practice: '3呼吸 × 2回',
  };
}

'''
app_text = app_text[:start] + new_helper + app_text[end:]
app_text = app_text.replace('recommendedYogaFlow: buildRecommendedYogaFlow(input),', 'recommendedYogaPose: buildRecommendedYogaPose(input),')
app.write_text(app_text)

result_page.write_text('''import { SearchItem } from '../data';
import { CardList } from './CardList';
import { MapView } from './MapView';

export interface YogaPoseRecommendation {
  category: string;
  title: string;
  description: string;
  practice: string;
}

export interface DiagnosisResult {
  typeName: string;
  summary: string;
  recommendedYogaPose: YogaPoseRecommendation;
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
  const pose = result.recommendedYogaPose;

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
            <strong>おすすめヨガポーズ</strong>
            <p>インド政府制定「共通ヨガ・プロトコル」を参考に、診断内容に合いやすい1つを選んでいます。まずは自宅で気軽に試せます。</p>
          </div>

          <div className="result-order-card">
            <span className="result-focus-label">表示順</span>
            <ol className="result-order-list">
              <li><span>1</span><div>診断タイプ</div></li>
              <li><span>2</span><div>おすすめヨガポーズ</div></li>
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

      <section className="panel result-section yoga-pose-panel">
        <div className="section-inline-header tight">
          <div className="result-section-heading">
            <span className="result-step-badge gold">STEP 2</span>
            <h3>あなたにおすすめのヨガポーズ</h3>
            <p className="result-section-copy">
              インド政府制定「共通ヨガ・プロトコル」を参考に、診断内容から今のあなたが始めやすい1つを選んでいます。痛みが出るほど無理をせず、呼吸が苦しくない範囲で試してください。
            </p>
          </div>
        </div>

        <article className="yoga-pose-card">
          <div className="yoga-pose-header">
            <span className="yoga-pose-category">{pose.category}</span>
            <h4>{pose.title}</h4>
          </div>
          <p className="yoga-pose-description">{pose.description}</p>
          <div className="yoga-pose-practice-box">
            <span>実践目安</span>
            <strong>{pose.practice}</strong>
            <p>まずはこの目安から始めて、無理がなければ少しずつ慣れていきましょう。</p>
          </div>
        </article>

        <p className="yoga-pose-note">
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
start_css = css_text.find('\n.yoga-flow-panel {')
if start_css != -1:
    css_text = css_text[:start_css]

css_text += '''

.yoga-pose-panel {
  padding: 34px;
}

.yoga-pose-card {
  display: grid;
  gap: 18px;
  padding: 28px;
  border-radius: 24px;
  border: 1px solid rgba(201,165,76,.28);
  background: linear-gradient(135deg, #fffdf8 0%, #ffffff 58%, #f5faf5 100%);
  box-shadow: 0 16px 32px rgba(16,37,66,.05);
}

.yoga-pose-header {
  display: grid;
  gap: 8px;
}

.yoga-pose-category {
  display: inline-flex;
  width: fit-content;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(108,138,118,.12);
  color: #557565;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .05em;
}

.yoga-pose-card h4 {
  font-size: clamp(24px, 3.2vw, 32px);
  line-height: 1.3;
}

.yoga-pose-description {
  font-size: 16px;
  line-height: 1.85;
}

.yoga-pose-practice-box {
  display: grid;
  gap: 8px;
  padding: 18px 20px;
  border-radius: 18px;
  background: rgba(108,138,118,.08);
  border: 1px solid rgba(108,138,118,.14);
}

.yoga-pose-practice-box span {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .05em;
  color: #557565;
}

.yoga-pose-practice-box strong {
  font-size: 24px;
  color: var(--navy);
}

.yoga-pose-practice-box p {
  color: var(--muted);
  line-height: 1.75;
}

.yoga-pose-note {
  margin-top: 16px;
  font-size: 14px;
  color: var(--muted);
}

@media (max-width: 640px) {
  .yoga-pose-panel {
    padding: 24px 22px;
  }

  .yoga-pose-card {
    padding: 20px;
    border-radius: 20px;
  }

  .yoga-pose-card h4 {
    font-size: 22px;
  }

  .yoga-pose-description {
    font-size: 15px;
    line-height: 1.8;
  }

  .yoga-pose-practice-box strong {
    font-size: 21px;
  }

  .yoga-pose-note {
    font-size: 13px;
    line-height: 1.7;
  }
}
'''
css.write_text(css_text)
print('Updated result page to a single protocol-based yoga pose recommendation.')
