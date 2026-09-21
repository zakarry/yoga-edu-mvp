import { useState } from 'react';
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
const ZONE_LABELS: Record<string, string> = {
  belly: 'お腹',
  chest: '胸',
  clavicle: '鎖骨周辺',
};
const HAND_LABELS: Record<string, string> = {
  belly: '両手をお腹に',
  lower_ribs: '肋骨の両側に',
  chest: '胸郭に',
  clavicle: '鎖骨周辺に',
};

function BodyOutline() {
  return <svg className="bw-body-outline" viewBox="0 0 180 240" aria-hidden="true">
    <circle cx="90" cy="23" r="19" />
    <path d="M78 43 L78 51 Q55 54 43 68 L28 142 Q26 152 33 155 Q40 157 44 145 L59 98 L61 160 L53 218 Q52 235 65 235 Q74 235 77 219 L90 174 L103 219 Q106 235 115 235 Q128 235 127 218 L119 160 L121 98 L136 145 Q140 157 147 155 Q154 152 152 142 L137 68 Q125 54 102 51 L102 43" />
  </svg>;
}

function HandIcon({ placement }: { placement: string }) {
  const positions: Record<string, { cx: number; cy: number; r: number; label: string }> = {
    belly: { cx: 90, cy: 145, r: 28, label: '手' },
    lower_ribs: { cx: 90, cy: 100, r: 32, label: '手' },
    chest: { cx: 90, cy: 95, r: 30, label: '手' },
    clavicle: { cx: 90, cy: 60, r: 24, label: '手' },
  };
  const pos = positions[placement] ?? positions.belly;
  return (
    <g className="bw-hand-icon" aria-hidden="true">
      <circle cx={pos.cx} cy={pos.cy} r={pos.r} fill="none" stroke="#6c8a76" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.7} />
      <text x={pos.cx} y={pos.cy + 4} textAnchor="middle" fontSize={12} fill="#6c8a76" opacity={0.7} fontWeight={600}>{pos.label}</text>
    </g>
  );
}

function DirectionalArrow({ direction, active }: { direction: string; active: boolean }) {
  if (!active) return null;
  const arrows: Record<string, { d: string; label: string }> = {
    out: { d: 'M90 120 L70 120 M90 120 L110 120 M70 120 L75 115 M70 120 L75 125 M110 120 L105 115 M110 120 L105 125', label: '広がる' },
    in: { d: 'M70 120 L90 120 M110 120 L90 120 M75 115 L70 120 M75 125 L70 120 M105 115 L110 120 M105 125 L110 120', label: '戻る' },
    up: { d: 'M90 170 L90 60 M90 60 L84 68 M90 60 L96 68', label: '上へ' },
    down: { d: 'M90 60 L90 170 M90 170 L84 162 M90 170 L96 162', label: '下へ' },
    front: { d: 'M90 100 L130 100 M130 100 L124 94 M130 100 L124 106', label: '前へ' },
    expand: { d: 'M90 120 L60 120 M90 120 L120 120 M60 120 L66 114 M60 120 L66 126 M120 120 L114 114 M120 120 L114 126', label: '広がる' },
    contract: { d: 'M60 120 L90 120 M120 120 L90 120 M66 114 L60 120 M66 126 L60 120 M114 114 L120 120 M114 126 L120 120', label: '戻る' },
  };
  const arrow = arrows[direction];
  if (!arrow) return null;
  return (
    <g className="bw-arrow" aria-hidden="true">
      <path d={arrow.d} stroke="var(--green-strong, #2d7d6e)" strokeWidth={2.5} fill="none" opacity={0.85} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function ZoneLabel({ zone, active }: { zone: string; active: boolean }) {
  const positions: Record<string, { top: string }> = {
    belly: { top: '62%' },
    chest: { top: '38%' },
    clavicle: { top: '22%' },
  };
  const pos = positions[zone] ?? positions.belly;
  return (
    <span
      className={`bw-zone-label ${active ? 'is-active' : ''}`}
      style={{ top: pos.top }}
    >
      {ZONE_LABELS[zone] ?? zone}
    </span>
  );
}

function AssetImage({ src, alt, onError }: { src: string; alt: string; onError: () => void }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    onError();
    return null;
  }
  return (
    <img
      src={src}
      alt={alt}
      className="bw-ref-image"
      onError={() => { setFailed(true); onError(); }}
    />
  );
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
  const arrowDirs = visual.arrowDirection;
  const showArrows = isRunning && !isCompleted && (phase === 'inhale' || phase === 'exhale');
  const currentArrowPhase = phase === 'inhale' ? 'inhale' : phase === 'exhale' ? 'exhale' : null;
  const currentArrows: string[] = (arrowDirs && currentArrowPhase && arrowDirs[currentArrowPhase]) ?? [];

  if (visual.type === 'phase_animation') {
    const boxPhases: { key: BreathPhase; label: string; side: string }[] = [
      { key: 'inhale', label: '吸う', side: 'top' },
      { key: 'hold-in', label: '止める', side: 'right' },
      { key: 'exhale', label: '吐く', side: 'bottom' },
      { key: 'hold-out', label: '止める', side: 'left' },
    ];
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
        <div className="bw-box-indicator" aria-hidden="true">
          {boxPhases.map((bp) => (
            <div
              key={bp.side}
              className={`bw-box-side bw-box-${bp.side} ${phase === bp.key && isRunning ? 'is-active' : ''}`}
            >
              <span className="bw-box-side-label">{bp.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (visual.type === 'body_breathing') {
    const focus = visual.bodyFocus ?? 'belly';
    const hands = visual.handPlacement ?? [];
    const zones = visual.highlightZones ?? [focus];
    return (
      <div className="bw-body-stage">
        <div className={`bw-body-figure ${isRunning ? 'is-breathing' : ''} ${isCompleted ? 'is-done' : ''}`}>
          <div className={`bw-body-region bw-body-${focus}`} style={regionStyle} />
          <svg className="bw-body-overlay" viewBox="0 0 180 240" aria-hidden="true">
            {hands.map((h) => <HandIcon key={h} placement={h} />)}
            {showArrows && currentArrows.map((d) => <DirectionalArrow key={d} direction={d} active={true} />)}
          </svg>
          <BodyOutline />
          {zones.map((z) => (
            <ZoneLabel key={z} zone={z} active={isRunning && !isCompleted} />
          ))}
        </div>
        {hands.length > 0 && (
          <p className="bw-hand-hint">{HAND_LABELS[hands[0]] ?? ''}添えて呼吸を感じましょう</p>
        )}
        <div className="bw-body-label">
          <strong>{isCompleted ? '完了' : isRunning ? PHASE_LABELS[phase] : '準備'}</strong>
          <span>{isCompleted ? '' : isRunning && phase !== 'idle' ? `${count}秒` : ''}</span>
        </div>
      </div>
    );
  }

  if (visual.type === 'layered_breathing') {
    const layers = visual.layers ?? ['belly', 'chest', 'clavicle'];
    const hands = visual.handPlacement ?? [];
    const zones = visual.highlightZones ?? layers;
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
          <svg className="bw-body-overlay" viewBox="0 0 180 240" aria-hidden="true">
            {hands.map((h) => <HandIcon key={h} placement={h} />)}
            {showArrows && currentArrows.map((d) => <DirectionalArrow key={d} direction={d} active={true} />)}
          </svg>
          <BodyOutline />
          {zones.map((z, i) => (
            <ZoneLabel key={z} zone={z} active={activeLayer === i && isRunning && !isCompleted} />
          ))}
        </div>
        {hands.length > 0 && (
          <p className="bw-hand-hint">手を添えると、呼吸の動きを感じやすくなります</p>
        )}
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
        <AssetImage src={visual.asset} alt={breathwork.nameJa} onError={() => {}} />
      </div>
    );
  }

  if (visual.type === 'static' && visual.asset) {
    return (
      <div className="bw-static-stage">
        <AssetImage src={visual.asset} alt={breathwork.nameJa} onError={() => {}} />
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
