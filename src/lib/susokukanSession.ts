import narration from './susokukanNarration.json';

export const SUSOKUKAN_INTRO_SEC = 50;
export const SUSOKUKAN_TOTAL_SEC = 300;
export const SUSOKUKAN_AUDIO = '/voice/susokukan-intro-full-v1.wav';
export type SusokukanState = {
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'completed' | 'error';
  elapsed: number;
  subtitle: string;
};

export function susokukanSubtitle(elapsed: number): string {
  if (elapsed >= SUSOKUKAN_INTRO_SEC) return '静寂 — 自分の呼吸を数えます';
  return [...narration].reverse().find(cue => cue.atSec <= elapsed)?.text ?? '';
}

// Only Susokukan uses this player. The media clock owns the entire narration;
// no wall-clock cue can cancel it, including after buffering or a pause.
export class SusokukanSession {
  private audio: HTMLAudioElement | null = null;
  private frame: number | null = null;
  private silenceStarted: number | null = null;
  private silenceElapsed = 0;
  private waitingTimer: ReturnType<typeof setTimeout> | null = null;
  private state: SusokukanState = { status: 'idle', elapsed: 0, subtitle: '' };

  constructor(
    private readonly onChange: (state: SusokukanState) => void,
    private readonly createAudio = () => new Audio(SUSOKUKAN_AUDIO),
    private readonly now = () => performance.now(),
  ) {}

  private publish(status = this.state.status, elapsed = this.state.elapsed) {
    this.state = { status, elapsed, subtitle: susokukanSubtitle(elapsed) };
    this.onChange(this.state);
  }

  private clearWait() {
    if (this.waitingTimer !== null) clearTimeout(this.waitingTimer);
    this.waitingTimer = null;
  }

  private waitForAudio(audio: HTMLAudioElement) {
    this.clearWait();
    this.waitingTimer = setTimeout(() => {
      if (this.audio === audio) this.fail();
    }, 20000);
  }

  private fail() {
    this.dispose();
    this.publish('error');
  }

  private tick = () => {
    this.frame = null;
    if (this.state.status !== 'playing' && this.state.status !== 'loading') return;
    const elapsed = this.silenceStarted !== null
      ? SUSOKUKAN_INTRO_SEC + this.silenceElapsed + (this.now() - this.silenceStarted) / 1000
      : Math.min(SUSOKUKAN_INTRO_SEC, this.audio?.currentTime ?? 0);
    this.publish(elapsed >= SUSOKUKAN_TOTAL_SEC ? 'completed' : this.state.status,
      Math.min(SUSOKUKAN_TOTAL_SEC, elapsed));
    if (elapsed < SUSOKUKAN_TOTAL_SEC) this.frame = requestAnimationFrame(this.tick);
  };

  start() {
    this.dispose();
    this.silenceElapsed = 0;
    this.silenceStarted = null;
    const audio = this.createAudio();
    this.audio = audio;
    audio.preload = 'auto';
    audio.onplaying = () => {
      if (this.audio !== audio || this.state.status === 'paused') return;
      this.clearWait();
      this.publish('playing');
    };
    audio.onwaiting = () => {
      if (this.audio !== audio || this.state.status === 'paused') return;
      this.publish('loading');
      this.waitForAudio(audio);
    };
    audio.onerror = () => { if (this.audio === audio) this.fail(); };
    audio.onended = () => {
      if (this.audio !== audio) return;
      this.clearWait();
      this.silenceStarted = this.state.status === 'paused' ? null : this.now();
      this.publish(this.state.status === 'paused' ? 'paused' : 'playing', SUSOKUKAN_INTRO_SEC);
    };
    this.publish('loading', 0);
    this.waitForAudio(audio);
    // Called directly by the start button so mobile playback keeps its gesture.
    void audio.play().catch(() => {
      if (this.audio === audio && this.state.status !== 'paused') this.fail();
    });
    this.frame = requestAnimationFrame(this.tick);
  }

  pause() {
    if (this.state.status !== 'playing' && this.state.status !== 'loading') return;
    if (this.silenceStarted !== null) {
      this.silenceElapsed += (this.now() - this.silenceStarted) / 1000;
      this.silenceStarted = null;
    }
    this.clearWait();
    this.audio?.pause();
    this.publish('paused', this.state.elapsed >= SUSOKUKAN_INTRO_SEC
      ? SUSOKUKAN_INTRO_SEC + this.silenceElapsed : this.audio?.currentTime ?? 0);
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
  }

  resume() {
    if (this.state.status !== 'paused' || !this.audio) return;
    if (this.state.elapsed >= SUSOKUKAN_INTRO_SEC) {
      this.silenceStarted = this.now();
      this.publish('playing');
    } else {
      const audio = this.audio;
      this.publish('loading');
      this.waitForAudio(audio);
      void audio.play().catch(() => { if (this.audio === audio && this.state.status !== 'paused') this.fail(); });
    }
    this.frame = requestAnimationFrame(this.tick);
  }

  stop() {
    this.dispose();
    this.silenceElapsed = 0;
    this.silenceStarted = null;
    this.publish('idle', 0);
  }

  dispose() {
    this.clearWait();
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    if (this.audio) {
      const audio = this.audio;
      this.audio = null;
      audio.onplaying = audio.onwaiting = audio.onerror = audio.onended = null;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
  }
}
