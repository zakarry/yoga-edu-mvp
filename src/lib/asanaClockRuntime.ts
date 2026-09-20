import { getVoiceGuideEngine } from './voiceGuide';

export interface AsanaCueTimed {
  atMs: number;
  text: string;
  audioKey?: string;
}

export interface AsanaClockConfig {
  poseId: string;
  durationMs: number;
  timeline: AsanaCueTimed[];
  onSubtitle?: (text: string) => void;
  onComplete?: () => void;
}

type TickCallback = (remainingMs: number) => void;

export class AsanaClockRuntime {
  private config: AsanaClockConfig | null = null;
  private startedAt = 0;
  private pauseAccumulatedMs = 0;
  private pausedAt: number | null = null;
  private firedCues: Set<number> = new Set();
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private completed = false;
  private onTick: TickCallback | null = null;

  start(config: AsanaClockConfig, onTick: TickCallback): void {
    this.stop();
    this.config = config;
    this.startedAt = Date.now();
    this.pauseAccumulatedMs = 0;
    this.pausedAt = null;
    this.firedCues = new Set();
    this.completed = false;
    this.onTick = onTick;
    this.scheduleLoop();
  }

  pause(): void {
    if (this.pausedAt !== null) return;
    this.pausedAt = Date.now();
    this.clearLoop();
  }

  resume(): void {
    if (this.pausedAt === null) return;
    this.pauseAccumulatedMs += Date.now() - this.pausedAt;
    this.pausedAt = null;
    this.scheduleLoop();
  }

  stop(): void {
    this.clearLoop();
    getVoiceGuideEngine().stop();
    this.config = null;
    this.completed = false;
    this.firedCues.clear();
  }

  dispose(): void {
    this.stop();
  }

  get elapsed(): number {
    if (!this.startedAt) return 0;
    const base = Date.now() - this.startedAt - this.pauseAccumulatedMs;
    if (this.pausedAt !== null) {
      return (this.pausedAt - this.startedAt - this.pauseAccumulatedMs);
    }
    return Math.max(0, base);
  }

  private scheduleLoop(): void {
    this.clearLoop();
    this.tickInterval = setInterval(() => this.tick(), 100);
  }

  private clearLoop(): void {
    if (this.tickInterval !== null) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  private tick(): void {
    if (!this.config || this.completed) return;
    const elapsed = this.elapsed;
    const remaining = Math.max(0, this.config.durationMs - elapsed);

    this.onTick?.(remaining);

    for (const cue of this.config.timeline) {
      if (!this.firedCues.has(cue.atMs) && elapsed >= cue.atMs) {
        this.firedCues.add(cue.atMs);
        this.fireCue(cue);
      }
    }

    if (elapsed >= this.config.durationMs && !this.completed) {
      this.completed = true;
      this.clearLoop();
      this.config.onComplete?.();
    }
  }

  private fireCue(cue: AsanaCueTimed): void {
    const engine = getVoiceGuideEngine();
    this.config?.onSubtitle?.(cue.text);
    if (cue.audioKey) {
      engine.speakByKey(cue.audioKey, cue.text);
    } else {
      engine.speak(cue.text);
    }
  }
}
