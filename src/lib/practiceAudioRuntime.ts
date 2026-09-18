import { getVoiceGuideEngine, type VoiceGuideEngine } from './voiceGuide';

export type PracticeCueType = 'voice' | 'silence' | 'complete';

export interface PracticeCue {
  id: string;
  type: PracticeCueType;
  displayText?: string;
  speechText?: string;
  audioKey?: string;
  durationSec?: number;
  isFinalCue?: boolean;
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
  private runtimeSource: RuntimeSource = 'practice_audio_runtime';

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
      this.setState('completed');
      this.emit({ type: 'complete' });
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

    this.handleVoiceCue(cue, cueKey);
  }

  private handleVoiceCue(cue: PracticeCue, cueKey: string): void {
    const displayText = cue.displayText ?? cue.speechText ?? '';
    const speechText = cue.speechText ?? cue.displayText ?? '';

    if (displayText) {
      this.emit({ type: 'subtitle', subtitle: displayText });
    }

    this.engine.setOnCueEnd(() => {
      if (this.state !== 'running') { this.isAdvancing = false; return; }
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
    this.watchdogTimer = setTimeout(() => {
      if (this.state !== 'running') return;
      if (!this.engine.isPlaying()) {
        this.emit({ type: 'cueEnd', cueIndex: this.cueIndex, cueId: cue.id });
        this.isAdvancing = false;
        this.advance();
      }
    }, fallbackMs);
  }

  private estimateCueMs(cue: PracticeCue): number {
    if (cue.audioKey) {
      const dur = this.engine.getAudioDuration(cue.audioKey);
      if (dur && dur > 0) {
        const rate = cue.audioKey.startsWith('voice-nidra') ? 1.08 : 1.0;
        return (dur / rate + 3) * 1000;
      }
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
    const duration = cue.durationSec ?? 30;
    if (cue.displayText) {
      this.emit({ type: 'subtitle', subtitle: cue.displayText });
    }
    this.clearSilenceTimer();
    const ms = Math.min(duration * 1000, SILENCE_WATCHDOG_MS);
    this.silenceTimer = setTimeout(() => {
      if (this.state !== 'running') { this.isAdvancing = false; return; }
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

  pause(): void {
    if (this.state !== 'running') return;
    this.engine.pause();
    this.clearSilenceTimer();
    this.clearWatchdog();
    this.setState('paused');
  }

  resume(): void {
    if (this.state !== 'paused') return;
    this.engine.resume();
    this.setState('running');
    if (this.silenceTimer) {
      this.silenceTimer = setTimeout(() => {
        if (this.state !== 'running') { this.isAdvancing = false; return; }
        this.emit({ type: 'cueEnd', cueIndex: this.cueIndex, cueId: this.config?.cues[this.cueIndex]?.id });
        this.isAdvancing = false;
        this.advance();
      }, 1000);
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
    this.clearSilenceTimer();
    this.clearWatchdog();
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isAdvancing = false;
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
