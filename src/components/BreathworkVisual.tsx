import type { BreathworkCatalogEntry, BreathworkPattern } from '../lib/breathworkCatalog';

export type BreathPhase = 'inhale' | 'hold-in' | 'exhale' | 'hold-out' | 'idle';

export interface BreathworkVisualProps {
  breathwork: BreathworkCatalogEntry;
  phase: BreathPhase;
  remainingSeconds: number;
  isRunning: boolean;
  isCompleted: boolean;
  activeLayer?: number;
}

const PHASE_LABELS: Record<BreathPhase, string> = {
  inhale: '吸う',
  'hold-in': '止める',
  exhale: '吐く',
  'hold-out': '止める',
  idle: '準備',
};

const LAYER_LABELS = ['お腹', '胸', '鎖骨周辺'];

const REFERENCE_IMAGES: Record<string, string> = {
  'abdominal-breathing': '/pose-abdominal-breathing.webp',
  'thoracic-breathing': '/pose-savasana.webp',
  'complete-yoga-breathing': '/pose-savasana.webp',
};

function ReferenceFigure({ breathwork }: { breathwork: BreathworkCatalogEntry }) {
  const src = REFERENCE_IMAGES[breathwork.id];
  if (!src) return null;
  return (
    <div className="bw-reference-figure">
      <img src={src} alt={`${breathwork.nameJa}のお手本`} className="bw-reference-image" loading="lazy" />
      <span className="bw-reference-caption">お手本</span>
    </div>
  );
}

export function BreathworkVisual({
  breathwork,
  phase,
  remainingSeconds,
  isRunning,
  isCompleted,
  activeLayer,
}: BreathworkVisualProps) {
  const { visual } = breathwork;

  if (visual.type === 'phase_animation') {
    return (
      <div className="breathing-orb-stage">
        <div className="breathing-orb-halo" />
        <div
          className={`breathing-circle ${isRunning ? 'is-running' : ''} ${isCompleted ? 'is-completed' : ''}`}
          aria-live="polite"
        >
          <div className="breathing-circle-content">
            <strong>{isCompleted ? '完了' : PHASE_LABELS[phase]}</strong>
            <span>{isCompleted ? '1回終了' : `${remainingSeconds}`}</span>
          </div>
        </div>
      </div>
    );
  }

  if (visual.type === 'body_breathing') {
    const focus = visual.bodyFocus ?? 'belly';
    return (
      <div className="bw-body-stage">
        <ReferenceFigure breathwork={breathwork} />
        <div className={`bw-body-figure ${isRunning ? 'is-breathing' : ''} ${isCompleted ? 'is-done' : ''}`}>
          <div className={`bw-body-region bw-body-${focus}`} />
          <div className="bw-body-silhouette" />
        </div>
        <div className="bw-body-label">
          <strong>{isCompleted ? '完了' : isRunning ? PHASE_LABELS[phase] : '準備'}</strong>
          <span>{isCompleted ? '' : isRunning ? `${remainingSeconds}秒` : ''}</span>
        </div>
      </div>
    );
  }

  if (visual.type === 'layered_breathing') {
    const layers = visual.layers ?? ['belly', 'chest', 'clavicle'];
    return (
      <div className="bw-layered-stage">
        <ReferenceFigure breathwork={breathwork} />
        <div className={`bw-layered-figure ${isRunning ? 'is-breathing' : ''} ${isCompleted ? 'is-done' : ''}`}>
          {layers.map((layer, i) => (
            <div
              key={layer}
              className={`bw-layered-region bw-layer-${layer} ${
                activeLayer === i ? 'is-active' : ''
              } ${activeLayer !== undefined && activeLayer > i ? 'is-filled' : ''}`}
            />
          ))}
          <div className="bw-layered-silhouette" />
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
          <span>{isCompleted ? '' : isRunning ? `${remainingSeconds}秒` : ''}</span>
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
        >
          <div className="breathing-circle-content">
            <strong>{isCompleted ? '完了' : isRunning ? PHASE_LABELS[phase] : '準備'}</strong>
            <span>{isCompleted ? '' : isRunning ? `${remainingSeconds}` : ''}</span>
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
