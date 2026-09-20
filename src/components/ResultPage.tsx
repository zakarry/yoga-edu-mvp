import { useEffect, useState, useRef, type CSSProperties } from 'react';
import { SearchItem } from '../data';
import { CardList } from './CardList';
import { MapView } from './MapView';
import { TopBackLink } from './TopBackLink';
import { BreathworkVisual, buildPhasesFromPattern, type BreathPhase } from './BreathworkVisual';
import { getBreathworkEntry, type BreathworkCatalogEntry, type BreathworkPattern } from '../lib/breathworkCatalog';
import { unlockAudioContext } from '../lib/voiceGuide';
import { createPracticeAudioRuntime, type RuntimeEvent } from '../lib/practiceAudioRuntime';
import { buildBreathworkCues } from '../lib/breathworkCueBuilder';
import { resolveYogaKnowledge, type KnowledgeResolution } from '../lib/knowledgeResolver';

export type RecommendationType = 'asana' | 'pranayama' | 'dhyana';

export interface YogaPoseRecommendation {
  poseId: string | null;
  type: RecommendationType;
  category: string;
  title: string;
  description: string;
  practice: string;
  resolution?: KnowledgeResolution;
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
  onOpenAITeacher: (poseId: string | null) => void;
  onOpenPoseGuide: (poseId: string | null) => void;
  onOpenBreathworkGuide: (entryId: string) => void;
  onDetail: (item: SearchItem) => void;
}

const BOX_BREATHING_STEPS = [
  { num: '1', title: '鼻から4秒吸う', body: '肩を上げすぎず、やさしく息を取り入れます。' },
  { num: '2', title: '4秒止める', body: '苦しくない範囲で、呼吸を静かにキープします。' },
  { num: '3', title: '鼻から4秒吐く', body: '細く長く、力を抜きながら吐いていきます。' },
  { num: '4', title: '4秒止める', body: '次の呼吸の前に、落ち着いて1回区切ります。' },
];

export function BoxBreathingExperience() {
  return <BreathworkExperience entryId="box-breathing" steps={BOX_BREATHING_STEPS} />;
}

export function BreathworkExperience({
  entryId,
  steps,
}: {
  entryId: string;
  steps?: { num: string; title: string; body: string }[];
}) {
  const entry = getBreathworkEntry(entryId);
  const [runId, setRunId] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [activeLayer, setActiveLayer] = useState<number | undefined>(undefined);
  const [subtitle, setSubtitle] = useState('');
  const [preparing, setPreparing] = useState(true);
  const [phaseDuration, setPhaseDuration] = useState<number | undefined>();
  const runtimeRef = useRef<ReturnType<typeof createPracticeAudioRuntime> | null>(null);
  const tickRef = useRef<number | null>(null);
  const phaseStartRef = useRef<number>(0);
  const phaseSecondsRef = useRef<number>(0);

  const phases = entry?.pattern ? buildPhasesFromPattern(entry.pattern) : [];
  const totalRounds = entry?.pattern?.rounds ?? 1;
  const totalDuration = phases.reduce((sum, p) => sum + p.seconds, 0);

  useEffect(() => {
    setRunId(1);
  }, []);

  useEffect(() => {
    if (runId === 0 || phases.length === 0 || !entry) return;

    setIsRunning(true);
    setIsCompleted(false);
    setCurrentRound(1);
    setActiveLayer(undefined);
    setSubtitle('');
    setPreparing(true);
    unlockAudioContext();

    const cues = buildBreathworkCues(entry);
    let phaseIdx = 0;
    let round = 0;

    const isLayered = entry.visual.type === 'layered_breathing';
    const layerCount = entry.visual.layers?.length ?? 3;
    const layerLabels = ['まずお腹へ', '次に胸へ', '最後に鎖骨周辺へ'];
    const exhaleLabels = ['まず鎖骨から', '次に胸へ', '最後にお腹へ'];

    const handleEvent = (event: RuntimeEvent) => {
      if (event.type === 'subtitle') {
        setSubtitle(event.subtitle ?? '');
      } else if (event.type === 'cueStart') {
        const cue = cues[event.cueIndex ?? 0];
        if (cue?.type === 'silence') {
          const dur = cue.durationSec ?? 1;
          phaseIdx = phaseIdx % phases.length;
          if (phaseIdx === 0 && round > 0) {
            setCurrentRound(round + 1);
          }
          setPreparing(false);
          setPhaseIndex(phaseIdx);
          setPhaseDuration(dur);
          setRemainingSeconds(dur);
          phaseStartRef.current = performance.now();
          phaseSecondsRef.current = dur;
          if (tickRef.current) window.clearInterval(tickRef.current);
          tickRef.current = window.setInterval(() => {
            const elapsed = (performance.now() - phaseStartRef.current) / 1000;
            const remaining = Math.max(0, phaseSecondsRef.current - elapsed);
            setRemainingSeconds(remaining);

            if (isLayered) {
              const p = phases[phaseIdx];
              if (!p) return;
              const phaseDur = phaseSecondsRef.current;
              if (phaseDur <= 0) return;
              const third = phaseDur / layerCount;
              const segment = Math.min(layerCount - 1, Math.floor(elapsed / third));
              if (p.key === 'inhale') {
                setActiveLayer(segment);
                setSubtitle(layerLabels[segment] ?? '');
              } else if (p.key === 'exhale') {
                const revSeg = layerCount - 1 - segment;
                setActiveLayer(revSeg);
                setSubtitle(exhaleLabels[segment] ?? '');
              }
            }
          }, 100);
        } else if (cue?.type === 'voice') {
          setPreparing(false);
        }
      } else if (event.type === 'cueEnd') {
        const cue = cues[event.cueIndex ?? 0];
        if (cue?.type === 'silence') {
          phaseIdx++;
          if (phaseIdx >= phases.length) {
            phaseIdx = 0;
            round++;
          }
        }
      } else if (event.type === 'complete') {
        setIsRunning(false);
        setIsCompleted(true);
        setActiveLayer(undefined);
        setPreparing(true);
        if (tickRef.current) {
          window.clearInterval(tickRef.current);
          tickRef.current = null;
        }
      } else if (event.type === 'stateChange') {
        if (event.state === 'completed') {
          setIsRunning(false);
          setIsCompleted(true);
        }
      }
    };

    const runtime = createPracticeAudioRuntime();
    runtime.setSource('practice_audio_runtime');
    runtime.addListener(handleEvent);
    runtimeRef.current = runtime;
    runtime.start({ practiceId: entry.id, cues });

    return () => {
      runtime.dispose();
      runtimeRef.current = null;
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [runId, entryId]);

  useEffect(() => {
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      runtimeRef.current?.dispose();
      runtimeRef.current = null;
    };
  }, []);

  if (!entry) {
    return <p>呼吸法が見つかりません。</p>;
  }

  const currentPhase = phases[phaseIndex];
  const phaseKey: BreathPhase = preparing ? 'idle' : currentPhase?.key ?? 'idle';
  const phaseLabel = currentPhase?.label ?? '準備';

  return (
    <div
      className="breathing-experience-layout bw-experience"
      style={totalDuration > 0 ? ({ '--bw-duration': `${totalDuration}s` } as CSSProperties) : undefined}
    >
      <div className="breathing-visual-panel">
        <h3 className="breathing-practice-title">{entry.nameJa}</h3>
        <BreathworkVisual
          breathwork={entry}
          phase={phaseKey}
          remainingSeconds={remainingSeconds}
          isRunning={isRunning}
          isCompleted={isCompleted}
          activeLayer={activeLayer}
          phaseDurationSeconds={phaseDuration}
        />

        <div className="breathing-controls">
          {isRunning && !preparing && totalRounds > 1 && (
            <span className="breathing-round-indicator">ラウンド {currentRound} / {totalRounds}</span>
          )}
          {subtitle && isRunning && (
            <p className="breathing-live-copy">{subtitle}</p>
          )}
          {!subtitle && isRunning && (
            <p className="breathing-live-copy">{phaseLabel}の時間です</p>
          )}
          {isCompleted && (
            <p className="breathing-live-copy">
              {totalRounds}回分が終わりました。落ち着いて続けたいときは、もう一回やるを押してください。
            </p>
          )}
          {!isRunning && !isCompleted && (
            <p className="breathing-live-copy">準備ができたら開始してください。</p>
          )}
          <button
            type="button"
            className="secondary-button breathing-replay-button"
            onClick={() => { unlockAudioContext(); setRunId((value) => value + 1); }}
          >
            もう一回やる
          </button>
        </div>
      </div>

      {steps && steps.length > 0 && (
        <div className="breathing-steps" aria-label={`${entry.nameJa}の手順`}>
          {steps.map((step) => (
            <div className="breathing-step" key={step.num}>
              <span>{step.num}</span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!steps && entry.instructions.firstRound.length > 0 && (
        <div className="breathing-steps" aria-label={`${entry.nameJa}の手順`}>
          {entry.instructions.firstRound.map((text, i) => (
            <div className="breathing-step" key={i}>
              <span>{i + 1}</span>
              <div>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ResultPage({ result, scoreSummary = [], onRestart, onOpenSearch, onBackHome, onOpenMyPage, onOpenProYoga, onOpenAITeacher, onOpenPoseGuide, onOpenBreathworkGuide, onDetail }: ResultPageProps) {
  const pose = result.recommendedYogaPose;
  const resolution = pose.resolution ?? resolveYogaKnowledge({
    nameJa: pose.title,
    catalogId: pose.poseId,
    typeHint: pose.type,
  });
  const poseAvailable = pose.poseId != null && resolution.catalogId != null && resolution.catalogId !== undefined;
  const hasKnowledge = resolution.status === 'exact' || resolution.status === 'high_confidence';
  const isAsana = pose.type === 'asana';
  const isPranayama = pose.type === 'pranayama';
  const guideLabel = isAsana ? 'お手本を見る' : isPranayama ? '呼吸ガイドを見る' : '瞑想ガイドを見る';
  const preparingLabel = isAsana ? 'このポーズのお手本は現在準備中です。' : isPranayama ? 'この呼吸法のガイドは現在準備中です。' : 'この瞑想ガイドは現在準備中です。';
  const categoryLabel = isAsana ? 'アーサナ' : isPranayama ? '呼吸法' : '瞑想';
  const handleGuideClick = () => {
    if (!poseAvailable) return;
    if (isPranayama) {
      onOpenBreathworkGuide(resolution.catalogId!);
    } else {
      onOpenPoseGuide(resolution.catalogId ?? null);
    }
  };

  return (
    <div className="page-shell result-page-shell">
      {/* 1. 診断タイプ + 自然文の説明 */}
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
            <span className="result-focus-label">まずはこれをやってみましょう</span>
            <strong>{pose.title}</strong>
            <p>{pose.description}</p>
          </div>

          <div className="hero-actions result-hero-actions">
            <button className="gold-button" onClick={() => onOpenAITeacher(resolution.catalogId ?? pose.poseId ?? null)} disabled={!poseAvailable}>今日の実践へ — My AI Teacherと始める</button>
            {hasKnowledge && !poseAvailable && (
              <button className="secondary-button" onClick={() => onOpenAITeacher(null)}>詳しく知る</button>
            )}
            <button className="secondary-button" onClick={onOpenMyPage}>マイページを見る</button>
          </div>
        </div>
      </section>

      {/* 2. まずはこれをやってみましょう（おすすめポーズ + CTA） */}
      <section className="panel result-section yoga-pose-panel">
        <div className="section-inline-header tight">
          <div className="result-section-heading">
            <span className="result-step-badge gold">まずはこれをやってみましょう</span>
            <h3>あなたにおすすめの実践</h3>
            <p className="result-section-copy">
              診断内容から、今のあなたが始めやすいアーサナ・呼吸法・瞑想の中からおすすめを1つ選んでいます。
            </p>
          </div>
        </div>

        <article className="yoga-pose-card">
          <div className="yoga-pose-header">
            <span className="yoga-pose-category">{categoryLabel}</span>
            <h4>{pose.title}</h4>
          </div>
          <p className="yoga-pose-description">{pose.description}</p>
          <div className="yoga-pose-practice-box">
            <span>実践目安</span>
            <strong>{pose.practice}</strong>
            <p>まずはこの目安から始めて、無理がなければ少しずつ慣れていきましょう。</p>
          </div>
          <div className="result-cta-row">
            <button className="secondary-button" onClick={() => onOpenAITeacher(resolution.catalogId ?? pose.poseId ?? null)} disabled={!poseAvailable}>AI先生と実践する</button>
            {hasKnowledge && !poseAvailable ? (
              <button className="ghost-button" onClick={() => onOpenAITeacher(null)}>詳しく知る</button>
            ) : (
              <button className="ghost-button" onClick={handleGuideClick} disabled={!poseAvailable}>{guideLabel}</button>
            )}
          </div>
          {!poseAvailable && (
            <p className="yoga-pose-note">{hasKnowledge ? '実践ガイド準備中' : preparingLabel}</p>
          )}
        </article>

        <p className="yoga-pose-note">
          体調に不安がある場合や、医師から運動制限がある場合は無理をせず、必要に応じて専門家に相談しながら進めてください。
        </p>
      </section>

      {/* おすすめ呼吸法（CTA付き） */}
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
            <div className="result-cta-row">
              <button className="secondary-button" onClick={() => onOpenAITeacher(null)}>AI先生と実践する</button>
              <button className="ghost-button" onClick={() => onOpenPoseGuide(null)}>呼吸ガイドを見る</button>
            </div>
          </article>
        </section>
      )}

      {/* スコア */}
      {scoreSummary.length > 0 && (
        <section className="panel result-section result-score-panel">
          <div className="section-inline-header tight">
            <div className="result-section-heading">
              <span className="result-step-badge">スコア</span>
              <h3>今の状態を5つでチェック</h3>
              <p className="result-section-copy">
                初心者でも見やすいように、身体・心・呼吸・理解・実践の5つにまとめています。より細かな8項目の見直しはマイページで確認できます。
              </p>
              <details className="result-score-explanation">
                <summary>このスコアは？</summary>
                <div className="result-score-explanation-body">
                  <p>
                    あなたが診断で入力した情報（ヨガ経験、運動習慣、目標、好きなスタイル、参加方法、体の状態など）をもとに、8つの項目（柔軟性、筋力・安定、姿勢バランス、ストレス管理、呼吸への意識、ヨガ理解、実践頻度、生活リズム）を算出し、それらを「身体・心・呼吸・理解・実践」の5つにまとめています。
                  </p>
                  <p>
                    プロフィール登録だけでなく、診断で答えたすべての質問がスコアに反映されます。実践記録が増えることで、より精度の高い提案につながります。
                  </p>
                </div>
              </details>
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

      {/* 3. おすすめスクール */}
      <CardList
        title="おすすめスクール"
        items={result.recommendedSchools}
        onDetail={onDetail}
        variant="prioritySchool"
        stepLabel="STEP 3"
        description="まずここを確認すればOKです。あなたに合う学びの入口として、スクールを最優先で大きく表示しています。"
      />

      {/* 4. おすすめ先生 */}
      <CardList
        title="おすすめ先生"
        items={result.recommendedTeachers}
        onDetail={onDetail}
        stepLabel="STEP 4"
        description="スクール候補の次に、相性の良い先生を確認できます。"
      />

      {/* 5. おすすめイベント */}
      <CardList
        title="おすすめイベント"
        items={result.recommendedEvents}
        onDetail={onDetail}
        stepLabel="STEP 5"
        description="体験参加や短期参加から始めたい方に向くイベントです。"
      />

      {/* 6. 近くで探す（地図） */}
      <MapView
        items={result.allRecommendedItems}
        onSelectItem={onDetail}
        title="近くで探す"
        subtitle="おすすめのスクール・先生・イベントを、地図で確認できます。"
      />

      {/* 7. ヨガクラブ */}
      <CardList
        title="おすすめヨガクラブ"
        items={result.recommendedClubs}
        onDetail={onDetail}
        stepLabel="STEP 7"
        description="地域で継続しやすい交流先やコミュニティ候補です。"
      />

      {/* 8. プロYoga検定 */}
      <section className="panel result-section pro-yoga-guide-panel">
        <div className="section-inline-header tight">
          <div className="result-section-heading">
            <span className="result-step-badge">STEP 8</span>
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

      {/* 国際対応 */}
      {result.shouldShowInternationalSupport && (
        <section className="panel result-section international-support-panel">
          <div className="section-inline-header tight">
            <div className="result-section-heading">
              <span className="result-step-badge">国際対応</span>
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

      {/* 8. 今の状態を見直してみる */}
      <section className="panel result-section rediscovery-panel">
        <div className="section-inline-header tight rediscovery-header">
          <div className="result-section-heading">
            <span className="result-step-badge">再診断</span>
            <h3>今の状態を見直してみる</h3>
            <p className="result-section-copy">
              体調・気分・生活リズムが変わると、合うヨガも変わります。目的や状態が変わった時に、もう一度診断してみましょう。
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
    </div>
  );
}
