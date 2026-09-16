import { useState, useEffect, useCallback, useRef } from 'react';
import { getSequenceEntry, type SequenceStep } from '../lib/sequenceCatalog';
import { getVoiceGuideEngine, unlockAudioContext } from '../lib/voiceGuide';

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

type TempoMode = 'beginner' | 'standard' | 'experienced';

const TEMPO_LABELS: Record<TempoMode, string> = {
  beginner: 'ゆっくり',
  standard: '標準',
  experienced: 'スムーズ',
};

const STEP_DURATIONS: Record<TempoMode, number[]> = {
  beginner:    [7, 7, 8, 8, 8, 8, 8, 8, 8, 8, 7, 7],
  standard:    [5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 5, 5],
  experienced: [4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4],
};

const POST_VOICE_BUFFER_MS = 700;

interface Props {
  sequenceId: string;
  onComplete?: (roundsCompleted: number, durationSec: number) => void;
}

export function SuryaNamaskarExperience({ sequenceId, onComplete }: Props) {
  const entry = getSequenceEntry(sequenceId);
  const [currentStep, setCurrentStep] = useState(0);
  const [side, setSide] = useState<'right' | 'left'>('right');
  const [round, setRound] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [tempo, setTempo] = useState<TempoMode>('standard');
  const [stepTimeLeft, setStepTimeLeft] = useState(0);

  const startTimeRef = useRef<number | null>(null);
  const stepTimeoutRef = useRef<number | null>(null);
  const voiceEndHandledRef = useRef(false);

  useEffect(() => {
    if (!isPlaying || isPaused) return;
    const timer = window.setInterval(() => {
      if (startTimeRef.current !== null) {
        setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isPlaying, isPaused]);

  const clearStepTimeout = useCallback(() => {
    if (stepTimeoutRef.current !== null) {
      window.clearTimeout(stepTimeoutRef.current);
      stepTimeoutRef.current = null;
    }
  }, []);

  const speakStep = useCallback((step: SequenceStep): Promise<void> => {
    return new Promise<void>((resolve) => {
      const engine = getVoiceGuideEngine();
      const text = step.voiceGuide[0] ?? step.nameJa;
      voiceEndHandledRef.current = false;

      engine.speak(text);

      const checkInterval = window.setInterval(() => {
        if (voiceEndHandledRef.current) {
          window.clearInterval(checkInterval);
          resolve();
          return;
        }
        const status = engine.getStatus();
        if (status.status !== 'playing') {
          voiceEndHandledRef.current = true;
          window.clearInterval(checkInterval);
          resolve();
        }
      }, 200);

      window.setTimeout(() => {
        if (!voiceEndHandledRef.current) {
          voiceEndHandledRef.current = true;
          window.clearInterval(checkInterval);
          resolve();
        }
      }, 6000);
    });
  }, []);

  const advanceStep = useCallback((stepIdx: number, currentSide: 'right' | 'left', currentRound: number) => {
    if (!entry) return;
    const totalSteps = entry.steps.length;
    const nextStep = stepIdx + 1;

    if (nextStep < totalSteps) {
      setCurrentStep(nextStep);
    } else {
      if (currentSide === 'right') {
        setSide('left');
        setCurrentStep(0);
      } else {
        setCompleted(true);
        setIsPlaying(false);
        const totalSec = Math.floor((Date.now() - (startTimeRef.current ?? Date.now())) / 1000);
        onComplete?.(currentRound, totalSec);
        return;
      }
    }
  }, [entry, onComplete]);

  const runStepAuto = useCallback(async (stepIdx: number, currentSide: 'right' | 'left', currentRound: number) => {
    if (!entry || isPaused) return;
    const step = entry.steps[stepIdx];
    const durationSec = STEP_DURATIONS[tempo][stepIdx] ?? 6;

    await speakStep(step);

    if (isPaused || !isPlaying) return;

    const remaining = Math.max(durationSec * 1000 - POST_VOICE_BUFFER_MS, 800);
    setStepTimeLeft(Math.ceil(remaining / 1000));

    clearStepTimeout();
    stepTimeoutRef.current = window.setTimeout(() => {
      stepTimeoutRef.current = null;
      if (!isPaused && isPlaying) {
        advanceStep(stepIdx, currentSide, currentRound);
      }
    }, remaining);
  }, [entry, tempo, isPaused, isPlaying, speakStep, advanceStep, clearStepTimeout]);

  useEffect(() => {
    if (!isPlaying || isPaused || !entry) return;
    runStepAuto(currentStep, side, round);
    return () => clearStepTimeout();
  }, [currentStep, isPlaying, isPaused]);

  const handleStart = useCallback(() => {
    if (!entry) return;
    unlockAudioContext();
    setIsPlaying(true);
    setIsPaused(false);
    setCompleted(false);
    setCurrentStep(0);
    setSide('right');
    setRound(1);
    setElapsedSec(0);
    setShowDetail(false);
    startTimeRef.current = Date.now();
  }, [entry]);

  const handlePause = useCallback(() => {
    setIsPaused(true);
    clearStepTimeout();
    const engine = getVoiceGuideEngine();
    engine.stop();
  }, [clearStepTimeout]);

  const handleResume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const handleNext = useCallback(() => {
    if (!entry || completed) return;
    clearStepTimeout();
    const engine = getVoiceGuideEngine();
    engine.stop();
    advanceStep(currentStep, side, round);
  }, [entry, currentStep, side, round, completed, advanceStep, clearStepTimeout]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      clearStepTimeout();
      const engine = getVoiceGuideEngine();
      engine.stop();
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep, clearStepTimeout]);

  const handleTempoChange = useCallback((mode: TempoMode) => {
    setTempo(mode);
    if (isPlaying && !isPaused) {
      clearStepTimeout();
    }
  }, [isPlaying, isPaused, clearStepTimeout]);

  if (!entry) {
    return <div style={{ padding: 24, textAlign: 'center' }}>シークエンスが見つかりません。</div>;
  }

  const step = entry.steps[currentStep];
  const totalSteps = entry.steps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="surya-namaskar-experience">
      <div className="sn-header">
        <h3 className="sn-title">{entry.nameJa}</h3>
        <p className="sn-subtitle">{entry.nameEn}</p>
        <div className="sn-meta-row">
          <span className="sn-badge sn-badge-steps">12ステップ</span>
          <span className="sn-badge sn-badge-side">
            {side === 'right' ? '右側' : '左側'}
          </span>
          {round > 1 && <span className="sn-badge sn-badge-round">{round}ラウンド目</span>}
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

        {step.image && (
          <div className="sn-step-image-wrap">
            <img src={step.image} alt={step.nameJa} className="sn-step-image" />
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
          {step.instruction.join(' ')}
        </div>

        {!showDetail && (
          <button className="ghost-button sn-detail-toggle" onClick={() => setShowDetail(true)}>
            詳しく知る
          </button>
        )}
        {showDetail && (
          <div className="sn-detail-panel">
            <p className="sn-detail-text">{step.instruction.join(' ')}</p>
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
            <p style={{ fontWeight: 600, color: 'var(--green-strong)' }}>1ラウンド完了！お疲れさまでした。</p>
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
    </div>
  );
}
