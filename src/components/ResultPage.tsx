import { useEffect, useState } from 'react';
import { SearchItem } from '../data';
import { CardList } from './CardList';
import { MapView } from './MapView';
import { TopBackLink } from './TopBackLink';

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
  shouldShowBoxBreathing: boolean;
  shouldHighlightProYoga: boolean;
  shouldShowInternationalSupport: boolean;
  internationalSupportTitle: string;
  internationalSupportSummary: string;
  internationalSupportNotes: string[];
}

export interface ResultScoreSummaryItem {
  key: string;
  label: string;
  description: string;
  value: number;
}

interface ResultPageProps {
  result: DiagnosisResult;
  scoreSummary?: ResultScoreSummaryItem[];
  onRestart: () => void;
  onOpenSearch: () => void;
  onBackHome: () => void;
  onOpenMyPage: () => void;
  onOpenProYoga: () => void;
  onDetail: (item: SearchItem) => void;
}

const BOX_BREATHING_PHASES = [
  {
    label: '吸う',
    seconds: 4,
    body: '鼻からゆっくり吸って、胸やお腹にやさしく空気を入れます。',
  },
  {
    label: '止める',
    seconds: 4,
    body: '苦しくない範囲で、そのまま静かにキープします。',
  },
  {
    label: '吐く',
    seconds: 4,
    body: '鼻から細く長く吐いて、肩の力も一緒にゆるめます。',
  },
  {
    label: '止める',
    seconds: 4,
    body: '次の呼吸の前に、落ち着いてひと呼吸ぶん間を取ります。',
  },
] as const;

function BoxBreathingExperience() {
  const [runId, setRunId] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(4);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    setRunId(1);
  }, []);

  useEffect(() => {
    if (runId === 0) return;

    const timers: number[] = [];
    setIsRunning(true);
    setIsCompleted(false);

    const schedulePhase = (index: number) => {
      setPhaseIndex(index);
      setRemainingSeconds(4);

      timers.push(window.setTimeout(() => setRemainingSeconds(3), 1000));
      timers.push(window.setTimeout(() => setRemainingSeconds(2), 2000));
      timers.push(window.setTimeout(() => setRemainingSeconds(1), 3000));

      if (index < BOX_BREATHING_PHASES.length - 1) {
        timers.push(window.setTimeout(() => schedulePhase(index + 1), 4000));
        return;
      }

      timers.push(
        window.setTimeout(() => {
          setIsRunning(false);
          setIsCompleted(true);
        }, 4000),
      );
    };

    schedulePhase(0);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [runId]);

  const currentPhase = BOX_BREATHING_PHASES[phaseIndex] ?? BOX_BREATHING_PHASES[0];

  return (
    <div className="breathing-experience-layout">
      <div className="breathing-visual-panel">
        <div className="breathing-orb-stage">
          <div className="breathing-orb-halo" />
          <div
            key={runId}
            className={`breathing-circle ${isRunning ? 'is-running' : ''} ${isCompleted ? 'is-completed' : ''}`}
            aria-live="polite"
          >
            <div className="breathing-circle-content">
              <strong>{isCompleted ? '完了' : currentPhase.label}</strong>
              <span>{isCompleted ? '1回終了' : `${remainingSeconds}`}</span>
            </div>
          </div>
        </div>

        <div className="breathing-controls">
          <p className="breathing-live-copy">
            {isCompleted
              ? '1回分が終わりました。落ち着いて続けたいときは、もう一回やるを押してください。'
              : `${currentPhase.label}の時間です。${currentPhase.body}`}
          </p>
          <button type="button" className="secondary-button breathing-replay-button" onClick={() => setRunId((value) => value + 1)}>
            もう一回やる
          </button>
        </div>
      </div>

      <div className="breathing-steps" aria-label="ボックスブリージングの手順">
        <div className="breathing-step">
          <span>1</span>
          <div>
            <strong>鼻から4秒吸う</strong>
            <p>肩を上げすぎず、やさしく息を取り入れます。</p>
          </div>
        </div>
        <div className="breathing-step">
          <span>2</span>
          <div>
            <strong>4秒止める</strong>
            <p>苦しくない範囲で、呼吸を静かにキープします。</p>
          </div>
        </div>
        <div className="breathing-step">
          <span>3</span>
          <div>
            <strong>鼻から4秒吐く</strong>
            <p>細く長く、力を抜きながら吐いていきます。</p>
          </div>
        </div>
        <div className="breathing-step">
          <span>4</span>
          <div>
            <strong>4秒止める</strong>
            <p>次の呼吸の前に、落ち着いて1回区切ります。</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ResultPage({ result, scoreSummary = [], onRestart, onOpenSearch, onBackHome, onOpenMyPage, onOpenProYoga, onDetail }: ResultPageProps) {
  const pose = result.recommendedYogaPose;

  return (
    <div className="page-shell result-page-shell">
      <section className="hero-panel result-hero result-type-panel">
        <div className="result-hero-main">
          <TopBackLink onBackHome={onBackHome} />
          <div className="result-mobile-heading" aria-label="診断タイプ概要">
            <span className="result-mobile-kicker">あなたの診断タイプ</span>
            <h1 className="result-mobile-type-name">{result.typeName}</h1>
            <p className="result-mobile-type-summary">{result.summary}</p>
          </div>

          <span className="eyebrow result-desktop-label">AI Result</span>
          <h1 className="result-type-heading result-desktop-heading">あなたの診断タイプ：{result.typeName}</h1>
          <p className="result-type-summary result-desktop-summary">{result.summary}</p>
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
              <li><span>2</span><div>おすすめポーズ / 呼吸法</div></li>
              <li><span>3</span><div>おすすめスクール</div></li>
              <li><span>4</span><div>おすすめ先生</div></li>
              <li><span>5</span><div>おすすめイベント</div></li>
              <li><span>6</span><div>おすすめヨガクラブ</div></li>
              <li><span>7</span><div>プロYoga検定</div></li>
              <li><span>8</span><div>国際対応</div></li>
              <li><span>9</span><div>地図から探す</div></li>
            </ol>
          </div>

          <div className="hero-actions result-hero-actions">
            <button className="secondary-button" onClick={onOpenSearch}>この条件で探す</button>
            <button className="ghost-button" onClick={onOpenMyPage}>マイページを見る</button>
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

      {result.shouldShowBoxBreathing && (
        <section className="panel result-section breathing-panel">
          <div className="section-inline-header tight">
            <div className="result-section-heading">
              <span className="result-step-badge">呼吸体験</span>
              <h3>今すぐできる呼吸法</h3>
              <p className="result-section-copy">
                ボックスブリージングは、呼吸のリズムをゆっくりそろえたいときに役立つとされています。自動で1回再生されるので、円の動きに合わせて無理のないペースで試してみてください。
              </p>
            </div>
          </div>

          <article className="breathing-card">
            <div className="breathing-card-header">
              <span className="breathing-card-kicker">Box Breathing</span>
              <h4>ボックスブリージング体験</h4>
            </div>

            <BoxBreathingExperience />

            <p className="breathing-repeat">これを3回繰り返してみましょう。苦しくなる前に止めて大丈夫です。</p>
          </article>
        </section>
      )}


      {scoreSummary.length > 0 && (
        <section className="panel result-section result-score-panel">
          <div className="section-inline-header tight">
            <div className="result-section-heading">
              <span className="result-step-badge">スコア</span>
              <h3>今の状態を5つでチェック</h3>
              <p className="result-section-copy">
                初心者でも見やすいように、身体・心・呼吸・理解・実践の5つにまとめています。より細かな8項目の見直しはマイページで確認できます。
              </p>
            </div>
          </div>

          <div className="result-score-summary-grid">
            {scoreSummary.map((item) => (
              <article key={item.key} className="result-score-card">
                <span className="result-score-label">{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.description}</p>
                <div className="result-score-bar" aria-hidden="true">
                  <span style={{ width: `${item.value}%` }} />
                </div>
              </article>
            ))}
          </div>

          <div className="result-score-actions">
            <button type="button" className="ghost-button" onClick={onOpenMyPage}>マイページで詳細を見る</button>
          </div>
        </section>
      )}

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

      {result.shouldShowInternationalSupport && (
        <section className="panel result-section international-support-panel">
          <div className="section-inline-header tight">
            <div className="result-section-heading">
              <span className="result-step-badge">STEP 8</span>
              <h3>国際対応</h3>
              <p className="result-section-copy">{result.internationalSupportSummary}</p>
            </div>
          </div>
          <article className="international-support-card">
            <h4>{result.internationalSupportTitle}</h4>
            <ul className="international-support-list">
              {result.internationalSupportNotes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>
      )}

      <section className="panel result-section rediscovery-panel">
        <div className="section-inline-header tight rediscovery-header">
          <div className="result-section-heading">
            <span className="result-step-badge">再診断</span>
            <h3>今の状態を見直してみる</h3>
            <p className="result-section-copy">
              定期的に自分の状態を見直すことで、より自分に合ったヨガが見つかります
            </p>
          </div>
        </div>

        <article className="rediscovery-card">
          <p>
            体調や気分、生活リズムが変わると、合いやすいヨガの選び方も少しずつ変わります。迷ったときは、今の自分に合わせてもう一度診断してみてください。
          </p>
          <div className="rediscovery-actions">
            <button type="button" className="primary-button" onClick={onRestart}>もう一度診断する</button>
          </div>
          <p className="rediscovery-note">
            直近の診断結果はマイページに保存されます。将来的には、履歴をさらに蓄積しながら変化を見比べられる構造へ広げやすい形を想定しています。
          </p>
        </article>
      </section>

      <MapView items={result.allRecommendedItems} onSelectItem={onDetail} />
    </div>
  );
}
