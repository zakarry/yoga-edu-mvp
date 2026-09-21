import { getVoiceGuideEngine, type VoiceGuideEngine } from './voiceGuide';

export type PracticeCueType = 'voice' | 'silence' | 'complete';

export interface PracticeCue {
  id: string;
  type: PracticeCueType;
  displayText?: string;
  speechText?: string;
  audioKey?: string;
  durationSec?: number;
  phaseDurationSec?: number;
  isFinalCue?: boolean;
  displayRound?: number;
  scheduledAtSec?: number;
}

export type RuntimeSource =
  | 'practice_audio_runtime'
  | 'legacy_asana'
  | 'legacy_breathwork_timer'
  | 'legacy_breathwork_sequence'
  | 'legacy_meditation'
  | 'legacy_susokukan'
  | 'legacy_surya';

export type RuntimeState = 'idle' | 'running' | 'paused' | 'completed' | 'error';

export interface RuntimeEvent {
  type: 'stateChange' | 'subtitle' | 'cueStart' | 'cueEnd' | 'roundChange' | 'phaseChange' | 'error' | 'complete';
  state?: RuntimeState;
  subtitle?: string;
  cueIndex?: number;
  cueId?: string;
  round?: number;
  phase?: string;
  error?: string;
}

export type RuntimeListener = (event: RuntimeEvent) => void;

export interface PracticeSessionConfig {
  practiceId: string;
  cues: PracticeCue[];
  rounds?: number;
  phaseLabels?: string[];
  onEvent?: RuntimeListener;
  totalDurationSec?: number;
}

const SILENCE_WATCHDOG_MS = 300000;

export class PracticeAudioRuntime {
  private engine: VoiceGuideEngine;
  private config: PracticeSessionConfig | null = null;
  private state: RuntimeState = 'idle';
  private listeners: Set<RuntimeListener> = new Set();
  private cueIndex = -1;
  private currentRound = 0;
  private playedCueKeys: Set<string> = new Set();
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private watchdogTimer: ReturnType<typeof setTimeout> | null = null;
  private abortController: AbortController | null = null;
  private isAdvancing = false;
  private silenceRemainingMs = 0;
  private silenceStartedAt = 0;
  private runtimeSource: RuntimeSource = 'practice_audio_runtime';
  private clockTimer: ReturnType<typeof setInterval> | null = null;
  private practiceStartedAt = 0;
  private pauseAccumulatedMs = 0;
  private pausedAt = 0;
  private totalDurationMs = 0;
  private scheduledCues: { cue: PracticeCue; index: number; fired: boolean }[] = [];
  private scheduledCuePlaying = false;

  constructor(engine?: VoiceGuideEngine) {
    this.engine = engine ?? getVoiceGuideEngine();
  }

  get currentState(): RuntimeState { return this.state; }
  get currentCueIndex(): number { return this.cueIndex; }
  get currentRoundNumber(): number { return this.currentRound; }
  get source(): RuntimeSource { return this.runtimeSource; }

  setSource(source: RuntimeSource): void {
    this.runtimeSource = source;
  }

  addListener(listener: RuntimeListener): void {
    this.listeners.add(listener);
  }

  removeListener(listener: RuntimeListener): void {
    this.listeners.delete(listener);
  }

  private emit(event: RuntimeEvent): void {
    for (const listener of this.listeners) {
      try { listener(event); } catch { /* listener errors are non-fatal */ }
    }
    this.config?.onEvent?.(event);
  }

  private setState(state: RuntimeState): void {
    this.state = state;
    this.emit({ type: 'stateChange', state });
  }

  start(config: PracticeSessionConfig): void {
    this.stop();
    this.config = config;
    this.cueIndex = -1;
    this.currentRound = 0;
    this.playedCueKeys.clear();
    this.abortController = new AbortController();
    this.scheduledCues = [];
    this.scheduledCuePlaying = false;
    this.totalDurationMs = (config.totalDurationSec ?? 0) * 1000;
    this.pauseAccumulatedMs = 0;
    this.pausedAt = 0;

    if (this.totalDurationMs > 0) {
      this.practiceStartedAt = Date.now();
      const scheduled = config.cues
        .map((cue, index) => ({ cue, index }))
        .filter(({ cue }) => cue.scheduledAtSec !== undefined);
      this.scheduledCues = scheduled.map(({ cue, index }) => ({
        cue,
        index,
        fired: false,
      }));
      this.startClockTimer();
    }

    this.setState('running');
    this.advance();
  }

  private advance(): void {
    if (this.isAdvancing) return;
    if (!this.config || this.state !== 'running') return;
    this.isAdvancing = true;

    const cues = this.config.cues;
    const nextIndex = this.cueIndex + 1;

    if (nextIndex >= cues.length) {
      if (this.config.rounds && this.currentRound < this.config.rounds - 1) {
        this.currentRound++;
        this.cueIndex = -1;
        this.emit({ type: 'roundChange', round: this.currentRound });
        this.isAdvancing = false;
        this.advance();
        return;
      }
      this.setState('idle');
      this.isAdvancing = false;
      return;
    }

    this.cueIndex = nextIndex;
    const cue = cues[nextIndex];
    const cueKey = `${this.config.practiceId}:r${this.currentRound}:c${nextIndex}:${cue.id}`;

    if (this.playedCueKeys.has(cueKey)) {
      this.isAdvancing = false;
      this.advance();
      return;
    }
    this.playedCueKeys.add(cueKey);

    this.emit({ type: 'cueStart', cueIndex: nextIndex, cueId: cue.id, round: this.currentRound });

    if (cue.scheduledAtSec !== undefined) {
      this.isAdvancing = false;
      this.advance();
      return;
    }

    if (cue.type === 'silence') {
      this.handleSilence(cue);
      return;
    }

    if (cue.type === 'complete') {
      if (cue.displayText) {
        this.emit({ type: 'subtitle', subtitle: cue.displayText });
      }
      this.setState('completed');
      this.emit({ type: 'complete' });
      this.isAdvancing = false;
      return;
    }

    if (cue.isFinalCue && cue.type === 'voice') {
      this.handleFinalVoiceCue(cue, cueKey);
      return;
    }

    if (cue.type === 'voice' && cue.phaseDurationSec) {
      this.handlePhaseVoiceCue(cue, cueKey);
      return;
    }

    this.handleVoiceCue(cue, cueKey);
  }

  private handlePhaseVoiceCue(cue: PracticeCue, cueKey: string): void {
    this.clearSilenceTimer();

    const displayText = cue.displayText ?? cue.speechText ?? '';
    const speechText = cue.speechText ?? cue.displayText ?? '';
    const myCueIndex = this.cueIndex;

    if (displayText) {
      this.emit({ type: 'subtitle', subtitle: displayText });
    }

    const phaseMs = (cue.phaseDurationSec ?? 1) * 1000;

    let voiceEnded = false;
    let timerFired = false;

    const tryAdvance = () => {
      if (!voiceEnded || !timerFired) return;
      this.clearWatchdog();
      this.emit({ type: 'cueEnd', cueIndex: myCueIndex, cueId: cue.id });
      this.isAdvancing = false;
      this.advance();
    };

    this.engine.setOnCueEnd(() => {
      if (this.state !== 'running') { this.isAdvancing = false; return; }
      if (this.cueIndex !== myCueIndex) return;
      voiceEnded = true;
      tryAdvance();
    });

    if (cue.audioKey) {
      this.engine.speakByKey(cue.audioKey, speechText);
    } else {
      this.engine.speak(speechText);
    }

    this.silenceRemainingMs = phaseMs;
    this.silenceStartedAt = Date.now();
    this.silenceTimer = setTimeout(() => {
      if (this.state !== 'running') { this.isAdvancing = false; return; }
      this.silenceRemainingMs = 0;
      timerFired = true;
      tryAdvance();
    }, phaseMs);

    this.startWatchdog(cue, cueKey);
  }

  private handleVoiceCue(cue: PracticeCue, cueKey: string): void {
    this.clearSilenceTimer();

    const displayText = cue.displayText ?? cue.speechText ?? '';
    const speechText = cue.speechText ?? cue.displayText ?? '';
    const myCueIndex = this.cueIndex;

    if (displayText) {
      this.emit({ type: 'subtitle', subtitle: displayText });
    }

    this.engine.setOnCueEnd(() => {
      if (this.state !== 'running') { this.isAdvancing = false; return; }
      if (this.cueIndex !== myCueIndex) return;
      this.clearWatchdog();
      this.emit({ type: 'cueEnd', cueIndex: this.cueIndex, cueId: cue.id });
      this.isAdvancing = false;
      this.advance();
    });

    if (cue.audioKey) {
      this.engine.speakByKey(cue.audioKey, speechText);
    } else {
      this.engine.speak(speechText);
    }

    this.startWatchdog(cue, cueKey);
  }

  private startWatchdog(cue: PracticeCue, _cueKey: string): void {
    this.clearWatchdog();
    const fallbackMs = this.estimateCueMs(cue);
    const myCueIndex = this.cueIndex;
    this.watchdogTimer = setTimeout(() => {
      if (this.state !== 'running') return;
      if (this.cueIndex !== myCueIndex) return;
      this.engine.stop();
      this.engine.setOnCueEnd(null);
      this.emit({ type: 'cueEnd', cueIndex: this.cueIndex, cueId: cue.id });
      this.isAdvancing = false;
      this.advance();
    }, fallbackMs);
  }

  private handleFinalVoiceCue(cue: PracticeCue, cueKey: string): void {
    this.clearSilenceTimer();

    const displayText = cue.displayText ?? cue.speechText ?? '';
    const speechText = cue.speechText ?? cue.displayText ?? '';
    const myCueIndex = this.cueIndex;

    if (displayText) {
      this.emit({ type: 'subtitle', subtitle: displayText });
    }

    this.engine.setOnCueEnd(() => {
      if (this.state !== 'running') { this.isAdvancing = false; return; }
      if (this.cueIndex !== myCueIndex) return;
      this.clearWatchdog();
      this.emit({ type: 'cueEnd', cueIndex: this.cueIndex, cueId: cue.id });
      this.isAdvancing = false;
      setTimeout(() => {
        if (this.state !== 'running') return;
        this.advance();
      }, 400);
    });

    if (cue.audioKey) {
      this.engine.speakByKey(cue.audioKey, speechText);
    } else {
      this.engine.speak(speechText);
    }

    this.startWatchdog(cue, cueKey);
  }

  private skipFailedCue(cue: PracticeCue, reason: string): void {
    this.engine.stop();
    this.engine.setOnCueEnd(null);
    this.clearWatchdog();
    this.emit({ type: 'error', error: `cue skipped: ${cue.id} — ${reason}` });
    this.emit({ type: 'cueEnd', cueIndex: this.cueIndex, cueId: cue.id });
    this.isAdvancing = false;
    this.advance();
  }

  private estimateCueMs(cue: PracticeCue): number {
    if (cue.isFinalCue && cue.audioKey) {
      const dur = this.engine.getAudioDuration(cue.audioKey);
      if (dur && dur > 0) {
        const rate = cue.audioKey.startsWith('voice-nidra') ? 1.08 : 1.0;
        return (dur / rate + 5) * 1000;
      }
      return 30000;
    }
    if (cue.phaseDurationSec) {
      return (cue.phaseDurationSec + 10) * 1000;
    }
    if (cue.audioKey) {
      const dur = this.engine.getAudioDuration(cue.audioKey);
      if (dur && dur > 0) {
        const rate = cue.audioKey.startsWith('voice-nidra') ? 1.08 : 1.0;
        return (dur / rate + 3) * 1000;
      }
      return 8000;
    }
    const text = cue.speechText ?? cue.displayText ?? '';
    const charCount = text.length;
    return Math.max(3000, charCount * 180);
  }

  private clearWatchdog(): void {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  private handleSilence(cue: PracticeCue): void {
    this.clearWatchdog();
    this.engine.setOnCueEnd(null);

    const duration = cue.durationSec ?? 30;
    if (cue.displayText) {
      this.emit({ type: 'subtitle', subtitle: cue.displayText });
    }
    this.clearSilenceTimer();
    const ms = duration * 1000;
    this.silenceRemainingMs = ms;
    this.silenceStartedAt = Date.now();
    this.silenceTimer = setTimeout(() => {
      if (this.state !== 'running') { this.isAdvancing = false; return; }
      this.silenceRemainingMs = 0;
      this.emit({ type: 'cueEnd', cueIndex: this.cueIndex, cueId: cue.id });
      this.isAdvancing = false;
      this.advance();
    }, ms);
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private startClockTimer(): void {
    this.stopClockTimer();
    this.clockTimer = setInterval(() => {
      if (this.state !== 'running') return;
      this.checkScheduledCues();
    }, 200);
  }

  private stopClockTimer(): void {
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
      this.clockTimer = null;
    }
  }

  private getElapsedMs(): number {
    if (this.practiceStartedAt === 0) return 0;
    const now = this.pausedAt > 0 ? this.pausedAt : Date.now();
    return now - this.practiceStartedAt - this.pauseAccumulatedMs;
  }

  private getRemainingSec(): number {
    if (this.totalDurationMs === 0) return Infinity;
    return Math.max(0, (this.totalDurationMs - this.getElapsedMs()) / 1000);
  }

  private checkScheduledCues(): void {
    if (this.scheduledCues.length === 0) return;
    if (this.scheduledCuePlaying) return;
    const remainingSec = this.getRemainingSec();

    for (const sc of this.scheduledCues) {
      if (sc.fired) continue;
      const fireAtSec = sc.cue.scheduledAtSec!;
      if (remainingSec <= fireAtSec) {
        sc.fired = true;
        this.fireScheduledCue(sc);
        return;
      }
    }
  }

  private fireScheduledCue(sc: { cue: PracticeCue; index: number; fired: boolean }): void {
    const cue = sc.cue;
    const displayText = cue.displayText ?? cue.speechText ?? '';

    if (cue.type === 'complete') {
      if (displayText) {
        this.emit({ type: 'subtitle', subtitle: displayText });
      }
      this.setState('completed');
      this.emit({ type: 'complete' });
      return;
    }

    const speechText = cue.speechText ?? cue.displayText ?? '';

    if (displayText) {
      this.emit({ type: 'subtitle', subtitle: displayText });
    }
    this.emit({ type: 'cueStart', cueIndex: sc.index, cueId: cue.id, round: this.currentRound });

    this.scheduledCuePlaying = true;
    this.engine.setOnCueEnd(() => {
      if (this.state !== 'running') { this.scheduledCuePlaying = false; return; }
      this.clearWatchdog();
      this.emit({ type: 'cueEnd', cueIndex: sc.index, cueId: cue.id });
      this.scheduledCuePlaying = false;
    });

    if (cue.audioKey) {
      this.engine.speakByKey(cue.audioKey, speechText);
    } else {
      this.engine.speak(speechText);
    }

    const fallbackMs = this.estimateCueMs(cue);
    this.watchdogTimer = setTimeout(() => {
      if (this.state !== 'running') { this.scheduledCuePlaying = false; return; }
      this.engine.stop();
      this.scheduledCuePlaying = false;
      this.emit({ type: 'cueEnd', cueIndex: sc.index, cueId: cue.id });
    }, fallbackMs);
  }

  pause(): void {
    if (this.state !== 'running') return;
    this.pausedAt = Date.now();
    this.stopClockTimer();
    this.engine.pause();
    if (this.silenceTimer && this.silenceStartedAt > 0) {
      const elapsed = Date.now() - this.silenceStartedAt;
      this.silenceRemainingMs = Math.max(0, this.silenceRemainingMs - elapsed);
      this.clearSilenceTimer();
    }
    this.clearWatchdog();
    this.setState('paused');
  }

  resume(): void {
    if (this.state !== 'paused') return;
    if (this.pausedAt > 0) {
      this.pauseAccumulatedMs += Date.now() - this.pausedAt;
      this.pausedAt = 0;
    }
    this.startClockTimer();
    this.engine.resume();
    this.setState('running');
    if (this.silenceRemainingMs > 0) {
      this.silenceStartedAt = Date.now();
      const remaining = this.silenceRemainingMs;
      this.silenceTimer = setTimeout(() => {
        if (this.state !== 'running') { this.isAdvancing = false; return; }
        this.silenceRemainingMs = 0;
        this.emit({ type: 'cueEnd', cueIndex: this.cueIndex, cueId: this.config?.cues[this.cueIndex]?.id });
        this.isAdvancing = false;
        this.advance();
      }, remaining);
    } else if (this.config && this.cueIndex >= 0) {
      const cue = this.config.cues[this.cueIndex];
      if (cue && cue.type === 'voice' && cue.scheduledAtSec === undefined) {
        const cueKey = `${this.config.practiceId}:r${this.currentRound}:c${this.cueIndex}:${cue.id}`;
        this.startWatchdog(cue, cueKey);
      }
    }
  }

  next(): void {
    if (this.state !== 'running' && this.state !== 'paused') return;
    this.engine.stop();
    this.clearSilenceTimer();
    this.clearWatchdog();
    this.isAdvancing = false;
    this.advance();
  }

  stop(): void {
    this.engine.stop();
    this.engine.setOnCueEnd(null);
    this.stopClockTimer();
    this.clearSilenceTimer();
    this.clearWatchdog();
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isAdvancing = false;
    this.scheduledCues = [];
    this.scheduledCuePlaying = false;
    this.totalDurationMs = 0;
    this.practiceStartedAt = 0;
    this.pauseAccumulatedMs = 0;
    this.pausedAt = 0;
    this.config = null;
    this.cueIndex = -1;
    this.currentRound = 0;
    this.playedCueKeys.clear();
    this.setState('idle');
  }

  dispose(): void {
    this.stop();
    this.listeners.clear();
  }
}

let activeRuntime: PracticeAudioRuntime | null = null;

export function getPracticeAudioRuntime(): PracticeAudioRuntime {
  if (!activeRuntime) {
    activeRuntime = new PracticeAudioRuntime();
  }
  return activeRuntime;
}

export function createPracticeAudioRuntime(): PracticeAudioRuntime {
  return new PracticeAudioRuntime();
}
