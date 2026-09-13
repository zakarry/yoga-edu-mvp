export interface VoiceCue {
  text: string;
  atSeconds: number;
}

export interface VoiceGuideSequence {
  cues: VoiceCue[];
  totalSeconds: number;
}

export type VoiceStatus = 'available' | 'playing' | 'stopped' | 'unavailable';
export type EngineType = 'browser-tts' | 'audio-file' | 'none';

export interface VoiceGuideEngine {
  readonly type: EngineType;
  readonly available: boolean;
  speak(text: string): void;
  stop(): void;
  pause(): void;
  resume(): void;
  unlock(): void;
  getStatus(): { status: VoiceStatus; voiceName: string | null; error: string | null };
}

let currentUtterance: SpeechSynthesisUtterance | null = null;
let cachedJaVoice: SpeechSynthesisVoice | null = null;
let voicesReady = false;
let lastError: string | null = null;

export function isTTSAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function pickJapaneseVoice(): SpeechSynthesisVoice | null {
  if (!isTTSAvailable()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  return voices.find((v) => v.lang === 'ja-JP')
    ?? voices.find((v) => v.lang.startsWith('ja'))
    ?? null;
}

function ensureVoice(): SpeechSynthesisVoice | null {
  if (cachedJaVoice) return cachedJaVoice;
  const v = pickJapaneseVoice();
  if (v) {
    cachedJaVoice = v;
    return v;
  }
  if (!voicesReady && isTTSAvailable()) {
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      voicesReady = true;
      cachedJaVoice = pickJapaneseVoice();
    }, { once: true });
  }
  return null;
}

if (isTTSAvailable()) {
  ensureVoice();
}

export function getVoiceStatus(): { status: VoiceStatus; voiceName: string | null; error: string | null } {
  if (!isTTSAvailable()) return { status: 'unavailable', voiceName: null, error: null };
  const v = ensureVoice();
  let status: VoiceStatus = 'stopped';
  if (window.speechSynthesis.speaking) status = 'playing';
  if (lastError) status = 'stopped';
  return { status, voiceName: v?.name ?? null, error: lastError };
}

export function speak(text: string): void {
  if (!isTTSAvailable()) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.resume();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ja-JP';
  u.rate = 0.9;
  u.pitch = 1.0;
  u.volume = 1.0;
  const v = ensureVoice();
  if (v) u.voice = v;
  u.onstart = () => { lastError = null; };
  u.onend = () => { if (currentUtterance === u) currentUtterance = null; };
  u.onerror = (e) => {
    lastError = (e as SpeechSynthesisErrorEvent).error || 'unknown';
    if (currentUtterance === u) currentUtterance = null;
  };
  currentUtterance = u;
  window.speechSynthesis.speak(u);
}

export function pauseSpeech(): void {
  if (!isTTSAvailable()) return;
  window.speechSynthesis.pause();
}

export function resumeSpeech(): void {
  if (!isTTSAvailable()) return;
  window.speechSynthesis.resume();
}

export function stopSpeech(): void {
  if (!isTTSAvailable()) return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
}

const PHRASE_MAP: Record<string, string> = {
  'AI先生の音声ガイドです。': 'voice-test',
  '吸います。': 'voice-inhale',
  '止めます。': 'voice-hold',
  '吐きます。': 'voice-exhale',
  '自然に呼吸しましょう。': 'voice-breathe-natural',
  '肩の力を抜きましょう。': 'voice-relax-shoulders',
  'あと30秒です。': 'voice-30s',
  'あと15秒です。': 'voice-15s',
  'あと少しです。': 'voice-almost-done',
  'お疲れさまでした。': 'voice-good-job',
  '次のポーズへ進みます。': 'voice-next-pose',
  'Box Breathingを始めます。': 'voice-start-box-breathing',
  '山のポーズを始めます。': 'voice-start-tadasana',
  '猫と牛を始めます。': 'voice-start-catcow',
  '瞑想を始めます。': 'voice-start-meditation',
  '腹式呼吸を始めます。': 'voice-start-abdominal',
  '立ち木のポーズを始めます。': 'voice-start-vrksasana',
  '前屈のポーズを始めます。': 'voice-start-uttanasana',
  '子供のポーズを始めます。': 'voice-start-balasana',
  '休息のポーズを始めます。': 'voice-start-savasana',
  'マインドフルネスを始めます。': 'voice-start-mindfulness',
  '苦しくなければ、鼻からゆっくり吸って、鼻から吐きます。': 'voice-nose-breath',
  '呼吸は止めず、無理のない範囲で鼻呼吸を続けましょう。': 'voice-nose-breath-2',
  '足裏で床を感じ、自然に立ちます。': 'voice-tadasana-1',
  '背骨を無理なく伸ばし、肩の力を抜きます。': 'voice-tadasana-2',
  '自然な呼吸を続けましょう。': 'voice-tadasana-3',
  '吸いながら胸を開き、背中をやさしく反らします。': 'voice-catcow-1',
  '吐きながら背中を丸め、おへそを見るようにします。': 'voice-catcow-2',
  '首は無理に反らさず、呼吸に合わせてゆっくり動きましょう。': 'voice-catcow-3',
  '軸足にゆっくり体重を乗せます。': 'voice-vrksasana-1',
  '視線を一点に置くと、バランスを取りやすくなります。': 'voice-vrksasana-2',
  'ふらついたら無理せず足を下ろして大丈夫です。': 'voice-vrksasana-3',
  '膝は無理に伸ばしきらなくて大丈夫です。': 'voice-uttanasana-1',
  '股関節からゆっくり前へ倒します。': 'voice-uttanasana-2',
  '床に手をつける必要はありません。無理のない位置で止まりましょう。': 'voice-uttanasana-3',
  'お尻をかかとの方向へゆっくり下ろします。': 'voice-balasana-1',
  '背中を広げるように、楽に呼吸しましょう。': 'voice-balasana-2',
  '苦しくない位置で休みます。': 'voice-balasana-3',
  '全身の力を抜いて、楽な姿勢をとります。': 'voice-savasana-1',
  '呼吸をコントロールしようとせず、自然に任せましょう。': 'voice-savasana-2',
};

function getVoiceKey(text: string): string | null {
  return PHRASE_MAP[text] ?? null;
}

const audioBufferCache: Map<string, AudioBuffer> = new Map();
const audioElementCache: Map<string, HTMLAudioElement> = new Map();
let sharedAudioContext: AudioContext | null = null;
let lastDiagnostic: { contextState: string; lastCue: string | null; lastPlayResult: string | null; lastError: string | null } = {
  contextState: 'none', lastCue: null, lastPlayResult: null, lastError: null,
};

function getAudioContext(): AudioContext | null {
  if (sharedAudioContext) return sharedAudioContext;
  const Ctx = (window as any).AudioContext ?? (window as any).webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx();
  sharedAudioContext = ctx;
  lastDiagnostic.contextState = ctx.state;
  return ctx;
}

async function fetchAndDecode(key: string): Promise<AudioBuffer | null> {
  if (audioBufferCache.has(key)) return audioBufferCache.get(key)!;
  const ctx = getAudioContext();
  if (!ctx) return null;
  try {
    const resp = await fetch(`/voice/${key}.mp3`);
    if (!resp.ok) return null;
    const arrayBuf = await resp.arrayBuffer();
    const audioBuf = await ctx.decodeAudioData(arrayBuf);
    audioBufferCache.set(key, audioBuf);
    return audioBuf;
  } catch {
    return null;
  }
}

function getAudioElementForKey(key: string): HTMLAudioElement | null {
  if (audioElementCache.has(key)) return audioElementCache.get(key)!;
  const audio = new Audio(`/voice/${key}.mp3`);
  audio.preload = 'auto';
  audioElementCache.set(key, audio);
  return audio;
}

export async function preloadVoiceKeys(keys: string[]): Promise<void> {
  for (const k of keys) {
    await fetchAndDecode(k);
  }
}

export async function preloadVoicePhrases(phrases: string[]): Promise<void> {
  for (const p of phrases) {
    const key = getVoiceKey(p);
    if (key) await fetchAndDecode(key);
  }
}

export function isLiffEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  if (ua.includes('Line/')) return true;
  if (typeof (window as any).liff !== 'undefined' && (window as any).liff?.isInClient?.()) return true;
  return false;
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return true;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  if (/Mobile/i.test(ua)) return true;
  return false;
}

class BrowserTTSEngine implements VoiceGuideEngine {
  readonly type: EngineType = 'browser-tts';
  get available() { return isTTSAvailable(); }
  speak(text: string) { speak(text); }
  stop() { stopSpeech(); }
  pause() { pauseSpeech(); }
  resume() { resumeSpeech(); }
  unlock() {}
  getStatus() { return getVoiceStatus(); }
}

class AudioFileEngine implements VoiceGuideEngine {
  readonly type: EngineType = 'audio-file';
  readonly available = true;
  private currentSource: AudioBufferSourceNode | null = null;
  private fallbackAudio: HTMLAudioElement | null = null;
  private pendingSpeak: { key: string; text?: string } | null = null;
  private isResuming = false;

  unlock(): void {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      this.isResuming = true;
      ctx.resume().then(() => {
        this.isResuming = false;
        lastDiagnostic.contextState = ctx.state;
        if (this.pendingSpeak) {
          const pending = this.pendingSpeak;
          this.pendingSpeak = null;
          this.speakByKey(pending.key, pending.text);
        }
      }).catch(() => { this.isResuming = false; });
    }
  }

  speak(text: string): void {
    this.stop();
    const key = getVoiceKey(text);
    if (!key) {
      if (isTTSAvailable()) { speak(text); }
      return;
    }
    this.speakByKey(key, text);
  }

  private speakByKey(key: string, fallbackText?: string): void {
    lastDiagnostic.lastCue = key;
    const ctx = getAudioContext();
    if (!ctx) {
      this.playFallback(key, fallbackText);
      return;
    }

    if (ctx.state === 'suspended') {
      if (this.isResuming) {
        this.pendingSpeak = { key, text: fallbackText };
        return;
      }
      this.isResuming = true;
      ctx.resume().then(() => {
        this.isResuming = false;
        lastDiagnostic.contextState = ctx.state;
        if (this.pendingSpeak) {
          const pending = this.pendingSpeak;
          this.pendingSpeak = null;
          this.speakByKey(pending.key, pending.text);
        } else {
          this.speakByKey(key, fallbackText);
        }
      }).catch(() => { this.isResuming = false; });
      return;
    }

    const buffer = audioBufferCache.get(key);
    if (!buffer) {
      fetchAndDecode(key).then((buf) => {
        if (buf) this.playBuffer(buf);
        else this.playFallback(key, fallbackText);
      });
      return;
    }
    this.playBuffer(buffer);
  }

  private playBuffer(buffer: AudioBuffer): void {
    const ctx = getAudioContext();
    if (!ctx) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => {
      if (this.currentSource === source) this.currentSource = null;
    };
    source.start();
    this.currentSource = source;
    lastDiagnostic.lastPlayResult = 'started';
    lastDiagnostic.contextState = ctx.state;
  }

  private playFallback(key: string, fallbackText?: string): void {
    if (fallbackText && isTTSAvailable()) {
      speak(fallbackText);
      lastDiagnostic.lastPlayResult = 'tts-fallback';
      return;
    }
    const audio = getAudioElementForKey(key);
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {
      lastDiagnostic.lastPlayResult = 'failed';
      lastDiagnostic.lastError = 'fallback-play-failed';
    });
    this.fallbackAudio = audio;
    lastDiagnostic.lastPlayResult = 'fallback';
  }

  stop(): void {
    this.pendingSpeak = null;
    if (this.currentSource) {
      try { this.currentSource.stop(); } catch { /* already stopped */ }
      this.currentSource = null;
    }
    if (this.fallbackAudio) {
      this.fallbackAudio.pause();
      this.fallbackAudio.currentTime = 0;
      this.fallbackAudio = null;
    }
  }

  pause(): void {
    const ctx = getAudioContext();
    if (ctx) ctx.suspend().catch(() => {});
    if (this.fallbackAudio) this.fallbackAudio.pause();
  }

  resume(): void {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      this.isResuming = true;
      ctx.resume().then(() => {
        this.isResuming = false;
        lastDiagnostic.contextState = ctx.state;
        if (this.pendingSpeak) {
          const pending = this.pendingSpeak;
          this.pendingSpeak = null;
          this.speakByKey(pending.key, pending.text);
        }
      }).catch(() => { this.isResuming = false; });
    }
    if (this.fallbackAudio) this.fallbackAudio.play().catch(() => {});
  }

  getStatus() {
    const ctx = getAudioContext();
    const state = ctx?.state ?? 'none';
    lastDiagnostic.contextState = state;
    return { status: 'available' as VoiceStatus, voiceName: 'Audio Guide', error: lastDiagnostic.lastError };
  }
}

let activeEngine: VoiceGuideEngine | null = null;

export function getVoiceGuideEngine(): VoiceGuideEngine {
  if (activeEngine) return activeEngine;
  if (isLiffEnvironment() || isMobileDevice()) {
    activeEngine = new AudioFileEngine();
  } else if (isTTSAvailable()) {
    activeEngine = new BrowserTTSEngine();
  } else {
    activeEngine = new AudioFileEngine();
  }
  return activeEngine;
}

export function getEngineType(): EngineType {
  return getVoiceGuideEngine().type;
}

export function unlockAudioContext(): void {
  getVoiceGuideEngine().unlock();
}

export function getAudioDiagnostic(): { contextState: string; lastCue: string | null; lastPlayResult: string | null; lastError: string | null } {
  const ctx = getAudioContext();
  return {
    contextState: ctx?.state ?? lastDiagnostic.contextState,
    lastCue: lastDiagnostic.lastCue,
    lastPlayResult: lastDiagnostic.lastPlayResult,
    lastError: lastDiagnostic.lastError,
  };
}

const POSE_SPECIFIC_CUES: Record<string, Array<{ text: string; atSeconds: number }>> = {
  'tadasana': [
    { text: '足裏で床を感じ、自然に立ちます。', atSeconds: 5 },
    { text: '背骨を無理なく伸ばし、肩の力を抜きます。', atSeconds: 15 },
    { text: '自然な呼吸を続けましょう。', atSeconds: 25 },
  ],
  'catcow': [
    { text: '吸いながら胸を開き、背中をやさしく反らします。', atSeconds: 5 },
    { text: '吐きながら背中を丸め、おへそを見るようにします。', atSeconds: 15 },
    { text: '首は無理に反らさず、呼吸に合わせてゆっくり動きましょう。', atSeconds: 25 },
  ],
  'vrksasana': [
    { text: '軸足にゆっくり体重を乗せます。', atSeconds: 5 },
    { text: '視線を一点に置くと、バランスを取りやすくなります。', atSeconds: 15 },
    { text: 'ふらついたら無理せず足を下ろして大丈夫です。', atSeconds: 25 },
  ],
  'uttanasana': [
    { text: '膝は無理に伸ばしきらなくて大丈夫です。', atSeconds: 5 },
    { text: '股関節からゆっくり前へ倒します。', atSeconds: 15 },
    { text: '床に手をつける必要はありません。無理のない位置で止まりましょう。', atSeconds: 25 },
  ],
  'balasana': [
    { text: 'お尻をかかとの方向へゆっくり下ろします。', atSeconds: 5 },
    { text: '背中を広げるように、楽に呼吸しましょう。', atSeconds: 15 },
    { text: '苦しくない位置で休みます。', atSeconds: 25 },
  ],
  'savasana': [
    { text: '全身の力を抜いて、楽な姿勢をとります。', atSeconds: 5 },
    { text: '呼吸をコントロールしようとせず、自然に任せましょう。', atSeconds: 15 },
  ],
};

export function buildAsanaVoiceGuide(poseId: string, poseName: string, totalMinutes: number): VoiceGuideSequence {
  const totalSeconds = totalMinutes * 60;
  const cues: VoiceCue[] = [
    { text: `${poseName}を始めます。`, atSeconds: 0 },
  ];
  const specificCues = POSE_SPECIFIC_CUES[poseId] ?? [];
  for (const cue of specificCues) {
    if (cue.atSeconds < totalSeconds - 30) {
      cues.push({ text: cue.text, atSeconds: cue.atSeconds });
    }
  }
  cues.push({ text: '苦しくなければ、鼻からゆっくり吸って、鼻から吐きます。', atSeconds: Math.min(10, Math.max(0, totalSeconds - 30)) });
  cues.push({ text: 'あと30秒です。', atSeconds: Math.max(0, totalSeconds - 30) });
  cues.push({ text: 'あと15秒です。', atSeconds: Math.max(0, totalSeconds - 15) });
  cues.push({ text: 'あと少しです。', atSeconds: Math.max(0, totalSeconds - 5) });
  cues.push({ text: 'お疲れさまでした。', atSeconds: totalSeconds });
  cues.push({ text: '次のポーズへ進みます。', atSeconds: totalSeconds + 1 });
  return { cues, totalSeconds };
}

export function buildPranayamaVoiceGuide(poseName: string, totalMinutes: number): VoiceGuideSequence {
  const totalSeconds = totalMinutes * 60;
  const cues: VoiceCue[] = [
    { text: `${poseName}を始めます。`, atSeconds: 0 },
    { text: '肩の力を抜きましょう。', atSeconds: 5 },
  ];
  cues.push({ text: 'あと30秒です。', atSeconds: Math.max(0, totalSeconds - 30) });
  cues.push({ text: 'あと15秒です。', atSeconds: Math.max(0, totalSeconds - 15) });
  cues.push({ text: 'あと少しです。', atSeconds: Math.max(0, totalSeconds - 5) });
  cues.push({ text: 'お疲れさまでした。', atSeconds: totalSeconds });
  cues.push({ text: '次のポーズへ進みます。', atSeconds: totalSeconds + 1 });
  return { cues, totalSeconds };
}

export function buildMeditationVoiceGuide(poseName: string, totalMinutes: number): VoiceGuideSequence {
  const totalSeconds = totalMinutes * 60;
  const cues: VoiceCue[] = [
    { text: `${poseName}を始めます。`, atSeconds: 0 },
    { text: '肩の力を抜きましょう。', atSeconds: 5 },
  ];
  cues.push({ text: 'あと30秒です。', atSeconds: Math.max(0, totalSeconds - 30) });
  cues.push({ text: 'あと15秒です。', atSeconds: Math.max(0, totalSeconds - 15) });
  cues.push({ text: 'あと少しです。', atSeconds: Math.max(0, totalSeconds - 5) });
  cues.push({ text: 'お疲れさまでした。', atSeconds: totalSeconds });
  cues.push({ text: '次のポーズへ進みます。', atSeconds: totalSeconds + 1 });
  return { cues, totalSeconds };
}

export function buildBoxBreathingVoiceGuide(): VoiceGuideSequence {
  const cues: VoiceCue[] = [
    { text: 'Box Breathingを始めます。', atSeconds: 0 },
    { text: '吸います。', atSeconds: 1 },
    { text: '止めます。', atSeconds: 5 },
    { text: '吐きます。', atSeconds: 9 },
    { text: '止めます。', atSeconds: 13 },
    { text: '吸います。', atSeconds: 17 },
    { text: '止めます。', atSeconds: 21 },
    { text: '吐きます。', atSeconds: 25 },
    { text: '止めます。', atSeconds: 29 },
    { text: '吸います。', atSeconds: 33 },
    { text: '止めます。', atSeconds: 37 },
    { text: '吐きます。', atSeconds: 41 },
    { text: '止めます。', atSeconds: 45 },
    { text: '吸います。', atSeconds: 49 },
    { text: '止めます。', atSeconds: 53 },
    { text: '吐きます。', atSeconds: 57 },
    { text: '止めます。', atSeconds: 61 },
  ];
  return { cues, totalSeconds: 64 };
}

export function buildVoiceGuide(pose: { id: string; name: string; type: 'asana' | 'pranayama' | 'dhyana'; defaultMinutes: number }): VoiceGuideSequence {
  if (pose.id === 'box-breathing') {
    return buildBoxBreathingVoiceGuide();
  }
  switch (pose.type) {
    case 'asana':
      return buildAsanaVoiceGuide(pose.id, pose.name, pose.defaultMinutes);
    case 'pranayama':
      return buildPranayamaVoiceGuide(pose.name, pose.defaultMinutes);
    case 'dhyana':
      return buildMeditationVoiceGuide(pose.name, pose.defaultMinutes);
    default:
      return buildAsanaVoiceGuide(pose.id, pose.name, pose.defaultMinutes);
  }
}

export const BOX_BREATHING_PHASE_CUES: Record<string, string> = {
  '吸う': '吸います。',
  '止める': '止めます。',
  '吐く': '吐きます。',
};

export const REMAINING_CUES: Array<{ atRemaining: number; text: string }> = [
  { atRemaining: 30, text: 'あと30秒です。' },
  { atRemaining: 15, text: 'あと15秒です。' },
  { atRemaining: 5, text: 'あと少しです。' },
];

export const ALL_VOICE_KEYS: string[] = [
  'voice-test',
  'voice-inhale',
  'voice-hold',
  'voice-exhale',
  'voice-breathe-natural',
  'voice-relax-shoulders',
  'voice-30s',
  'voice-15s',
  'voice-almost-done',
  'voice-good-job',
  'voice-next-pose',
  'voice-start-box-breathing',
  'voice-start-tadasana',
  'voice-start-catcow',
  'voice-start-meditation',
  'voice-start-abdominal',
  'voice-start-vrksasana',
  'voice-start-uttanasana',
  'voice-start-balasana',
  'voice-start-savasana',
  'voice-start-mindfulness',
  'voice-nose-breath',
  'voice-nose-breath-2',
  'voice-tadasana-1',
  'voice-tadasana-2',
  'voice-tadasana-3',
  'voice-catcow-1',
  'voice-catcow-2',
  'voice-catcow-3',
  'voice-vrksasana-1',
  'voice-vrksasana-2',
  'voice-vrksasana-3',
  'voice-uttanasana-1',
  'voice-uttanasana-2',
  'voice-uttanasana-3',
  'voice-balasana-1',
  'voice-balasana-2',
  'voice-balasana-3',
  'voice-savasana-1',
  'voice-savasana-2',
];
