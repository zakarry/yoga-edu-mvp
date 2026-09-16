import { useState, useEffect, useCallback, useRef } from 'react';
import { getSequenceEntry, type SequenceStep } from '../lib/sequenceCatalog';
import {
  getVoiceGuideEngine,
  unlockAudioContext,
  preloadVoiceKeys,
  getAudioDiagnostic,
  type VoiceGuideEngine,
} from '../lib/voiceGuide';

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
type Side = 'right' | 'left';

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

function getStepAudioKey(step: SequenceStep, side: Side): string | undefined {
  if (side === 'left' && step.audioKeyLeft) return step.audioKeyLeft;
  return step.audioKey;
}

function getStepInstruction(step: SequenceStep, side: Side): string[] {
  if (side === 'left' && step.instructionLeft) return step.instructionLeft;
  return step.instruction;
}

function getStepVoiceGuide(step: SequenceStep, side: Side): string[] {
  if (side === 'left' && step.voiceGuideLeft) return step.voiceGuideLeft;
  return step.voiceGuide;
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
  const [round, setRound] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [tempo, setTempo] = useState<TempoMode>('standard');
  const [showDebug, setShowDebug] = useState(false);
  const [inTransition, setInTransition] = useState(false);
  const [transitionMsg, setTransitionMsg] = useState('');
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const startTimeRef = useRef<number | null>(null);
  const stepTimeoutRef = useRef<number | null>(null);
  const voiceEndedRef = useRef(false);
  const engineRef = useRef<VoiceGuideEngine | null>(null);
  const isPausedRef = useRef(false);
  const isPlayingRef = useRef(false);
  const tempoRef = useRef<TempoMode>('standard');

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    tempoRef.current = tempo;
  }, [tempo]);

  useEffect(() => {
    if (!isPlaying || isPaused) return;
    const timer = window.setInterval(() => {
      if (startTimeRef.current !== null) {
        setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isPlaying, isPaused]);

  const addDebugLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setDebugLog((prev) => [...prev.slice(-8), `[${ts}] ${msg}`]);
  }, []);

  const clearStepTimeout = useCallback(() => {
    if (stepTimeoutRef.current !== null) {
      window.clearTimeout(stepTimeoutRef.current);
      stepTimeoutRef.current = null;
    }
  }, []);

  const speakStep = useCallback((step: SequenceStep, currentSide: Side): Promise<void> => {
    return new Promise<void>((resolve) => {
      const engine = engineRef.current ?? getVoiceGuideEngine();
      engineRef.current = engine;
      const audioKey = getStepAudioKey(step, currentSide);
      const voiceGuide = getStepVoiceGuide(step, currentSide);
      const text = voiceGuide[0] ?? step.nameJa;
      voiceEndedRef.current = false;

      const durationSec = STEP_DURATIONS[tempoRef.current][step.stepNumber - 1] ?? 6;
      const fallbackMs = durationSec * 1000;

      addDebugLog(`speakStep side=${currentSide} step=${step.stepNumber} key=${audioKey ?? 'none'}`);

      const onVoiceEnd = () => {
        if (voiceEndedRef.current) return;
        voiceEndedRef.current = true;
        engine.setOnCueEnd(null);
        addDebugLog(`voiceEnded side=${currentSide} step=${step.stepNumber}`);
        resolve();
      };

      engine.setOnCueEnd(onVoiceEnd);

      if (audioKey) {
        engine.speakByKey(audioKey, text);
      } else {
        engine.speak(text);
      }

      window.setTimeout(() => {
        if (!voiceEndedRef.current) {
          voiceEndedRef.current = true;
          engine.setOnCueEnd(null);
          addDebugLog(`fallbackTimer side=${currentSide} step=${step.stepNumber} (${fallbackMs}ms)`);
          resolve();
        }
      }, fallbackMs);
    });
  }, [addDebugLog]);

  const speakTransition = useCallback((text: string, audioKey: string): Promise<void> => {
    return new Promise<void>((resolve) => {
      const engine = engineRef.current ?? getVoiceGuideEngine();
      engineRef.current = engine;
      voiceEndedRef.current = false;

      addDebugLog(`speakTransition key=${audioKey}`);

      const onVoiceEnd = () => {
        if (voiceEndedRef.current) return;
        voiceEndedRef.current = true;
        engine.setOnCueEnd(null);
        addDebugLog('transitionEnded');
        resolve();
      };

      engine.setOnCueEnd(onVoiceEnd);
      engine.speakByKey(audioKey, text);

      window.setTimeout(() => {
        if (!voiceEndedRef.current) {
          voiceEndedRef.current = true;
          engine.setOnCueEnd(null);
          addDebugLog('transitionFallback');
          resolve();
        }
      }, 5000);
    });
  }, [addDebugLog]);

  const advanceStep = useCallback((stepIdx: number, currentSide: Side, currentRound: number) => {
    if (!entry) return;
    const totalSteps = entry.steps.length;
    const nextStep = stepIdx + 1;

    addDebugLog(`advanceStep from=${stepIdx} side=${currentSide} next=${nextStep}`);

    if (nextStep < totalSteps) {
      setCurrentStep(nextStep);
    } else {
      if (currentSide === 'right') {
        setInTransition(true);
        setTransitionMsg('右側が終わりました。次は左側です。');
        clearStepTimeout();

        const run = async () => {
          await speakTransition('右側が終わりました。次は左側です。', 'voice-surya-transition');
          if (!isPlayingRef.current || isPausedRef.current) return;
          setInTransition(false);
          setSide('left');
          setCurrentStep(0);
          addDebugLog('transitioned to left side, step=0');
        };
        void run();
      } else {
        setCompleted(true);
        setIsPlaying(false);
        const totalSec = Math.floor((Date.now() - (startTimeRef.current ?? Date.now())) / 1000);
        onComplete?.(currentRound, totalSec);
      }
    }
  }, [entry, onComplete, clearStepTimeout, speakTransition, addDebugLog]);

  const runStepAuto = useCallback(async (stepIdx: number, currentSide: Side, currentRound: number) => {
    if (!entry || isPausedRef.current || !isPlayingRef.current || inTransition) return;
    const step = entry.steps[stepIdx];
    const durationSec = STEP_DURATIONS[tempoRef.current][stepIdx] ?? 6;

    await speakStep(step, currentSide);

    if (isPausedRef.current || !isPlayingRef.current || inTransition) return;

    const remaining = Math.max(durationSec * 1000 - POST_VOICE_BUFFER_MS, 800);

    clearStepTimeout();
    stepTimeoutRef.current = window.setTimeout(() => {
      stepTimeoutRef.current = null;
      if (!isPausedRef.current && isPlayingRef.current && !inTransition) {
        advanceStep(stepIdx, currentSide, currentRound);
      }
    }, remaining);
  }, [entry, speakStep, advanceStep, clearStepTimeout, inTransition]);

  // CRITICAL: `side` is in the dependency array so the effect re-fires
  // when transitioning from right to left, even if currentStep is the same index.
  useEffect(() => {
    if (!isPlaying || isPaused || !entry || inTransition) return;
    runStepAuto(currentStep, side, round);
    return () => clearStepTimeout();
  }, [currentStep, side, isPlaying, isPaused, inTransition]);

  const handleStart = useCallback(() => {
    if (!entry) return;
    unlockAudioContext();
    preloadVoiceKeys(SURYA_AUDIO_KEYS);
    setIsPlaying(true);
    setIsPaused(false);
    setCompleted(false);
    setCurrentStep(0);
    setSide('right');
    setRound(1);
    setElapsedSec(0);
    setShowDetail(false);
    setInTransition(false);
    setDebugLog([]);
    startTimeRef.current = Date.now();
    addDebugLog('practice started');
  }, [entry, addDebugLog]);

  const handlePause = useCallback(() => {
    setIsPaused(true);
    clearStepTimeout();
    const engine = engineRef.current ?? getVoiceGuideEngine();
    engine.stop();
    addDebugLog('paused');
  }, [clearStepTimeout, addDebugLog]);

  const handleResume = useCallback(() => {
    setIsPaused(false);
    addDebugLog('resumed');
  }, [addDebugLog]);

  const handleNext = useCallback(() => {
    if (!entry || completed) return;
    clearStepTimeout();
    const engine = engineRef.current ?? getVoiceGuideEngine();
    engine.stop();
    advanceStep(currentStep, side, round);
  }, [entry, currentStep, side, round, completed, advanceStep, clearStepTimeout]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      clearStepTimeout();
      const engine = engineRef.current ?? getVoiceGuideEngine();
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

      {inTransition ? (
        <div className="sn-transition-display">
          <p className="sn-transition-msg">{transitionMsg}</p>
        </div>
      ) : (
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
      )}

      <div className="sn-controls">
        <button
          className="ghost-button sn-nav-btn"
          onClick={handlePrev}
          disabled={currentStep === 0 || !isPlaying || inTransition}
        >
          前へ
        </button>

        {!isPlaying && !completed && (
          <button className="primary-button sn-start-btn" onClick={handleStart}>
            実践を始める
          </button>
        )}

        {isPlaying && !isPaused && !inTransition && (
          <button className="secondary-button sn-next-btn" onClick={handlePause}>
            一時停止
          </button>
        )}

        {isPlaying && isPaused && (
          <button className="primary-button sn-next-btn" onClick={handleResume}>
            再開
          </button>
        )}

        {isPlaying && !inTransition && (
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
          <p>engine: {engineRef.current?.type ?? '—'}</p>
          <p>audioContext: {diag.contextState}</p>
          <p>lastCue: {diag.lastCue ?? '—'}</p>
          <p>lastPlayResult: {diag.lastPlayResult ?? '—'}</p>
          <p>lastError: {diag.lastError ?? '—'}</p>
          <div style={{ marginTop: 8, borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: 8 }}>
            {debugLog.map((line, i) => (
              <p key={i} style={{ margin: '2px 0' }}>{line}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
