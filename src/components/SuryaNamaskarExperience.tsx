import { useState, useEffect, useCallback, useRef } from 'react';
import { getSequenceEntry, type SequenceStep } from '../lib/sequenceCatalog';
import { unlockAudioContext, preloadVoiceKeys, getAudioDiagnostic } from '../lib/voiceGuide';
import { createPracticeAudioRuntime, type RuntimeEvent, type RuntimeState } from '../lib/practiceAudioRuntime';
import { buildSuryaCues, STEP_DURATIONS, type TempoMode } from '../lib/suryaCueBuilder';

const BREATHING_LABEL: Record<string, string> = {
  inhale: '吸う',
  exhale: '吐く',
  normal: '自然な呼吸',
  hold: '保持',
  transition: '移行',
};

const BREATHING_COLOR: Record<string, string> = {
  inhale: 'var(--green-strong)',
  exhale: 'var(--blue-mid)',
  normal: 'var(--text-secondary)',
  hold: 'var(--accent)',
  transition: 'var(--text-secondary)',
};

type Side = 'right' | 'left';

const TEMPO_LABELS: Record<TempoMode, string> = {
  beginner: 'ゆっくり',
  standard: '標準',
  experienced: 'スムーズ',
};

const SURYA_AUDIO_KEYS = [
  'voice-surya-01', 'voice-surya-02', 'voice-surya-03',
  'voice-surya-04-right', 'voice-surya-04-left',
  'voice-surya-05', 'voice-surya-06', 'voice-surya-07', 'voice-surya-08',
  'voice-surya-09-right', 'voice-surya-09-left',
  'voice-surya-10', 'voice-surya-11', 'voice-surya-12',
  'voice-surya-transition',
];

interface Props {
  sequenceId: string;
  onComplete?: (roundsCompleted: number, durationSec: number) => void;
}

function getStepInstruction(step: SequenceStep, side: Side): string[] {
  if (side === 'left' && step.instructionLeft) return step.instructionLeft;
  return step.instruction;
}

function getStepImage(step: SequenceStep, side: Side): string | undefined {
  if (side === 'left' && step.imageLeft) return step.imageLeft;
  return step.image;
}

function shouldMirrorImage(step: SequenceStep, side: Side): boolean {
  return side === 'left' && step.mirrorImageLeft === true;
}

export function SuryaNamaskarExperience({ sequenceId, onComplete }: Props) {
  const entry = getSequenceEntry(sequenceId);
  const [currentStep, setCurrentStep] = useState(0);
  const [side, setSide] = useState<Side>('right');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [tempo, setTempo] = useState<TempoMode>('standard');
  const [showDebug, setShowDebug] = useState(false);
  const [subtitle, setSubtitle] = useState('');
  const [inTransition, setInTransition] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const runtimeRef = useRef<ReturnType<typeof createPracticeAudioRuntime> | null>(null);
  const cueMapRef = useRef<{ voiceIdx: number; stepIdx: number; side: Side }[]>([]);
  const sideRef = useRef<Side>('right');

  const handleEvent = useCallback((event: RuntimeEvent) => {
    if (event.type === 'subtitle') {
      setSubtitle(event.subtitle ?? '');
    } else if (event.type === 'cueStart') {
      const map = cueMapRef.current[event.cueIndex ?? -1];
      if (map) {
        if (map.side !== sideRef.current) {
          sideRef.current = map.side;
          setSide(map.side);
        }
        setCurrentStep(map.stepIdx);
        setInTransition(false);
      }
    } else if (event.type === 'complete') {
      setCompleted(true);
      setIsPlaying(false);
      const totalSec = Math.floor((Date.now() - (startTimeRef.current ?? Date.now())) / 1000);
      onComplete?.(1, totalSec);
    } else if (event.type === 'stateChange') {
      if (event.state === 'completed') {
        setCompleted(true);
        setIsPlaying(false);
      }
    }
  }, [onComplete]);

  const handleStart = useCallback(() => {
    if (!entry) return;
    unlockAudioContext();
    preloadVoiceKeys(SURYA_AUDIO_KEYS);
    setIsPlaying(true);
    setIsPaused(false);
    setCompleted(false);
    setCurrentStep(0);
    setSide('right');
    setElapsedSec(0);
    setShowDetail(false);
    setInTransition(false);
    setSubtitle('');
    startTimeRef.current = Date.now();
    sideRef.current = 'right';

    const cues = buildSuryaCues(entry, tempo);
    const map: { voiceIdx: number; stepIdx: number; side: Side }[] = [];
    let voiceIdx = 0;
    for (const s of ['right', 'left'] as Side[]) {
      for (let i = 0; i < entry.steps.length; i++) {
        map[voiceIdx] = { voiceIdx, stepIdx: i, side: s };
        voiceIdx += 2; // voice cue + silence cue
      }
      if (s === 'right') {
        map[voiceIdx] = { voiceIdx, stepIdx: entry.steps.length - 1, side: s };
        voiceIdx += 1; // transition voice
      }
    }
    cueMapRef.current = map;

    const runtime = createPracticeAudioRuntime();
    runtime.setSource('practice_audio_runtime');
    runtime.addListener(handleEvent);
    runtimeRef.current = runtime;
    runtime.start({ practiceId: 'surya-namaskar', cues });
  }, [entry, tempo, handleEvent]);

  const handlePause = useCallback(() => {
    setIsPaused(true);
    runtimeRef.current?.pause();
  }, []);

  const handleResume = useCallback(() => {
    setIsPaused(false);
    runtimeRef.current?.resume();
  }, []);

  const handleNext = useCallback(() => {
    runtimeRef.current?.next();
  }, []);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      runtimeRef.current?.next();
    }
  }, [currentStep]);

  const handleTempoChange = useCallback((mode: TempoMode) => {
    setTempo(mode);
  }, []);

  useEffect(() => {
    if (!isPlaying || isPaused) return;
    const timer = window.setInterval(() => {
      if (startTimeRef.current !== null) {
        setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isPlaying, isPaused]);

  useEffect(() => {
    return () => {
      runtimeRef.current?.dispose();
      runtimeRef.current = null;
    };
  }, []);

  if (!entry) {
    return <div style={{ padding: 24, textAlign: 'center' }}>シークエンスが見つかりません。</div>;
  }

  const step = entry.steps[currentStep];
  const totalSteps = entry.steps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const diag = showDebug ? getAudioDiagnostic() : null;
  const sideNum = side === 'right' ? 1 : 2;
  const instruction = getStepInstruction(step, side);
  const stepImage = getStepImage(step, side);
  const mirror = shouldMirrorImage(step, side);

  return (
    <div className="surya-namaskar-experience">
      <div className="sn-header">
        <h3 className="sn-title">{entry.nameJa}</h3>
        <p className="sn-subtitle">{entry.nameEn}</p>
        <div className="sn-meta-row">
          <span className="sn-badge sn-badge-side">
            {side === 'right' ? '右側' : '左側'} {sideNum} / 2
          </span>
        </div>
      </div>

      {!isPlaying && !completed && (
        <div className="sn-tempo-selector">
          <span className="sn-tempo-label">テンポ</span>
          <div className="sn-tempo-buttons">
            {(Object.keys(TEMPO_LABELS) as TempoMode[]).map((mode) => (
              <button
                key={mode}
                className={`sn-tempo-btn${tempo === mode ? ' active' : ''}`}
                onClick={() => handleTempoChange(mode)}
              >
                {TEMPO_LABELS[mode]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="sn-progress-bar">
        <div className="sn-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="sn-step-display">
        <div className="sn-step-counter">
          STEP {currentStep + 1} / {totalSteps}
        </div>

        {stepImage && (
          <div className="sn-step-image-wrap">
            <img
              src={stepImage}
              alt={step.nameJa}
              className="sn-step-image"
              style={mirror ? { transform: 'scaleX(-1)' } : undefined}
            />
          </div>
        )}

        <div className="sn-step-name-ja">{step.nameJa}</div>
        {step.nameSanskrit && (
          <div className="sn-step-name-sanskrit">{step.nameSanskrit}</div>
        )}

        <div className="sn-breathing-indicator" style={{ color: BREATHING_COLOR[step.breathing] ?? 'var(--text-secondary)' }}>
          <span className="sn-breathing-label">呼吸：</span>
          <span className="sn-breathing-value">{BREATHING_LABEL[step.breathing] ?? step.breathing}</span>
        </div>

        <div className="sn-step-instruction">
          {instruction.join(' ')}
        </div>

        {subtitle && isPlaying && (
          <p className="breathing-live-copy" style={{ marginTop: 8 }}>{subtitle}</p>
        )}

        {!showDetail && (
          <button className="ghost-button sn-detail-toggle" onClick={() => setShowDetail(true)}>
            詳しく知る
          </button>
        )}
        {showDetail && (
          <div className="sn-detail-panel">
            <p className="sn-detail-text">{instruction.join(' ')}</p>
            <button className="ghost-button sn-detail-toggle" onClick={() => setShowDetail(false)}>
              閉じる
            </button>
          </div>
        )}
      </div>

      <div className="sn-controls">
        <button
          className="ghost-button sn-nav-btn"
          onClick={handlePrev}
          disabled={currentStep === 0 || !isPlaying}
        >
          前へ
        </button>

        {!isPlaying && !completed && (
          <button className="primary-button sn-start-btn" onClick={handleStart}>
            実践を始める
          </button>
        )}

        {isPlaying && !isPaused && (
          <button className="secondary-button sn-next-btn" onClick={handlePause}>
            一時停止
          </button>
        )}

        {isPlaying && isPaused && (
          <button className="primary-button sn-next-btn" onClick={handleResume}>
            再開
          </button>
        )}

        {isPlaying && (
          <button className="secondary-button sn-next-btn" onClick={handleNext}>
            {currentStep + 1 < totalSteps ? '次へ' : side === 'right' ? '反対側へ' : '完了'}
          </button>
        )}

        {completed && (
          <div className="sn-complete-message">
            <p style={{ fontWeight: 600, color: 'var(--green-strong)' }}>左右の太陽礼拝が終わりました。1ラウンド完了です。お疲れさまでした。</p>
          </div>
        )}
      </div>

      <div className="sn-safety-note">
        <p>急な動きをしない。呼吸を無理に強くしない。不快感がある場合は中止してください。</p>
      </div>

      {isPlaying && (
        <div className="sn-timer">
          経過時間：{Math.floor(elapsedSec / 60)}分{elapsedSec % 60}秒
          {isPaused && '（一時停止中）'}
        </div>
      )}

      <button
        className="ghost-button sn-debug-toggle"
        style={{ fontSize: 11, opacity: 0.5 }}
        onClick={() => setShowDebug((v) => !v)}
      >
        {showDebug ? 'debugを隠す' : 'debug'}
      </button>
      {showDebug && diag && (
        <div className="sn-debug-panel">
          <p>audioContext: {diag.contextState}</p>
          <p>lastCue: {diag.lastCue ?? '—'}</p>
          <p>lastPlayResult: {diag.lastPlayResult ?? '—'}</p>
          <p>lastError: {diag.lastError ?? '—'}</p>
        </div>
      )}
    </div>
  );
}
