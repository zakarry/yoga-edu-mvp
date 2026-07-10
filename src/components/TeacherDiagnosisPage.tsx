import { FormEvent, useMemo, useState } from 'react';
import { TopBackLink } from './TopBackLink';

interface TeacherDiagnosisPageProps {
  onOpenListingSelect: () => void;
  onOpenTeacherRegister: () => void;
  onOpenProYoga: () => void;
  onBackHome: () => void;
}

type TeacherScoreKey = 'teaching' | 'reliability' | 'system' | 'activity' | 'international';

type ChoiceValue = string | string[];

interface TeacherDiagnosisInput {
  teachingYears: string;
  activityStyles: string[];
  certifications: string[];
  trustAssets: string[];
  teachingFocus: string[];
  lessonOperations: string[];
  curriculumDesign: string[];
  brandingChannels: string[];
  careerActivities: string[];
  languageSupport: string[];
  internationalReadiness: string[];
}

interface TeacherScores {
  teaching: number;
  reliability: number;
  system: number;
  activity: number;
  international: number;
}

interface TeacherDiagnosisResult {
  typeName: string;
  headline: string;
  summary: string;
  recommendationHeading: string;
  recommendations: string[];
  scores: TeacherScores;
  strengths: string[];
  improvementPoints: string[];
}

interface SectionQuestion {
  key: keyof TeacherDiagnosisInput;
  title: string;
  description: string;
  multiple: boolean;
  options: string[];
}

const axisMeta: Array<{ key: TeacherScoreKey; label: string; description: string }> = [
  { key: 'teaching', label: '指導力', description: '安心感のある進行、対象別の伝え方、現場での実践力' },
  { key: 'reliability', label: '信頼性', description: '資格・プロフィール・実績整理による信頼の伝わりやすさ' },
  { key: 'system', label: '体系化力', description: '体験から継続につなぐ設計、コース化、学びの見せ方' },
  { key: 'activity', label: '集客・活動力', description: '発信導線、登壇・提案・連携など活動の広がり' },
  { key: 'international', label: '国際対応力', description: '多言語案内、外国人受け入れ、国際向けプロフィールの整備' },
];

const diagnosisSections: Array<{ category: string; eyebrow: string; items: SectionQuestion[] }> = [
  {
    category: '基本',
    eyebrow: 'Basic',
    items: [
      {
        key: 'teachingYears',
        title: '1. 現在の指導歴',
        description: 'もっとも近いものを1つ選択',
        multiple: false,
        options: ['これから本格化', '1年未満', '1〜3年', '4〜7年', '8年以上'],
      },
      {
        key: 'activityStyles',
        title: '2. 現在の活動スタイル',
        description: '複数選択可',
        multiple: true,
        options: ['対面中心', 'オンライン対応', 'グループ指導', '個別指導', 'スクール所属', '自主開催レッスン', '企業・法人向け'],
      },
    ],
  },
  {
    category: '資格・信頼性',
    eyebrow: 'Trust',
    items: [
      {
        key: 'certifications',
        title: '3. 資格・学習状況',
        description: '複数選択可',
        multiple: true,
        options: ['資格取得前', '民間資格を学習中', 'RYT200修了', 'RYT500・上位資格あり', '解剖学・安全性講座修了', 'プロフェッショナルYoga検定に興味がある', 'プロフェッショナルYoga検定取得済み'],
      },
      {
        key: 'trustAssets',
        title: '4. 信頼づくりの状況',
        description: '複数選択可',
        multiple: true,
        options: ['プロフィールを整えたい', '受講者の声がある', 'Webサイト・SNS導線がある', 'レッスン方針を説明できる', 'キャンセルポリシー等を整えている', '継続案内や次回提案ができる'],
      },
    ],
  },
  {
    category: '指導力',
    eyebrow: 'Teaching',
    items: [
      {
        key: 'teachingFocus',
        title: '5. 得意な対象・テーマ',
        description: '複数選択可',
        multiple: true,
        options: ['初心者向け', '姿勢改善サポート', 'リラックス・呼吸法', '柔軟性アップ', 'シニア・やさしい強度', '企業ウェルネス', '指導者向け'],
      },
      {
        key: 'lessonOperations',
        title: '6. レッスン運営で意識していること',
        description: '複数選択可',
        multiple: true,
        options: ['安全に進める', '言葉でわかりやすく伝える', '見本を見せながら進める', '一人ひとりに声をかける', '目的に合わせて調整する', 'レッスン後の振り返りがある'],
      },
      {
        key: 'curriculumDesign',
        title: '7. 継続・学びの設計',
        description: '複数選択可',
        multiple: true,
        options: ['単発中心', '4回以上の継続プランがある', '体験→継続の流れがある', '目的別コースを分けている', '記録シートや目標設定がある', '資格学習やステップアップ導線がある'],
      },
    ],
  },
  {
    category: '集客・キャリア',
    eyebrow: 'Growth',
    items: [
      {
        key: 'brandingChannels',
        title: '8. 発信・集客の導線',
        description: '複数選択可',
        multiple: true,
        options: ['紹介・口コミ', 'Instagram', 'LINE・メール', 'ブログ・note', 'ポータル掲載', '体験会導線がある', '法人営業・提案'],
      },
      {
        key: 'careerActivities',
        title: '9. 活動実績・広がり',
        description: '複数選択可',
        multiple: true,
        options: ['自主開催レッスン', 'イベント登壇', 'コラボ開催', 'スクール代行・所属', '企業案件の経験', '地方・遠征対応', 'コミュニティ運営'],
      },
    ],
  },
  {
    category: '国際対応',
    eyebrow: 'International',
    items: [
      {
        key: 'languageSupport',
        title: '10. 言語対応の状況',
        description: '複数選択可',
        multiple: true,
        options: ['日本語', 'やさしい英語案内ができる', '英語でレッスン進行できる', '中国語案内ができる', 'イタリア語案内ができる'],
      },
      {
        key: 'internationalReadiness',
        title: '11. 外国人受け入れの準備',
        description: '複数選択可',
        multiple: true,
        options: ['外国人参加者の受け入れ経験あり', '英語でクラス案内を用意できる', '通訳付きなら対応できる', '文化の違いに配慮して進行できる', '海外向けプロフィールを作りたい', '今後検討したい'],
      },
    ],
  },
];

const initialInput: TeacherDiagnosisInput = {
  teachingYears: 'これから本格化',
  activityStyles: ['対面中心'],
  certifications: ['民間資格を学習中'],
  trustAssets: ['プロフィールを整えたい'],
  teachingFocus: ['初心者向け'],
  lessonOperations: ['安全に進める', '言葉でわかりやすく伝える'],
  curriculumDesign: ['単発中心'],
  brandingChannels: ['紹介・口コミ'],
  careerActivities: ['自主開催レッスン'],
  languageSupport: ['日本語'],
  internationalReadiness: ['今後検討したい'],
};

function toggleItem(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function hasAny(list: string[], targets: string[]) {
  return targets.some((target) => list.includes(target));
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildTeacherScores(input: TeacherDiagnosisInput): TeacherScores {
  const teachingYearScore: Record<string, number> = {
    'これから本格化': 18,
    '1年未満': 32,
    '1〜3年': 54,
    '4〜7年': 74,
    '8年以上': 86,
  };

  const teaching = clampScore(
    (teachingYearScore[input.teachingYears] ?? 20)
      + Math.min(input.teachingFocus.length, 4) * 7
      + Math.min(input.lessonOperations.length, 5) * 8
      + (input.activityStyles.includes('グループ指導') ? 5 : 0)
      + (input.activityStyles.includes('個別指導') ? 5 : 0),
  );

  const reliability = clampScore(
    (hasAny(input.certifications, ['資格取得前']) ? 8 : 18)
      + (hasAny(input.certifications, ['民間資格を学習中']) ? 12 : 0)
      + (hasAny(input.certifications, ['RYT200修了']) ? 22 : 0)
      + (hasAny(input.certifications, ['RYT500・上位資格あり']) ? 28 : 0)
      + (hasAny(input.certifications, ['解剖学・安全性講座修了']) ? 18 : 0)
      + (hasAny(input.certifications, ['プロフェッショナルYoga検定取得済み']) ? 20 : 0)
      + (hasAny(input.certifications, ['プロフェッショナルYoga検定に興味がある']) ? 6 : 0)
      + Math.min(input.trustAssets.length, 5) * 7,
  );

  const system = clampScore(
    (input.curriculumDesign.includes('単発中心') ? 12 : 0)
      + (input.curriculumDesign.includes('4回以上の継続プランがある') ? 18 : 0)
      + (input.curriculumDesign.includes('体験→継続の流れがある') ? 18 : 0)
      + (input.curriculumDesign.includes('目的別コースを分けている') ? 18 : 0)
      + (input.curriculumDesign.includes('記録シートや目標設定がある') ? 16 : 0)
      + (input.curriculumDesign.includes('資格学習やステップアップ導線がある') ? 18 : 0)
      + (input.trustAssets.includes('継続案内や次回提案ができる') ? 8 : 0)
      + (input.lessonOperations.includes('レッスン後の振り返りがある') ? 8 : 0),
  );

  const activity = clampScore(
    Math.min(input.brandingChannels.length, 5) * 9
      + Math.min(input.careerActivities.length, 5) * 9
      + (input.activityStyles.includes('自主開催レッスン') ? 8 : 0)
      + (input.activityStyles.includes('スクール所属') ? 8 : 0)
      + (input.activityStyles.includes('企業・法人向け') ? 12 : 0),
  );

  const international = clampScore(
    (input.languageSupport.includes('日本語') ? 10 : 0)
      + (input.languageSupport.includes('やさしい英語案内ができる') ? 16 : 0)
      + (input.languageSupport.includes('英語でレッスン進行できる') ? 28 : 0)
      + (input.languageSupport.includes('中国語案内ができる') ? 16 : 0)
      + (input.languageSupport.includes('イタリア語案内ができる') ? 16 : 0)
      + (input.internationalReadiness.includes('外国人参加者の受け入れ経験あり') ? 18 : 0)
      + (input.internationalReadiness.includes('英語でクラス案内を用意できる') ? 16 : 0)
      + (input.internationalReadiness.includes('通訳付きなら対応できる') ? 8 : 0)
      + (input.internationalReadiness.includes('文化の違いに配慮して進行できる') ? 14 : 0)
      + (input.internationalReadiness.includes('海外向けプロフィールを作りたい') ? 8 : 0),
  );

  return {
    teaching,
    reliability,
    system,
    activity,
    international,
  };
}

function buildTeacherDiagnosisResult(input: TeacherDiagnosisInput): TeacherDiagnosisResult {
  const scores = buildTeacherScores(input);
  const rankedAxes = [...axisMeta].sort((a, b) => scores[b.key] - scores[a.key]);

  const strengthCatalog: Record<TeacherScoreKey, string> = {
    teaching: '生徒に伝える基礎があり、安心感のある進行に強みがあります。',
    reliability: '経験や資格を信頼に変えやすい土台ができています。',
    system: '単発で終わらせず、継続導線につなぐ設計力があります。',
    activity: '集客や外部接点を広げる行動力が育っています。',
    international: '多言語案内や外国人受け入れに広げられる素地があります。',
  };

  const improvementCatalog: Record<TeacherScoreKey, string> = {
    teaching: '対象別の声かけや目的に合わせた調整を増やすと、満足度をさらに高めやすくなります。',
    reliability: '資格・掲載文・受講者の声を整理すると、経験がより伝わりやすくなります。',
    system: '体験→継続の流れやコース設計を整えると、経験を信頼に変えやすくなります。',
    activity: '紹介以外の導線を1つ増やすと、集客の波を安定させやすくなります。',
    international: 'やさしい英語案内や受け入れフローを整えると、国際対応の入口を作りやすくなります。',
  };

  let typeName = 'スタートアップ講師型';
  let headline = '経験を信頼に変える準備を始めやすいタイミングです。';
  let summary = '指導の土台はこれから十分に伸ばせる段階です。まずはプロフィール、得意分野、継続導線を整えることで、安心して選ばれやすい先生像に近づいていけます。';
  let recommendationHeading = 'まず整えたい3つのポイント';
  let recommendations = [
    'プロフィール文に「誰に、どんな時間を届けたいか」を短く入れる',
    '体験レッスンから次回提案につながる流れを1つ作る',
    'プロフェッショナルYoga検定の導線を確認し、信頼の見せ方を増やす',
  ];

  if (
    scores.international >= 70
    && (input.languageSupport.includes('英語でレッスン進行できる')
      || input.internationalReadiness.includes('外国人参加者の受け入れ経験あり')
      || input.internationalReadiness.includes('英語でクラス案内を用意できる'))
  ) {
    typeName = '国際対応強化型';
    headline = '今の経験を、国際対応の信頼へ広げていけるタイプです。';
    summary = 'すでに言語対応や受け入れ準備の素地があります。案内文やプロフィールを整えると、海外の方や在日外国人にも選ばれやすい先生像を作りやすくなります。';
    recommendationHeading = '国際導線を育てる次の一歩';
    recommendations = [
      '英語または多言語で、クラス紹介と参加案内を1枚にまとめる',
      '受け入れ時の説明フローを短く定型化し、安心感を高める',
      'プロフェッショナルYoga検定や掲載情報と組み合わせ、国際対応の信頼を見える化する',
    ];
  } else if (scores.activity >= 74 && scores.reliability >= 68 && scores.teaching >= 68) {
    typeName = 'スクール・法人案件拡大型';
    headline = '個人活動から、スクール連携や法人案件へ広げやすい段階です。';
    summary = '指導・信頼・活動のバランスが育っています。実績の見せ方と提案資料を整えることで、スクール提携や企業ウェルネス案件につながりやすくなります。';
    recommendationHeading = '拡張フェーズで意識したいこと';
    recommendations = [
      '導入事例や得意テーマを3行で伝えられる提案文を作る',
      '企業向け・スクール向けの2種類の案内導線を分けて整理する',
      'プロフェッショナルYoga検定を次の信頼材料として活用する',
    ];
  } else if (scores.activity >= 70 && (scores.activity >= scores.system + 10 || scores.activity >= scores.reliability + 8)) {
    typeName = '集客・ブランディング強化型';
    headline = '魅力は伝わり始めているので、見せ方を整えるとさらに伸びやすいタイプです。';
    summary = '発信や活動の広がりは十分あります。ここに信頼づくりや継続設計を足すことで、単発で終わらず継続受講につながる導線を作りやすくなります。';
    recommendationHeading = '見せ方を整える改善ポイント';
    recommendations = [
      '発信内容を「誰向け」「何が得意か」で整理し、プロフィールとそろえる',
      '体験後の継続プランを1つ明確にして、迷わず次へ進めるようにする',
      '資格や検定の学習状況を公開し、安心感を補強する',
    ];
  } else if (scores.teaching >= 64 && scores.system < 72) {
    typeName = '現場経験あり・体系化強化型';
    headline = '現場で培った良さを、継続される仕組みに変えていけるタイプです。';
    summary = '指導力はしっかり育っています。次はレッスンの流れ、コース設計、継続提案を整えることで、経験を信頼に変える速度を上げやすくなります。';
    recommendationHeading = '体系化で伸ばしたいポイント';
    recommendations = [
      '体験・通常・継続の3段階でメニューを分ける',
      '目的別コースや記録シートを用意し、変化を見える化する',
      'プロフェッショナルYoga検定を、経験の整理と信頼補強に活用する',
    ];
  }

  return {
    typeName,
    headline,
    summary,
    recommendationHeading,
    recommendations,
    scores,
    strengths: rankedAxes.slice(0, 2).map((item) => strengthCatalog[item.key]),
    improvementPoints: rankedAxes.slice(-2).reverse().map((item) => improvementCatalog[item.key]),
  };
}

function getRadarPolygonPoints(scores: TeacherScores, ratio = 1) {
  const center = 120;
  const radius = 82 * ratio;
  const values = axisMeta.map((axis) => scores[axis.key] / 100);
  return values
    .map((value, index) => {
      const angle = (Math.PI * 2 * index) / values.length - Math.PI / 2;
      const distance = radius * value;
      const x = center + Math.cos(angle) * distance;
      const y = center + Math.sin(angle) * distance;
      return `${x},${y}`;
    })
    .join(' ');
}

function getRadarLabelPosition(index: number, total: number) {
  const center = 120;
  const radius = 102;
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
  };
}

function QuestionBlock({
  question,
  value,
  onChange,
}: {
  question: SectionQuestion;
  value: ChoiceValue;
  onChange: (nextValue: ChoiceValue) => void;
}) {
  const selectedValues = Array.isArray(value) ? value : [value];

  return (
    <section className="panel form-panel teacher-question-panel">
      <div className="section-inline-header teacher-question-header">
        <div>
          <h3>{question.title}</h3>
          <span>{question.description}</span>
        </div>
      </div>
      <div className="chip-grid teacher-chip-grid">
        {question.options.map((option) => {
          const active = selectedValues.includes(option);
          return (
            <button
              type="button"
              key={option}
              className={active ? 'select-chip active teacher-select-chip' : 'select-chip teacher-select-chip'}
              onClick={() => {
                if (question.multiple) {
                  onChange(toggleItem(Array.isArray(value) ? value : [], option));
                  return;
                }
                onChange(option);
              }}
            >
              {option}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function TeacherDiagnosisPage({ onOpenListingSelect, onOpenTeacherRegister, onOpenProYoga, onBackHome }: TeacherDiagnosisPageProps) {
  const [form, setForm] = useState<TeacherDiagnosisInput>(initialInput);
  const [result, setResult] = useState<TeacherDiagnosisResult | null>(null);

  const selectedCount = useMemo(() => {
    return Object.values(form).reduce((count, value) => {
      if (Array.isArray(value)) return count + value.length;
      return value ? count + 1 : count;
    }, 0);
  }, [form]);

  const scorePreview = useMemo(() => buildTeacherScores(form), [form]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setResult(buildTeacherDiagnosisResult(form));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (result) {
    const radarPoints = getRadarPolygonPoints(result.scores);

    return (
      <div className="page-shell teacher-diagnosis-page teacher-diagnosis-result-page">
        <section className="hero-panel federation-hero teacher-diagnosis-hero teacher-result-hero">
          <div>
            <TopBackLink onBackHome={onBackHome} />
            <span className="eyebrow">Teacher AI Diagnosis</span>
            <h1>あなたの先生タイプ：{result.typeName}</h1>
            <p className="teacher-result-headline">{result.headline}</p>
            <p>{result.summary}</p>
          </div>
          <div className="teacher-diagnosis-hero-card status-card gold-accent teacher-result-summary-card">
            <strong>診断の見方</strong>
            <p>5つの軸で、今の強みと次に整えるポイントを見える化しています。売り込みではなく、経験を信頼に変えるための整理メモとして使えます。</p>
            <div className="hero-actions teacher-result-hero-actions">
              <button type="button" className="secondary-button" onClick={() => setResult(null)}>もう一度診断する</button>
            </div>
          </div>
        </section>

        <section className="panel teacher-result-panel teacher-chart-panel">
          <div className="section-inline-header tight">
            <div className="result-section-heading">
              <span className="result-step-badge gold">5軸スコア</span>
              <h3>現在地の見える化</h3>
              <p className="result-section-copy">指導・信頼・体系化・集客・国際対応の5軸を100点満点で表示しています。高い項目は強みとして、低い項目は次の改善テーマとして確認できます。</p>
            </div>
          </div>

          <div className="teacher-score-visuals">
            <div className="teacher-radar-card">
              <svg viewBox="0 0 240 240" className="teacher-radar-chart" aria-label="先生診断のレーダーチャート">
                {[0.25, 0.5, 0.75, 1].map((ratio) => (
                  <polygon
                    key={ratio}
                    points={getRadarPolygonPoints({
                      teaching: ratio * 100,
                      reliability: ratio * 100,
                      system: ratio * 100,
                      activity: ratio * 100,
                      international: ratio * 100,
                    }, 1)}
                    className="teacher-radar-grid"
                  />
                ))}
                {axisMeta.map((axis, index) => {
                  const angle = (Math.PI * 2 * index) / axisMeta.length - Math.PI / 2;
                  const x = 120 + Math.cos(angle) * 82;
                  const y = 120 + Math.sin(angle) * 82;
                  const labelPos = getRadarLabelPosition(index, axisMeta.length);
                  return (
                    <g key={axis.key}>
                      <line x1="120" y1="120" x2={x} y2={y} className="teacher-radar-axis" />
                      <text x={labelPos.x} y={labelPos.y} className="teacher-radar-label" textAnchor="middle" dominantBaseline="middle">
                        {axis.label}
                      </text>
                    </g>
                  );
                })}
                <polygon points={radarPoints} className="teacher-radar-data" />
              </svg>
            </div>

            <div className="teacher-bar-chart">
              {axisMeta.map((axis) => (
                <div key={axis.key} className="teacher-bar-row">
                  <div className="teacher-bar-copy">
                    <strong>{axis.label}</strong>
                    <span>{axis.description}</span>
                  </div>
                  <div className="teacher-bar-track" aria-hidden="true">
                    <div className="teacher-bar-fill" style={{ width: `${result.scores[axis.key]}%` }} />
                  </div>
                  <strong className="teacher-bar-value">{result.scores[axis.key]}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel teacher-result-panel">
          <div className="teacher-result-grid">
            <article className="teacher-result-card">
              <span className="teacher-result-kicker">Strengths</span>
              <h3>強み</h3>
              <ul className="teacher-result-list">
                {result.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            <article className="teacher-result-card teacher-result-card-soft">
              <span className="teacher-result-kicker">Next Focus</span>
              <h3>改善ポイント</h3>
              <ul className="teacher-result-list">
                {result.improvementPoints.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className="panel teacher-result-panel teacher-recommendation-panel">
          <div className="section-inline-header tight">
            <div className="result-section-heading">
              <span className="result-step-badge">おすすめの進め方</span>
              <h3>{result.recommendationHeading}</h3>
            </div>
          </div>
          <div className="teacher-recommendation-list">
            {result.recommendations.map((item, index) => (
              <article key={item} className="teacher-recommendation-card">
                <span>{index + 1}</span>
                <p>{item}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel teacher-result-panel teacher-next-step-panel">
          <div className="teacher-next-step-copy">
            <span className="eyebrow business-eyebrow">Next Step</span>
            <h3>プロフェッショナルYoga検定で、経験を信頼に変える</h3>
            <p>
              今の強みを言語化し、掲載や提案時の安心感につなげたい先生には、プロフェッショナルYoga検定の導線確認が役立ちます。
              「資格を取らないとダメ」という話ではなく、これまでの経験をより伝わる形に整えるための次の一歩として使えます。
            </p>
          </div>
          <div className="business-entry-actions teacher-diagnosis-actions teacher-next-step-actions">
            <button type="button" className="secondary-button business-entry-button" onClick={onOpenTeacherRegister}>先生として掲載する</button>
            <button type="button" className="gold-button business-entry-button" onClick={onOpenProYoga}>プロフェッショナルYoga検定を見る</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <form className="page-shell teacher-diagnosis-page" onSubmit={handleSubmit}>
      <section className="hero-panel federation-hero teacher-diagnosis-hero">
        <div>
          <TopBackLink onBackHome={onBackHome} />
          <span className="eyebrow">For Teachers</span>
          <h1>先生AI診断</h1>
          <p>
            先生としての現在地を、指導力・信頼性・体系化力・集客/活動力・国際対応力の5軸で整理します。
            強みを見つけ、次に整えるポイントを確認するための、キャリア整理用の診断ページです。
          </p>
        </div>
        <div className="teacher-diagnosis-hero-card status-card gold-accent">
          <strong>この診断でわかること</strong>
          <p>先生タイプ、5軸スコア、強み、改善ポイント、次に進みやすい導線をまとめて確認できます。</p>
          <div className="teacher-score-preview">
            {axisMeta.map((axis) => (
              <div key={axis.key} className="teacher-score-preview-item">
                <span>{axis.label}</span>
                <strong>{scorePreview[axis.key]}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel teacher-diagnosis-intro-panel">
        <div className="section-inline-header tight">
          <div>
            <span className="eyebrow business-eyebrow">Guide</span>
            <h2>11セクションで診断します</h2>
            <p className="teacher-intro-copy">
              現在の選択数は <strong>{selectedCount}</strong> 項目です。該当するものを上から選ぶだけで進められます。
              先生・スクール・法人案件への展開や、将来の掲載導線にもつながる設計です。
            </p>
          </div>
        </div>
      </section>

      <div className="teacher-diagnosis-groups">
        {diagnosisSections.map((group) => (
          <section key={group.category} className="teacher-diagnosis-group">
            <div className="teacher-group-heading">
              <span className="eyebrow business-eyebrow">{group.eyebrow}</span>
              <h2>{group.category}</h2>
            </div>
            <div className="teacher-question-grid">
              {group.items.map((question) => (
                <QuestionBlock
                  key={question.key}
                  question={question}
                  value={form[question.key]}
                  onChange={(nextValue) => setForm((prev) => ({ ...prev, [question.key]: nextValue } as TeacherDiagnosisInput))}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="panel teacher-diagnosis-cta-panel">
        <div className="teacher-diagnosis-cta-copy">
          <h3>次の一歩を確認する</h3>
          <p>売り込みではなく、今の経験をどう見せていくかを整理するための診断です。結果では、先生タイプ、5軸スコア、改善ポイントをわかりやすく表示します。</p>
        </div>
        <div className="business-entry-actions teacher-diagnosis-actions">
          <button type="button" className="ghost-button business-entry-button" onClick={onOpenListingSelect}>掲載する</button>
          <button type="submit" className="primary-button business-entry-button teacher-diagnosis-submit">先生AI診断を実行する</button>
        </div>
      </section>
    </form>
  );
}
