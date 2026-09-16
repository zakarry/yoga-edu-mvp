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
  const [showDetail, setShowDetail] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [completed, setCompleted] = useState(false);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      if (startTimeRef.current !== null) {
        setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const speakStep = useCallback((step: SequenceStep) => {
    const engine = getVoiceGuideEngine();
    const text = step.voiceGuide[0] ?? step.nameJa;
    engine.speak(text);
  }, []);

  const handleStart = useCallback(() => {
    if (!entry) return;
    unlockAudioContext();
    setIsPlaying(true);
    setCompleted(false);
    setCurrentStep(0);
    setSide('right');
    setRound(1);
    setElapsedSec(0);
    startTimeRef.current = Date.now();
    speakStep(entry.steps[0]);
  }, [entry, speakStep]);

  const handleNext = useCallback(() => {
    if (!entry || completed) return;
    const nextStep = currentStep + 1;
    if (nextStep < entry.steps.length) {
      setCurrentStep(nextStep);
      speakStep(entry.steps[nextStep]);
    } else {
      if (side === 'right') {
        setSide('left');
        setCurrentStep(0);
        speakStep(entry.steps[0]);
      } else {
        setCompleted(true);
        setIsPlaying(false);
        const totalSec = Math.floor((Date.now() - (startTimeRef.current ?? Date.now())) / 1000);
        onComplete?.(round, totalSec);
      }
    }
  }, [entry, currentStep, side, round, completed, onComplete, speakStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      speakStep(entry!.steps[currentStep - 1]);
    }
  }, [currentStep, entry, speakStep]);

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
          <span className="sn-badge sn-badge-level">経験者向け</span>
          <span className="sn-badge sn-badge-steps">12ステップ</span>
          <span className="sn-badge sn-badge-side">
            {side === 'right' ? '右側' : '左側'}
          </span>
          {round > 1 && <span className="sn-badge sn-badge-round">{round}ラウンド目</span>}
        </div>
      </div>

      <div className="sn-progress-bar">
        <div className="sn-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="sn-step-display">
        <div className="sn-step-counter">
          {currentStep + 1} / {totalSteps}
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
          disabled={currentStep === 0}
        >
          前へ
        </button>
        {!isPlaying && !completed && (
          <button className="primary-button sn-start-btn" onClick={handleStart}>
            実践を始める
          </button>
        )}
        {isPlaying && (
          <button className="primary-button sn-next-btn" onClick={handleNext}>
            {currentStep + 1 < totalSteps ? '次のポーズ' : side === 'right' ? '反対側へ' : '完了'}
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
        </div>
      )}
    </div>
  );
}
