import type { BreathworkCatalogEntry, BreathworkPattern } from '../lib/breathworkCatalog';

export type BreathPhase = 'inhale' | 'hold-in' | 'exhale' | 'hold-out' | 'idle';

export interface BreathworkVisualProps {
  breathwork: BreathworkCatalogEntry;
  phase: BreathPhase;
  remainingSeconds: number;
  isRunning: boolean;
  isCompleted: boolean;
  activeLayer?: number;
  phaseDurationSeconds?: number;
}

const PHASE_LABELS: Record<BreathPhase, string> = {
  inhale: '吸う',
  'hold-in': '止める',
  exhale: '吐く',
  'hold-out': '止める',
  idle: '準備',
};

const LAYER_LABELS = ['お腹', '胸', '鎖骨周辺'];

function BodyOutline() {
  return <svg className="bw-body-outline" viewBox="0 0 180 240" aria-hidden="true">
    <circle cx="90" cy="23" r="19" />
    <path d="M78 43 L78 51 Q55 54 43 68 L28 142 Q26 152 33 155 Q40 157 44 145 L59 98 L61 160 L53 218 Q52 235 65 235 Q74 235 77 219 L90 174 L103 219 Q106 235 115 235 Q128 235 127 218 L119 160 L121 98 L136 145 Q140 157 147 155 Q154 152 152 142 L137 68 Q125 54 102 51 L102 43" />
  </svg>;
}

export function BreathworkVisual({
  breathwork,
  phase,
  remainingSeconds,
  isRunning,
  isCompleted,
  activeLayer,
  phaseDurationSeconds,
}: BreathworkVisualProps) {
  const { visual } = breathwork;
  const phaseSeconds = phaseDurationSeconds ?? (phase === 'inhale' ? breathwork.pattern?.inhaleSec : breathwork.pattern?.exhaleSec) ?? 1;
  const progress = Math.min(1, Math.max(0, 1 - remainingSeconds / phaseSeconds));
  const expansion = !isRunning || isCompleted || phase === 'idle' ? 0 : phase === 'inhale' ? progress : phase === 'hold-in' ? 1 : phase === 'exhale' ? 1 - progress : 0;
  const circleStyle = { animation: 'none', transform: `scale(${0.85 + expansion * 0.15})`, transition: 'transform 100ms linear' };
  const regionStyle = { animation: 'none', transform: `translateX(-50%) scale(${0.85 + expansion * 0.23})` };
  const count = phase === 'idle' ? '' : `${Math.ceil(remainingSeconds)}`;

  if (visual.type === 'phase_animation') {
    return (
      <div className="breathing-orb-stage">
        <div className="breathing-orb-halo" />
        <div
          className={`breathing-circle ${isRunning ? 'is-running' : ''} ${isCompleted ? 'is-completed' : ''}`}
          aria-live="polite"
          style={circleStyle}
        >
          <div className="breathing-circle-content">
            <strong>{isCompleted ? '完了' : PHASE_LABELS[phase]}</strong>
            <span>{isCompleted ? '1回終了' : count}</span>
          </div>
        </div>
      </div>
    );
  }

  if (visual.type === 'body_breathing') {
    const focus = visual.bodyFocus ?? 'belly';
    return (
      <div className="bw-body-stage">
        <div className={`bw-body-figure ${isRunning ? 'is-breathing' : ''} ${isCompleted ? 'is-done' : ''}`}>
          <div className={`bw-body-region bw-body-${focus}`} style={regionStyle} />
          <BodyOutline />
        </div>
        <div className="bw-body-label">
          <strong>{isCompleted ? '完了' : isRunning ? PHASE_LABELS[phase] : '準備'}</strong>
          <span>{isCompleted ? '' : isRunning && phase !== 'idle' ? `${count}秒` : ''}</span>
        </div>
      </div>
    );
  }

  if (visual.type === 'layered_breathing') {
    const layers = visual.layers ?? ['belly', 'chest', 'clavicle'];
    return (
      <div className="bw-layered-stage">
        <div className={`bw-layered-figure ${isRunning ? 'is-breathing' : ''} ${isCompleted ? 'is-done' : ''}`}>
          {layers.map((layer, i) => (
            <div
              key={layer}
              className={`bw-layered-region bw-layer-${layer} ${
                activeLayer === i ? 'is-active' : ''
              } ${activeLayer !== undefined && activeLayer > i ? 'is-filled' : ''}`}
            />
          ))}
          <BodyOutline />
        </div>
        <div className="bw-layered-steps">
          {layers.map((layer, i) => (
            <div
              key={layer}
              className={`bw-layered-step ${activeLayer === i ? 'is-active' : ''} ${
                activeLayer !== undefined && activeLayer > i ? 'is-done' : ''
              }`}
            >
              <span className="bw-layered-step-num">{i + 1}</span>
              <span className="bw-layered-step-label">{LAYER_LABELS[i] ?? layer}</span>
            </div>
          ))}
        </div>
        <div className="bw-layered-timer">
          <strong>{isCompleted ? '完了' : isRunning ? PHASE_LABELS[phase] : '準備'}</strong>
          <span>{isCompleted ? '' : isRunning && phase !== 'idle' ? `${count}秒` : ''}</span>
        </div>
      </div>
    );
  }

  if (visual.type === 'circle') {
    return (
      <div className="breathing-orb-stage">
        <div className="breathing-orb-halo" />
        <div
          className={`breathing-circle ${isRunning ? 'is-running' : ''} ${isCompleted ? 'is-completed' : ''}`}
          aria-live="polite"
          style={circleStyle}
        >
          <div className="breathing-circle-content">
            <strong>{isCompleted ? '完了' : isRunning ? PHASE_LABELS[phase] : '準備'}</strong>
            <span>{isCompleted ? '' : isRunning ? count : ''}</span>
          </div>
        </div>
      </div>
    );
  }

  if (visual.type === 'gif' && visual.asset) {
    return (
      <div className="bw-gif-stage">
        <img src={visual.asset} alt={breathwork.nameJa} className="bw-gif-image" />
      </div>
    );
  }

  if (visual.type === 'static' && visual.asset) {
    return (
      <div className="bw-static-stage">
        <img src={visual.asset} alt={breathwork.nameJa} className="bw-static-image" />
      </div>
    );
  }

  return null;
}

export function buildPhasesFromPattern(pattern: BreathworkPattern) {
  const phases: { key: BreathPhase; label: string; seconds: number }[] = [];
  if (pattern.inhaleSec > 0) phases.push({ key: 'inhale', label: '吸う', seconds: pattern.inhaleSec });
  if (pattern.holdAfterInhaleSec > 0) phases.push({ key: 'hold-in', label: '止める', seconds: pattern.holdAfterInhaleSec });
  if (pattern.exhaleSec > 0) phases.push({ key: 'exhale', label: '吐く', seconds: pattern.exhaleSec });
  if (pattern.holdAfterExhaleSec > 0) phases.push({ key: 'hold-out', label: '止める', seconds: pattern.holdAfterExhaleSec });
  return phases;
}
