import { useEffect, useState, useRef, useCallback, type CSSProperties } from 'react';
import { SearchItem } from '../data';
import { CardList } from './CardList';
import { MapView } from './MapView';
import { TopBackLink } from './TopBackLink';
import { BreathworkVisual, buildPhasesFromPattern, type BreathPhase } from './BreathworkVisual';
import { getBreathworkEntry, type BreathworkCatalogEntry, type BreathworkPattern } from '../lib/breathworkCatalog';
import { getVoiceGuideEngine, playBreathworkAudio, prepareBreathworkAudio, unlockBreathworkAudio } from '../lib/voiceGuide';
import { getBreathworkIntro, getBreathworkPhaseSequence, usesBreathworkSequence, waitForBreathwork } from '../lib/breathworkSequence';

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
  onOpenAITeacher: () => void;
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
  const [audioFailed, setAudioFailed] = useState(false);
  const timersRef = useRef<number[]>([]);
  const voiceEngine = getVoiceGuideEngine();

  const phases = entry?.pattern ? buildPhasesFromPattern(entry.pattern) : [];
  const totalRounds = entry?.pattern?.rounds ?? 1;
  const totalDuration = phases.reduce((sum, p) => sum + p.seconds, 0);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  }, []);

  const playCue = useCallback((cue: { text: string; audioKey?: string }) => {
    if (cue.audioKey) {
      voiceEngine.speakByKey(cue.audioKey, cue.text);
    } else {
      voiceEngine.speak(cue.text);
    }
    setSubtitle(cue.text);
  }, [voiceEngine]);

  useEffect(() => {
    setRunId(1);
  }, []);

  useEffect(() => {
    if (runId === 0 || phases.length === 0 || !entry) return;

    clearTimers();
    setIsRunning(true);
    setIsCompleted(false);
    setCurrentRound(1);
    setActiveLayer(undefined);
    setSubtitle('');
    voiceEngine.unlock();
    setPreparing(true);
    setAudioFailed(false);

    if (usesBreathworkSequence(entry.id)) {
      const controller = new AbortController();
      const { signal } = controller;
      const intro = getBreathworkIntro(entry);
      const finalCue = { at: 0, text: '最後の呼吸です。', audioKey: 'voice-box-final' };
      const ending = { at: 0, text: '自然な呼吸に戻りましょう。', audioKey: 'voice-abdominal-end-2' };
      const allCues = [...intro, finalCue, ending,
        ...[0, 1].flatMap((round) => phases.flatMap((p) => getBreathworkPhaseSequence(entry, p.key, round)))];
      const durations = new Map<string, number>();
      const loaded = Promise.all([...new Set(allCues.map((c) => c.audioKey).filter((k): k is string => !!k))].map(async (key) => {
        const buffer = await prepareBreathworkAudio(key);
        if (buffer) durations.set(key, buffer.duration);
      }));
      const play = async (cue: { text: string; audioKey?: string }) => {
        if (signal.aborted) return;
        const ok = await playBreathworkAudio(cue, signal, () => setSubtitle(cue.text));
        if (!ok && !signal.aborted) {
          setAudioFailed(true);
          // Failed media still gets a readable subtitle slot, then progresses.
          await waitForBreathwork(Math.max(1200, cue.text.length * 110), signal);
        }
      };
      const run = async () => {
        for (const cue of intro) {
          if (signal.aborted) return;
          await play(cue);
          await waitForBreathwork(400, signal);
        }
        await loaded;
        for (let round = 0; round < totalRounds; round++) {
          if (signal.aborted) return;
          if (round === totalRounds - 1) {
            setPreparing(true);
            await play(finalCue);
            await waitForBreathwork(400, signal);
          }
          for (let index = 0; index < phases.length; index++) {
            if (signal.aborted) return;
            const phase = phases[index];
            const cues = getBreathworkPhaseSequence(entry, phase.key, round);
            const speechSeconds = cues.reduce((sum, cue) => sum + (durations.get(cue.audioKey ?? '') ?? cue.text.length * 0.11 + 1), 0) + Math.max(0, cues.length - 1) * 0.4;
            // Body cues have room to finish within the displayed phase; Box
            // retains its four-second rhythm with its short recorded cues.
            const seconds = entry.id === 'box-breathing' ? phase.seconds : Math.max(phase.seconds, Math.ceil(speechSeconds));
            setPreparing(false);
            setCurrentRound(round + 1);
            setPhaseIndex(index);
            setPhaseDuration(seconds);
            setRemainingSeconds(seconds);
            const started = performance.now();
            const tick = window.setInterval(() => {
              if (!signal.aborted) setRemainingSeconds(Math.max(0, seconds - (performance.now() - started) / 1000));
            }, 100);
            timersRef.current.push(tick);
            await Promise.all([
              waitForBreathwork(seconds * 1000, signal),
              (async () => {
                for (let i = 0; i < cues.length; i++) {
                  if (signal.aborted) return;
                  if (i > 0) await waitForBreathwork(400, signal);
                  await play(cues[i]);
                }
              })(),
            ]);
            window.clearInterval(tick);
          }
        }
        if (signal.aborted) return;
        setPreparing(true);
        await play(ending);
        if (signal.aborted) return;
        setIsRunning(false);
        setIsCompleted(true);
      };
      void run();
      return () => { controller.abort(); clearTimers(); };
    }

    const vg = entry.voiceGuide;
    const phaseCues = vg.phaseCues ?? {};
    const phaseAudioKeys = vg.phaseAudioKeys ?? {};
    const repeatCues = vg.repeatCues ?? [];

    // Schedule intro cues
    vg.intro.forEach((cue) => {
      const t = window.setTimeout(() => playCue(cue), cue.at * 1000);
      timersRef.current.push(t);
    });

    // Calculate intro duration: use measured audio duration if available, otherwise estimate
    let introTotalSec: number;
    if (vg.intro.length > 0) {
      const lastCue = vg.intro[vg.intro.length - 1];
      const lastDuration = lastCue.audioKey
        ? voiceEngine.getAudioDuration(lastCue.audioKey) ?? 4
        : 4;
      introTotalSec = lastCue.at + lastDuration + 1;
    } else {
      introTotalSec = 0;
    }

    const roundDuration = totalDuration;

    for (let round = 0; round < totalRounds; round++) {
      const roundStart = introTotalSec + round * roundDuration;

      phases.forEach((phase, phaseIdx) => {
        const phaseStart = roundStart + phases.slice(0, phaseIdx).reduce((s, p) => s + p.seconds, 0);
        const cueText = phaseCues[phase.label] ?? phaseCues[phase.key] ?? '';
        const cueAudioKey = phaseAudioKeys[phase.label] ?? phaseAudioKeys[phase.key];
        if (cueText) {
          const t = window.setTimeout(() => {
            if (cueAudioKey) {
              voiceEngine.speakByKey(cueAudioKey, cueText);
            } else {
              voiceEngine.speak(cueText);
            }
            setSubtitle(cueText);
          }, phaseStart * 1000);
          timersRef.current.push(t);
        }

        for (let s = 1; s < phase.seconds; s++) {
          const t = window.setTimeout(() => {
            setRemainingSeconds(phase.seconds - s);
          }, (phaseStart + s) * 1000);
          timersRef.current.push(t);
        }

        if (entry.visual.type === 'layered_breathing') {
          if (phase.key === 'inhale') {
            const layers = entry.visual.layers ?? ['belly', 'chest', 'clavicle'];
            const inhalePart = phase.seconds / layers.length;
            layers.forEach((_, i) => {
              if (i === 0) return;
              const t = window.setTimeout(() => setActiveLayer(i), phaseStart * 1000 + Math.round(inhalePart * i * 1000));
              timersRef.current.push(t);
            });
          } else if (phase.key === 'exhale') {
            const layers = entry.visual.layers ?? ['belly', 'chest', 'clavicle'];
            const exhalePart = phase.seconds / layers.length;
            layers.forEach((_, i) => {
              const reverseIdx = layers.length - 1 - i;
              if (i === 0) return;
              const t = window.setTimeout(() => setActiveLayer(reverseIdx), phaseStart * 1000 + Math.round(exhalePart * i * 1000));
              timersRef.current.push(t);
            });
          }
        }

        const t = window.setTimeout(() => {
          setPreparing(false);
          setPhaseIndex(phaseIdx);
          setPhaseDuration(phase.seconds);
          setRemainingSeconds(phase.seconds);
          // Complete breathing keeps its audio timeline. A caption belongs to
          // the phase in which it was spoken; clear it at the next boundary.
          // Repeat cues scheduled at this boundary run afterwards and supply
          // their own caption without cancelling or restarting the audio.
          if (entry.id === 'complete-yoga-breathing') setSubtitle('');
          if (entry.visual.type === 'layered_breathing') {
            setActiveLayer(phase.key === 'inhale' ? 0 : (entry.visual.layers?.length ?? 3) - 1);
          }
        }, phaseStart * 1000);
        timersRef.current.push(t);
      });

      if (round > 0 && repeatCues.length > 0) {
        const phaseCueTimes = new Set<number>();
        let phaseOffset = 0;
        for (const phase of phases) {
          const cueText = phaseCues[phase.label] ?? phaseCues[phase.key] ?? '';
          if (cueText) phaseCueTimes.add(phaseOffset);
          phaseOffset += phase.seconds;
        }

        repeatCues.forEach((cue) => {
          if (phaseCueTimes.has(cue.at)) return;
          const t = window.setTimeout(() => playCue(cue), (roundStart + cue.at) * 1000);
          timersRef.current.push(t);
        });
      }

      const t = window.setTimeout(() => {
        setCurrentRound(round + 1);
      }, roundStart * 1000);
      timersRef.current.push(t);
    }

    const lastRoundEnd = introTotalSec + totalRounds * roundDuration;

    vg.completion.forEach((cue) => {
      const t = window.setTimeout(() => playCue(cue), (lastRoundEnd + cue.at) * 1000);
      timersRef.current.push(t);
    });

    const endT = window.setTimeout(() => {
      setIsRunning(false);
      setIsCompleted(true);
      setActiveLayer(undefined);
    }, (lastRoundEnd + 5) * 1000);
    timersRef.current.push(endT);

    return () => {
      clearTimers();
    };
  }, [runId, entryId]);

  useEffect(() => {
    return () => {
      clearTimers();
      voiceEngine.stop();
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
          {audioFailed && <p role="status">音声の一部を再生できませんでした。字幕に合わせて続けられます。</p>}
          <button
            type="button"
            className="secondary-button breathing-replay-button"
            onClick={() => { unlockBreathworkAudio(); voiceEngine.unlock(); setRunId((value) => value + 1); }}
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

export function ResultPage({ result, scoreSummary = [], onRestart, onOpenSearch, onBackHome, onOpenMyPage, onOpenProYoga, onOpenAITeacher, onDetail }: ResultPageProps) {
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
          <div className="hero-actions result-ai-teacher-cta">
            <button className="gold-button" onClick={onOpenAITeacher}>今日の実践へ — My AI Teacherと始める</button>
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
