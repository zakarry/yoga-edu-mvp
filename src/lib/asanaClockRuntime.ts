import { getVoiceGuideEngine } from './voiceGuide';

export type CuePriority = 'mandatory' | 'optional';

export interface AsanaCueTimed {
  atMs: number;
  text: string;
  audioKey?: string;
  priority?: CuePriority;
  visualStage?: string;
}

export interface AsanaClockConfig {
  poseId: string;
  durationMs: number;
  timeline: AsanaCueTimed[];
  onSubtitle?: (text: string) => void;
  onVisualStage?: (stage: string) => void;
  onComplete?: () => void;
}

export interface TickInfo {
  remainingMs: number;
  finishing: boolean;
}

type TickCallback = (info: TickInfo) => void;

const OPTIONAL_SKIP_THRESHOLD_MS = 5000;
const COMPLETION_GAP_MS = 800;

export class AsanaClockRuntime {
  private config: AsanaClockConfig | null = null;
  private startedAt = 0;
  private pauseAccumulatedMs = 0;
  private pausedAt: number | null = null;
  private firedCues: Set<number> = new Set();
  private pendingQueue: AsanaCueTimed[] = [];
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private completed = false;
  private onTick: TickCallback | null = null;
  private completionTimer: ReturnType<typeof setTimeout> | null = null;

  start(config: AsanaClockConfig, onTick: TickCallback): void {
    this.stop();
    this.config = config;
    this.startedAt = Date.now();
    this.pauseAccumulatedMs = 0;
    this.pausedAt = null;
    this.firedCues = new Set();
    this.pendingQueue = [];
    this.completed = false;
    this.onTick = onTick;

    const engine = getVoiceGuideEngine();
    engine.setOnCueEnd(() => this.onAudioEnded());

    this.scheduleLoop();
  }

  pause(): void {
    if (this.pausedAt !== null) return;
    this.pausedAt = Date.now();
    this.clearLoop();
    getVoiceGuideEngine().pause();
  }

  resume(): void {
    if (this.pausedAt === null) return;
    this.pauseAccumulatedMs += Date.now() - this.pausedAt;
    this.pausedAt = null;
    getVoiceGuideEngine().resume();
    this.scheduleLoop();
  }

  stop(): void {
    this.clearLoop();
    this.clearCompletionTimer();
    getVoiceGuideEngine().setOnCueEnd(null);
    getVoiceGuideEngine().stop();
    this.config = null;
    this.completed = false;
    this.firedCues.clear();
    this.pendingQueue = [];
  }

  dispose(): void {
    this.stop();
  }

  get elapsed(): number {
    if (!this.startedAt) return 0;
    if (this.pausedAt !== null) {
      return Math.max(0, this.pausedAt - this.startedAt - this.pauseAccumulatedMs);
    }
    return Math.max(0, Date.now() - this.startedAt - this.pauseAccumulatedMs);
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

  private clearCompletionTimer(): void {
    if (this.completionTimer !== null) {
      clearTimeout(this.completionTimer);
      this.completionTimer = null;
    }
  }

  private tick(): void {
    if (!this.config || this.completed) return;
    const elapsed = this.elapsed;
    const remaining = Math.max(0, this.config.durationMs - elapsed);
    const engine = getVoiceGuideEngine();
    const playing = engine.isPlaying();

    this.collectDueCues(elapsed);

    if (!playing && this.pendingQueue.length > 0) {
      this.fireNextPending();
    }

    const allMandatoryFired = this.allMandatoryFired();
    const finishing = remaining === 0 && (!allMandatoryFired || playing);

    this.onTick?.({ remainingMs: remaining, finishing });

    if (elapsed >= this.config.durationMs && allMandatoryFired && !playing && !this.completed) {
      this.scheduleCompletion();
    }
  }

  private collectDueCues(elapsed: number): void {
    if (!this.config) return;
    for (const cue of this.config.timeline) {
      if (this.firedCues.has(cue.atMs)) continue;
      if (elapsed < cue.atMs) continue;

      const isOptional = (cue.priority ?? 'mandatory') === 'optional';
      if (isOptional && elapsed > cue.atMs + OPTIONAL_SKIP_THRESHOLD_MS) {
        this.firedCues.add(cue.atMs);
        continue;
      }

      if (!this.isInQueue(cue)) {
        this.pendingQueue.push(cue);
      }
    }
  }

  private isInQueue(cue: AsanaCueTimed): boolean {
    return this.pendingQueue.some((c) => c.atMs === cue.atMs);
  }

  private fireNextPending(): void {
    if (this.pendingQueue.length === 0) return;
    const cue = this.pendingQueue.shift()!;
    this.firedCues.add(cue.atMs);
    this.fireCue(cue);
  }

  private fireCue(cue: AsanaCueTimed): void {
    const engine = getVoiceGuideEngine();
    if (cue.visualStage) this.config?.onVisualStage?.(cue.visualStage);
    this.config?.onSubtitle?.(cue.text);
    if (cue.audioKey) {
      engine.speakByKey(cue.audioKey, cue.text);
    } else {
      engine.speak(cue.text);
    }
  }

  private onAudioEnded(): void {
    if (!this.config || this.completed) return;
    if (this.pendingQueue.length > 0) {
      this.fireNextPending();
    } else {
      this.tryCompletion();
    }
  }

  private tryCompletion(): void {
    if (!this.config || this.completed) return;
    const elapsed = this.elapsed;
    const allMandatoryFired = this.allMandatoryFired();
    const playing = getVoiceGuideEngine().isPlaying();
    if (elapsed >= this.config.durationMs && allMandatoryFired && !playing) {
      this.scheduleCompletion();
    }
  }

  private scheduleCompletion(): void {
    if (this.completed) return;
    this.clearCompletionTimer();
    this.completed = true;
    this.clearLoop();
    this.completionTimer = setTimeout(() => {
      this.clearCompletionTimer();
      this.config?.onComplete?.();
    }, COMPLETION_GAP_MS);
  }

  private allMandatoryFired(): boolean {
    if (!this.config) return true;
    for (const cue of this.config.timeline) {
      const isMandatory = (cue.priority ?? 'mandatory') === 'mandatory';
      if (isMandatory && !this.firedCues.has(cue.atMs)) return false;
    }
    return true;
  }
}
