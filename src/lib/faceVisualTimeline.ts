import jawVideo from '../assets/face-visuals/01_jaw_release.mp4?url';
import kapolaVideo from '../assets/face-visuals/02_kapola_awareness.mp4?url';
import simhasanaVideo from '../assets/face-visuals/03_simhasana_face.mp4?url';
import tongueVideo from '../assets/face-visuals/04_tongue_mobility.mp4?url';
import smileVideo from '../assets/face-visuals/06_smile_balance.mp4?url';
import relaxVideo from '../assets/face-visuals/08_face_relax.mp4?url';
import lipVideo from '../assets/face-visuals/05_lip_o_smile.mp4?url';
import grivaVideo from '../assets/face-visuals/07_griva_gentle_corrected.mp4?url';

interface Asset {
  url: string;
  duration: number;
  width: number;
  height: number;
  cropTop: number;
  cropBottom?: number;
  endFrame?: number;
  review?: string;
  mirror: boolean;
  frameSeconds: number;
  neutralFrame: number;
}
type FrameMap =
  | { mode: 'cycle'; phases: Readonly<Record<string, readonly (readonly number[])[]>> }
  | { mode: 'sequence'; frames: readonly number[] };

export const faceVisualAssets: Readonly<Record<string, (Asset & FrameMap) | undefined>> = {
  jaw: { url: jawVideo, duration: 4.2, width: 414, height: 610, cropTop: 65, cropBottom: 85, mirror: false,
    frameSeconds: 0.7, neutralFrame: 0, mode: 'cycle', phases: { hold: [[0]], rest: [[4, 5]] },
    review: '口が開くコマ1～3は除外。閉じた唇の内側の歯の間隔は映像で確認できません。' },
  kapola: { url: kapolaVideo, duration: 3.9, width: 337, height: 764, cropTop: 125, cropBottom: 125, mirror: false,
    frameSeconds: 0.65, neutralFrame: 0, mode: 'cycle', phases: { cheeks: [[1, 2]], rest: [[4, 5]] },
    review: '強く唇をすぼめるコマ3は除外。呼吸指示は監修待ち。' },
  simhasana: { url: simhasanaVideo, duration: 3.9, width: 337, height: 763, cropTop: 125, cropBottom: 125, mirror: false,
    frameSeconds: 0.65, neutralFrame: 0, mode: 'cycle', phases: { lion: [[1, 2]], rest: [[5]] },
    review: '舌が極端に長いコマ3は除外。開口範囲・舌の形は監修待ち。' },
  tongue: { url: tongueVideo, duration: 3.9, width: 337, height: 764, cropTop: 125, cropBottom: 125, mirror: false,
    frameSeconds: 0.65, neutralFrame: 0, mode: 'cycle',
    phases: { 'tongue-front': [[1]], 'tongue-right': [[3]], 'tongue-left': [[5]], rest: [[2, 4]] },
    review: '左右は実演者自身の左右。舌先の形は監修待ち。' },
  smile: { url: smileVideo, duration: 3.9, width: 337, height: 764, cropTop: 125, cropBottom: 125, mirror: false,
    frameSeconds: 0.65, neutralFrame: 0, mode: 'cycle', phases: { smile: [[1, 2, 3]], rest: [[4, 5]] } },
  relax: { url: relaxVideo, duration: 4.2, width: 337, height: 764, cropTop: 140, cropBottom: 135, mirror: false,
    frameSeconds: 0.7, neutralFrame: 0, mode: 'sequence', frames: [1, 2, 4, 4, 5],
    review: '開口するコマ3は除外。額・頬・舌の個別の脱力は映像だけでは判別できません。' },
  lip: {
    url: lipVideo, duration: 6, width: 358, height: 344, cropTop: 44, mirror: false,
    frameSeconds: 0.5, neutralFrame: 4, mode: 'cycle',
    phases: { o: [[0, 1], [6, 7]], smile: [[2, 3], [8, 9]], rest: [[4, 5], [10, 11]] },
  },
  griva: {
    url: grivaVideo, duration: 6.3, width: 276, height: 346, cropTop: 0, mirror: true,
    frameSeconds: 0.45, neutralFrame: 0, mode: 'sequence',
    // Preserve the supplied final front -> down. No invented return.
    endFrame: 13, frames: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13],
  },
};

export interface FaceVisualCue {
  visual: string;
  start: number;
  seconds: number;
  narrationSec: number;
  round: number;
}

export function faceVisualFrame(
  id: string, cue: FaceVisualCue | undefined, cueIndex: number, elapsedMs: number, finished = false,
): number | null {
  const asset = faceVisualAssets[id];
  if (!asset) return null;
  if (!cue) return finished ? asset.endFrame ?? asset.neutralFrame : asset.neutralFrame;
  if (asset.mode === 'sequence') return asset.frames[cueIndex] ?? asset.neutralFrame;
  const localSeconds = elapsedMs / 1000 - cue.start;
  if (localSeconds < cue.narrationSec) return asset.neutralFrame;
  const cycles = asset.phases[cue.visual];
  if (!cycles?.length) return asset.neutralFrame;
  const frames = cycles[(cue.round - 1) % cycles.length];
  const fraction = Math.max(0, Math.min(1, (localSeconds - cue.narrationSec) / (cue.seconds - cue.narrationSec)));
  return frames[Math.min(frames.length - 1, Math.floor(fraction * frames.length))];
}
