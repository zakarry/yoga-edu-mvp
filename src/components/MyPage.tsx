import type { SearchItem, StudentDiagnosisInput } from '../data';
import type { DiagnosisResult } from './ResultPage';
import { CardList } from './CardList';

export type WellnessScores = {
  flexibility: number;
  strengthStability: number;
  postureBalance: number;
  stressManagement: number;
  breathFocus: number;
  yogaUnderstanding: number;
  yogaActivity: number;
  lifestyle: number;
};

export interface DiagnosisHistoryRecord {
  id: string;
  createdAt: string;
  input: StudentDiagnosisInput;
  scores: WellnessScores;
  result: DiagnosisResult;
}

interface MyPageProps {
  history: DiagnosisHistoryRecord[];
  onRestart: () => void;
  onDetail: (item: SearchItem) => void;
}

const scoreDefinitions: Array<{
  key: keyof WellnessScores;
  label: string;
  description: string;
}> = [
  { key: 'flexibility', label: '柔軟性', description: '体の伸びやすさや、動きの広がりの目安です。' },
  { key: 'strengthStability', label: '筋力・安定', description: '支える力と、ぐらつきにくさの目安です。' },
  { key: 'postureBalance', label: '姿勢・バランス', description: '姿勢を保ちやすいか、体の軸を感じやすいかを見ています。' },
  { key: 'stressManagement', label: 'ストレスマネジメント', description: '気分の切り替えや、落ち着きを取り戻しやすい感覚の目安です。' },
  { key: 'breathFocus', label: '呼吸・集中', description: '呼吸に意識を向けやすいか、集中しやすいかを表します。' },
  { key: 'yogaUnderstanding', label: '考え方の理解', description: '無理をしない、整える、続けるといったヨガの基本的な考え方の理解度の目安です。' },
  { key: 'yogaActivity', label: '日常の中での実践', description: 'レッスン以外でも、日常や人との関わりの中で無理なく取り入れられているかの目安です。' },
  { key: 'lifestyle', label: 'ライフスタイル', description: '睡眠・運動・生活リズムと、今の取り組みのなじみやすさを見ています。' },
];

const simplifiedScoreGroups: Array<{
  key: string;
  label: string;
  summary: string;
  detailKeys: Array<keyof WellnessScores>;
}> = [
  {
    key: 'body',
    label: '身体',
    summary: '体の動かしやすさと安定感',
    detailKeys: ['flexibility', 'strengthStability', 'postureBalance'],
  },
  {
    key: 'mind',
    label: '心',
    summary: '気分の整え方と毎日のリズム',
    detailKeys: ['stressManagement', 'lifestyle'],
  },
  {
    key: 'breath',
    label: '呼吸',
    summary: '呼吸の深さと集中しやすさ',
    detailKeys: ['breathFocus'],
  },
  {
    key: 'understanding',
    label: '理解',
    summary: '自分に合う続け方の理解',
    detailKeys: ['yogaUnderstanding'],
  },
  {
    key: 'practice',
    label: '実践',
    summary: '日常の中での取り入れやすさ',
    detailKeys: ['yogaActivity'],
  },
];

function formatDate(dateText: string) {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return '保存済み';
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDelta(value: number) {
  if (value > 0) return `+${value}`;
  if (value < 0) return `${value}`;
  return '±0';
}

function deltaTone(value: number) {
  if (value > 0) return 'up';
  if (value < 0) return 'down';
  return 'flat';
}

function averageScore(scores: WellnessScores, keys: Array<keyof WellnessScores>) {
  const total = keys.reduce((sum, key) => sum + scores[key], 0);
  return Math.round(total / keys.length);
}

function buildChangeComment(latest: DiagnosisHistoryRecord, previous?: DiagnosisHistoryRecord) {
  if (!previous) {
    return '初回の記録です。身体だけでなく、心や呼吸、日常での続けやすさも含めて見返せるように、この端末へ保存しています。';
  }

  const deltas = scoreDefinitions.map(({ key, label }) => ({
    key,
    label,
    value: latest.scores[key] - previous.scores[key],
  }));

  const strongestUp = [...deltas].sort((a, b) => b.value - a.value)[0];
  const strongestDown = [...deltas].sort((a, b) => a.value - b.value)[0];
  const largestMove = [...deltas].sort((a, b) => Math.abs(b.value) - Math.abs(a.value))[0];

  if (!largestMove || Math.abs(largestMove.value) < 5) {
    return '前回と近い傾向です。ヨガを運動だけでなく、気分や生活リズムも含めて今のペースで続けていくのがおすすめです。';
  }

  if (strongestUp && strongestUp.value >= 5 && strongestDown && strongestDown.value <= -5) {
    return `${strongestUp.label}は前回より伸びています。一方で今回は${strongestDown.label}をやさしく整えたい傾向も見えるため、無理なく全体のバランスを見ながら続けると良さそうです。`;
  }

  if (strongestUp && strongestUp.value >= 5) {
    return `前回より${strongestUp.label}が高めです。今の自分に合う取り入れ方が見つかり始めているサインとして、その流れを続けながら比べてみましょう。`;
  }

  if (strongestDown && strongestDown.value <= -5) {
    return `今回は${strongestDown.label}をやさしく整えたい流れです。頑張りすぎず、呼吸や生活リズムを見直しながら無理のない形で続けるのがおすすめです。`;
  }

  return '少しずつ変化が見えています。数字は目安として受け取りながら、その時の体調や気分、毎日の過ごし方に合わせて使ってみてください。';
}

export function MyPage({ history, onRestart, onDetail }: MyPageProps) {
  const latest = history[0];
  const previous = history[1];

  if (!latest) {
    return (
      <div className="page-shell mypage-shell">
        <section className="hero-panel compact-hero mypage-hero">
          <div>
            <span className="eyebrow">My Page</span>
            <h2>マイページ</h2>
            <p>
              診断結果をこの端末に保存し、前回との違いを見返せるページです。身体だけでなく、心・呼吸・理解・実践までまとめて確認できます。まだ履歴がないため、まずは無料診断から始めてみましょう。
            </p>
          </div>
          <div className="hero-actions">
            <button type="button" className="primary-button" onClick={onRestart}>無料診断を始める</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell mypage-shell">
      <section className="hero-panel compact-hero mypage-hero">
        <div>
          <span className="eyebrow">My Page</span>
          <h2>身体だけでなく、生活全体の変化を見る</h2>
          <p>
            診断履歴をローカル保存し、最新スコアと前回との差分を見ながら今の傾向を確認できます。医療的な判定ではなく、運動・呼吸・日々の整え方を振り返るための体験設計です。
          </p>
        </div>

        <div className="mypage-status-grid">
          <article className="mypage-status-card">
            <span>最新診断</span>
            <strong>{formatDate(latest.createdAt)}</strong>
            <p>{latest.result.typeName}</p>
          </article>
          <article className="mypage-status-card">
            <span>前回比較</span>
            <strong>{previous ? formatDate(previous.createdAt) : '初回診断'}</strong>
            <p>{previous ? previous.result.typeName : '次回から変化を比較できます'}</p>
          </article>
        </div>
      </section>

      <section className="panel mypage-score-panel">
        <div className="section-inline-header tight">
          <div className="result-section-heading">
            <span className="result-step-badge">最新のスコア</span>
            <h3>まずは5つの見方でチェック</h3>
            <p className="result-section-copy">
              初心者でも見やすいように、身体・心・呼吸・理解・実践の5つにまとめています。詳細は下の展開から確認できます。
            </p>
          </div>
        </div>

        <div className="mypage-summary-grid">
          {simplifiedScoreGroups.map((group) => {
            const value = averageScore(latest.scores, group.detailKeys);
            const diff = previous
              ? value - averageScore(previous.scores, group.detailKeys)
              : null;

            return (
              <article className="mypage-summary-card" key={group.key}>
                <div className="mypage-score-topline">
                  <span>{group.label}</span>
                  {diff === null ? (
                    <small className="mypage-delta-badge flat">初回</small>
                  ) : (
                    <small className={`mypage-delta-badge ${deltaTone(diff)}`}>{formatDelta(diff)}</small>
                  )}
                </div>
                <strong>{value}</strong>
                <p>{group.summary}</p>
                <div className="mypage-score-bar" aria-hidden="true">
                  <span style={{ width: `${value}%` }} />
                </div>
              </article>
            );
          })}
        </div>

        <details className="mypage-details-panel">
          <summary>詳細スコアを見る</summary>
          <div className="mypage-detail-grid">
            {scoreDefinitions.map(({ key, label, description }) => {
              const value = latest.scores[key];
              const diff = previous ? value - previous.scores[key] : null;
              return (
                <article className="mypage-score-card" key={key}>
                  <div className="mypage-score-topline">
                    <span>{label}</span>
                    {diff === null ? (
                      <small className="mypage-delta-badge flat">初回</small>
                    ) : (
                      <small className={`mypage-delta-badge ${deltaTone(diff)}`}>{formatDelta(diff)}</small>
                    )}
                  </div>
                  <strong>{value}</strong>
                  <p className="mypage-score-description">{description}</p>
                  <div className="mypage-score-bar" aria-hidden="true">
                    <span style={{ width: `${value}%` }} />
                  </div>
                </article>
              );
            })}
          </div>
        </details>

        <article className="mypage-comment-card">
          <strong>変化コメント</strong>
          <p>{buildChangeComment(latest, previous)}</p>
        </article>
      </section>

      <section className="panel mypage-pose-panel">
        <div className="section-inline-header tight">
          <div className="result-section-heading">
            <span className="result-step-badge">おすすめポーズ</span>
            <h3>最新診断のおすすめ</h3>
            <p className="result-section-copy">直近の診断で出たおすすめポーズを、マイページでもすぐ見返せます。</p>
          </div>
        </div>

        <article className="yoga-pose-card">
          <div className="yoga-pose-header">
            <span className="yoga-pose-category">{latest.result.recommendedYogaPose.category}</span>
            <h4>{latest.result.recommendedYogaPose.title}</h4>
          </div>
          <p className="yoga-pose-description">{latest.result.recommendedYogaPose.description}</p>
          <div className="yoga-pose-practice-box">
            <span>実践目安</span>
            <strong>{latest.result.recommendedYogaPose.practice}</strong>
            <p>気になるときにすぐ見返せるよう、最新結果を残しています。</p>
          </div>
        </article>
      </section>

      <CardList
        title="最新のおすすめスクール"
        items={latest.result.recommendedSchools.slice(0, 1)}
        onDetail={onDetail}
        variant="prioritySchool"
        stepLabel="おすすめスクール"
        description="最新診断で相性が良かったスクールを、マイページからすぐ確認できます。"
      />

      <section className="panel mypage-storage-panel">
        <div className="mypage-storage-copy">
          <strong>この端末に診断履歴を保存しています</strong>
          <p>
            この端末には直近 {history.length} 件を保持しています。医療評価ではなく、日々の感覚や変化を見返すための体験用メモとして使えます。
          </p>
        </div>
        <div className="mypage-storage-actions">
          <button type="button" className="primary-button" onClick={onRestart}>もう一度診断する</button>
        </div>
      </section>
    </div>
  );
}
