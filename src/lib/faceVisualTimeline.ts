import lipVideo from '../assets/face-visuals/05_lip_o_smile.mp4?url';
import grivaVideo from '../assets/face-visuals/07_griva_gentle_corrected.mp4?url';

interface Asset {
  url: string;
  duration: number;
  width: number;
  height: number;
  cropTop: number;
  mirror: boolean;
  frameSeconds: number;
  neutralFrame: number;
}
type FrameMap =
  | { mode: 'cycle'; phases: Readonly<Record<string, readonly (readonly number[])[]>> }
  | { mode: 'sequence'; frames: readonly number[] };

export const faceVisualAssets: Readonly<Record<string, (Asset & FrameMap) | undefined>> = {
  lip: {
    url: lipVideo, duration: 6, width: 358, height: 344, cropTop: 44, mirror: false,
    frameSeconds: 0.5, neutralFrame: 4, mode: 'cycle',
    phases: { o: [[0, 1], [6, 7]], smile: [[2, 3], [8, 9]], rest: [[4, 5], [10, 11]] },
  },
  griva: {
    url: grivaVideo, duration: 6.3, width: 276, height: 346, cropTop: 0, mirror: true,
    frameSeconds: 0.45, neutralFrame: 0, mode: 'sequence',
    // Right/front/left/front x3, down, return, rest. Source has no final return.
    // Reuse its last front-facing frame for the final return and rest.
    frames: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 12, 12],
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
  id: string, cue: FaceVisualCue | undefined, cueIndex: number, elapsedMs: number,
): number | null {
  const asset = faceVisualAssets[id];
  if (!asset) return null;
  if (!cue) return asset.neutralFrame;
  if (asset.mode === 'sequence') return asset.frames[cueIndex] ?? asset.neutralFrame;
  const localSeconds = elapsedMs / 1000 - cue.start;
  if (localSeconds < cue.narrationSec) return asset.neutralFrame;
  const cycles = asset.phases[cue.visual];
  if (!cycles?.length) return asset.neutralFrame;
  const frames = cycles[(cue.round - 1) % cycles.length];
  const fraction = Math.max(0, Math.min(1, (localSeconds - cue.narrationSec) / (cue.seconds - cue.narrationSec)));
  return frames[Math.min(frames.length - 1, Math.floor(fraction * frames.length))];
}
