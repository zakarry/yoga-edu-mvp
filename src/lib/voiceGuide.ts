import { getCatalogEntry } from './poseCatalog';

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
  speakByKey(key: string, fallbackText?: string): void;
  stop(): void;
  pause(): void;
  resume(): void;
  unlock(): void;
  getAudioDuration(key: string): number | null;
  setOnCueEnd(cb: (() => void) | null): void;
  getStatus(): { status: VoiceStatus; voiceName: string | null; error: string | null };
}

let currentUtterance: SpeechSynthesisUtterance | null = null;
let cachedJaVoice: SpeechSynthesisVoice | null = null;
let cueEndCallback: (() => void) | null = null;

export function setCueEndCallback(cb: (() => void) | null): void {
  cueEndCallback = cb;
}
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
  u.onend = () => { if (currentUtterance === u) currentUtterance = null; if (cueEndCallback) cueEndCallback(); };
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
  '腹式呼吸を始めます。肩の力を抜いて、楽な姿勢をとりましょう。': 'voice-abdominal-intro-1',
  '鼻からゆっくり吸います。': 'voice-abdominal-r1',
  '鼻からゆっくり吐いて、力を抜きます。': 'voice-abdominal-r2',
  'もう一度、鼻からゆっくり吸います。': 'voice-abdominal-r3',
  'お腹の広がりを感じましょう。': 'voice-abdominal-r4',
  '胸式呼吸を始めます。肩の力を抜いて、楽な姿勢をとりましょう。': 'voice-thoracic-intro-1',
  '胸の広がりを感じましょう。': 'voice-thoracic-r4',
  'お腹から胸、鎖骨の順に吸います。': 'voice-complete-r1',
  'ゆっくり吐いて、上から順に戻します。': 'voice-complete-r2',
  '最後の呼吸です。': 'voice-abdominal-end',
  '自然な呼吸に戻りましょう。': 'voice-abdominal-end-2',
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
  '膝を少し曲げても大丈夫です。': 'voice-paschimottanasana-1',
  '股関節からゆっくり前に倒します。': 'voice-paschimottanasana-2',
  '無理のない位置で止まりましょう。': 'voice-paschimottanasana-3',
  '座って前屈を始めます。': 'voice-start-paschimottanasana',
  'テストポーズを始めます。': 'voice-start-test-pose',
  '足裏で床を感じ、立ちます。': 'voice-test-pose-1',
  '肩の力を抜きます。': 'voice-test-pose-2',
  'もう一度、吸いながら胸を開きます。': 'voice-catcow-r1',
  '吐きながら背中を丸めましょう。': 'voice-catcow-r2',
  'もう一度、軸足を安定させましょう。': 'voice-vrksasana-r1',
  '視線を一点に置いて、無理のない範囲で続けます。': 'voice-vrksasana-r2',
  'もう一度、膝を楽にしてみましょう。': 'voice-uttanasana-r1',
  '床に手をつける必要はありません。': 'voice-uttanasana-r2',
  'お尻をかかとに預けて、リラックスしましょう。': 'voice-balasana-r1',
  '足裏で床を感じ、まっすぐ立ちましょう。': 'voice-tadasana-r1',
  '肩の力を抜いて、自然な呼吸を続けます。': 'voice-tadasana-r2',
  '全身の力を抜いて、楽な姿勢をとりましょう。': 'voice-savasana-r1',
  '苦しくなければ、鼻からゆっくり吸います。胸郭が前後左右に広がる感覚を感じてみましょう。': 'voice-thoracic-1',
  '鼻からゆっくり吐きます。胸郭が自然に戻るのを感じましょう。': 'voice-thoracic-2',
  '無理に大きく吸おうとせず、楽にできる範囲で続けましょう。': 'voice-thoracic-3',
  'もう一度、胸の広がりを感じながら吸います。': 'voice-thoracic-r1',
  'ゆっくり吐いて、力を抜きましょう。': 'voice-thoracic-r2',
  'お腹が膨らむのを感じながら吸います。': 'voice-abdominal-1',
  'ゆっくり吐いて、お腹が戻るのを感じます。': 'voice-abdominal-2',
  'Box Breathingを始めます。4秒吸って、4秒止めて、4秒吐いて、4秒止めます。': 'voice-box-intro',
  '無理のない範囲で行いましょう。': 'voice-box-intro-2',
  '鼻からゆっくり吐きます。': 'voice-box-exhale',
  'テスト呼吸法を始めます。': 'voice-start-test-breathwork',
  'もう一度、ゆっくり吸います。': 'voice-test-breathwork-r1',
  '完全なヨガ呼吸を始めます。': 'voice-start-complete-breathing',
  'まずお腹を膨らませ、次に胸郭を広げ、最後に鎖骨周りも少し広げます。': 'voice-complete-breathing-3',
  'もう一度、お腹から胸、鎖骨の順に吸います。': 'voice-complete-breathing-r1',
  'ゆっくり吐いて、上から順に戻しましょう。': 'voice-complete-breathing-r2',
  '楽な姿勢で座り、背筋を伸ばして、肩の力を抜きます。': 'voice-susokukan-1',
  '目は閉じるか、うつむき加減にします。': 'voice-susokukan-2',
  'ここからは、余計なことを考えるのをやめます。': 'voice-susokukan-3',
  '鼻から吸って、鼻からはいて。': 'voice-susokukan-4',
  '余計なことを考えないために、自分の息を数えます。': 'voice-susokukan-5',
  '吸って吐いて、ひとーつ。': 'voice-susokukan-6',
  '吸って吐いて、ふたーつ。': 'voice-susokukan-7',
  '自分の呼吸を数えることだけに集中していきます。': 'voice-susokukan-8',
  'まもなく、5分間の時間が終わります。': 'voice-susokukan-end-1',
  '息を数えるのをやめて、ゆっくりと手先や足先を動かし、ご自身の身体に意識を戻していきます。': 'voice-susokukan-end-2',
  '準備ができたら、ゆっくりと目を開けてください。': 'voice-susokukan-end-3',
  '楽な姿勢で座り、肩の力を抜いていきましょう。': 'voice-mindfulness-1',
  '考えるのをやめて、感じる。': 'voice-mindfulness-3',
  '今ここにある、身体の感覚にただ意識を向けていきます。': 'voice-mindfulness-4',
  '無理にコントロールしようとせず、今の自然な呼吸を繰り返します。': 'voice-mindfulness-6',
  '理由も目的も考えない。': 'voice-mindfulness-7',
  '善い悪いの評価もしない、好き嫌いの判断もしない。': 'voice-mindfulness-8',
  'ただ、出入りする息の感覚を見つめていきます。': 'voice-mindfulness-9',
  '評価をするのをやめて、受け入れて受け流す。': 'voice-mindfulness-10',
  'もし途中で、何か考えや雑念が浮かんできたら、': 'voice-mindfulness-11',
  '頭に浮かんだものをそのまま受け入れて、流してください。': 'voice-mindfulness-12',
  '流していったら、また淡々と、鼻呼吸の感覚に戻ります。': 'voice-mindfulness-13',
  '吸う息、吐く息を通じて、この空間の空気と自分の身体が地続きになっていきます。': 'voice-mindfulness-14',
  '自分が自然と一体化していく感覚を楽しみましょう。': 'voice-mindfulness-15',
  '何かをしようとせず、ただ、環境の中に身を委ねておきます。': 'voice-mindfulness-16',
  'ゆっくりと手先や足先を動かし、ご自身の身体に意識を戻していきます。': 'voice-mindfulness-end-2',
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
  speakByKey(_key: string, fallbackText?: string) { if (fallbackText) speak(fallbackText); }
  stop() { stopSpeech(); }
  pause() { pauseSpeech(); }
  resume() { resumeSpeech(); }
  unlock() {}
  getAudioDuration(_key: string): number | null { return null; }
  setOnCueEnd(cb: (() => void) | null): void { setCueEndCallback(cb); }
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

  speakByKey(key: string, fallbackText?: string): void {
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
      if (cueEndCallback) cueEndCallback();
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
    audio.onended = () => {
      if (this.fallbackAudio === audio) this.fallbackAudio = null;
      if (cueEndCallback) cueEndCallback();
    };
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

  getAudioDuration(key: string): number | null {
    const buffer = audioBufferCache.get(key);
    if (buffer) return buffer.duration;
    return null;
  }

  setOnCueEnd(cb: (() => void) | null): void { setCueEndCallback(cb); }

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

// Opt-in for Breathwork only. Existing Asana/Meditation engine semantics remain
// unchanged. Callers await each cue, so a new cue never cancels its predecessor.
export function unlockBreathworkAudio(): void {
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state !== 'running') void ctx.resume().catch(() => {});
  } catch { /* Playback reports failure without blocking the practice. */ }
}

export async function prepareBreathworkAudio(key: string): Promise<AudioBuffer | null> {
  let timeout: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      fetchAndDecode(key),
      new Promise<null>((resolve) => { timeout = setTimeout(() => resolve(null), 8000); }),
    ]);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout!);
  }
}

export async function playBreathworkAudio(
  cue: { text: string; audioKey?: string },
  signal: AbortSignal,
  onStart: () => void,
): Promise<boolean> {
  const key = cue.audioKey ?? getVoiceKey(cue.text);
  if (signal.aborted) return false;
  const buffer = key ? await prepareBreathworkAudio(key) : null;
  if (signal.aborted) return false;
  onStart();
  if (!buffer) return false; // Keep subtitles/timeline usable on MP3 failure.
  const ctx = getAudioContext();
  if (!ctx) return false;
  return new Promise<boolean>((resolve) => {
    let source: AudioBufferSourceNode | null = null;
    let settled = false;
    let watchdog: ReturnType<typeof setTimeout>;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      signal.removeEventListener('abort', cancel);
      if (source) {
        source.onended = null;
        try { source.stop(); } catch { /* already ended */ }
        source.disconnect();
      }
      resolve(ok);
    };
    const cancel = () => finish(false);
    signal.addEventListener('abort', cancel, { once: true });
    // Some mobile WebViews leave resume pending. Bound that wait and keep going.
    watchdog = setTimeout(() => finish(false), 5000);
    const start = () => {
      if (settled || signal.aborted) return finish(false);
      try {
        if (ctx.state !== 'running') return finish(false);
        source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => finish(true);
        clearTimeout(watchdog);
        watchdog = setTimeout(() => finish(false), (buffer.duration + 3) * 1000);
        source.start();
      } catch { finish(false); }
    };
    if (ctx.state === 'running') start();
    else ctx.resume().then(start, () => finish(false));
  });
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

export function buildAsanaVoiceGuide(poseId: string, poseName: string, totalMinutes: number): VoiceGuideSequence {
  const totalSeconds = totalMinutes * 60;
  const entry = getCatalogEntry(poseId);
  const vg = entry?.voiceGuide;
  const cues: VoiceCue[] = [
    { text: vg?.intro ?? `${poseName}を始めます。`, atSeconds: 0 },
  ];
  const firstRound = vg?.firstRound ?? [];
  for (const cue of firstRound) {
    if (cue.at < totalSeconds - 35) {
      cues.push({ text: cue.text, atSeconds: cue.at });
    }
  }
  if (vg?.breathingCue) {
    cues.push({ text: vg.breathingCue, atSeconds: Math.min(10, Math.max(0, totalSeconds - 30)) });
  }
  const secondRound = vg?.secondRound ?? [];
  const reviewStart = Math.max(35, Math.floor(totalSeconds * 0.45));
  for (let i = 0; i < secondRound.length; i++) {
    const rc = secondRound[i];
    const at = reviewStart + rc.at;
    if (at < totalSeconds - 35) {
      cues.push({ text: rc.text, atSeconds: at });
    }
  }
  if (vg?.breathingReminderCue) {
    const noseReminderAt = Math.min(totalSeconds - 40, reviewStart + 25);
    if (noseReminderAt > reviewStart && noseReminderAt < totalSeconds - 30) {
      cues.push({ text: vg.breathingReminderCue, atSeconds: noseReminderAt });
    }
  }
  cues.push({ text: 'あと30秒です。', atSeconds: Math.max(0, totalSeconds - 30) });
  cues.push({ text: 'あと15秒です。', atSeconds: Math.max(0, totalSeconds - 15) });
  cues.push({ text: 'あと少しです。', atSeconds: Math.max(0, totalSeconds - 5) });
  cues.push({ text: vg?.completion ?? 'お疲れさまでした。', atSeconds: totalSeconds });
  cues.push({ text: '次のポーズへ進みます。', atSeconds: totalSeconds + 1 });
  return { cues, totalSeconds };
}

export function buildPranayamaVoiceGuide(poseId: string, poseName: string, totalMinutes: number): VoiceGuideSequence {
  const totalSeconds = totalMinutes * 60;
  const entry = getCatalogEntry(poseId);
  const vg = entry?.voiceGuide;
  const cues: VoiceCue[] = [
    { text: vg?.intro ?? `${poseName}を始めます。`, atSeconds: 0 },
  ];
  const firstRound = vg?.firstRound ?? [];
  for (const cue of firstRound) {
    if (cue.at < totalSeconds - 35) {
      cues.push({ text: cue.text, atSeconds: cue.at });
    }
  }
  if (firstRound.length === 0) {
    cues.push({ text: '肩の力を抜きましょう。', atSeconds: 5 });
  }
  cues.push({ text: 'あと30秒です。', atSeconds: Math.max(0, totalSeconds - 30) });
  cues.push({ text: 'あと15秒です。', atSeconds: Math.max(0, totalSeconds - 15) });
  cues.push({ text: 'あと少しです。', atSeconds: Math.max(0, totalSeconds - 5) });
  cues.push({ text: 'お疲れさまでした。', atSeconds: totalSeconds });
  cues.push({ text: '次のポーズへ進みます。', atSeconds: totalSeconds + 1 });
  return { cues, totalSeconds };
}

export function buildMeditationVoiceGuide(poseId: string, poseName: string, totalMinutes: number): VoiceGuideSequence {
  const totalSeconds = totalMinutes * 60;
  const entry = getCatalogEntry(poseId);
  const vg = entry?.voiceGuide;
  const cues: VoiceCue[] = [
    { text: vg?.intro ?? `${poseName}を始めます。`, atSeconds: 0 },
  ];
  const firstRound = vg?.firstRound ?? [];
  for (const cue of firstRound) {
    if (cue.at < totalSeconds - 35) {
      cues.push({ text: cue.text, atSeconds: cue.at });
    }
  }
  if (firstRound.length === 0) {
    cues.push({ text: '肩の力を抜きましょう。', atSeconds: 5 });
  }
  cues.push({ text: 'あと30秒です。', atSeconds: Math.max(0, totalSeconds - 30) });
  cues.push({ text: 'あと15秒です。', atSeconds: Math.max(0, totalSeconds - 15) });
  cues.push({ text: 'あと少しです。', atSeconds: Math.max(0, totalSeconds - 5) });
  cues.push({ text: 'お疲れさまでした。', atSeconds: totalSeconds });
  cues.push({ text: '次のポーズへ進みます。', atSeconds: totalSeconds + 1 });
  return { cues, totalSeconds };
}

export function buildBoxBreathingVoiceGuide(): VoiceGuideSequence {
  const cues: VoiceCue[] = [
    { text: 'Box Breathingを始めます。4秒吸って、4秒止めて、4秒吐いて、4秒止めます。', atSeconds: 0 },
    { text: '無理のない範囲で行いましょう。', atSeconds: 5 },
    { text: '鼻から吸います。', atSeconds: 9 },
    { text: '止めます。', atSeconds: 13 },
    { text: 'ゆっくり吐きます。', atSeconds: 17 },
    { text: '止めます。', atSeconds: 21 },
    { text: '鼻から吸います。', atSeconds: 25 },
    { text: '止めます。', atSeconds: 29 },
    { text: 'ゆっくり吐きます。', atSeconds: 33 },
    { text: '止めます。', atSeconds: 37 },
    { text: '鼻から吸います。', atSeconds: 41 },
    { text: '止めます。', atSeconds: 45 },
    { text: 'ゆっくり吐きます。', atSeconds: 49 },
    { text: '止めます。', atSeconds: 53 },
    { text: '最後の呼吸です。', atSeconds: 57 },
    { text: '鼻から吸います。', atSeconds: 58 },
    { text: '止めます。', atSeconds: 62 },
    { text: 'ゆっくり吐きます。', atSeconds: 66 },
    { text: '止めます。', atSeconds: 70 },
    { text: 'お疲れさまでした。自然な呼吸に戻しましょう。', atSeconds: 74 },
  ];
  return { cues, totalSeconds: 76 };
}

export function buildVoiceGuide(pose: { id: string; name: string; type: 'asana' | 'pranayama' | 'dhyana'; defaultMinutes: number }): VoiceGuideSequence {
  if (pose.id === 'box-breathing') {
    return buildBoxBreathingVoiceGuide();
  }
  switch (pose.type) {
    case 'asana':
      return buildAsanaVoiceGuide(pose.id, pose.name, pose.defaultMinutes);
    case 'pranayama':
      return buildPranayamaVoiceGuide(pose.id, pose.name, pose.defaultMinutes);
    case 'dhyana':
      return buildMeditationVoiceGuide(pose.id, pose.name, pose.defaultMinutes);
    default:
      return buildAsanaVoiceGuide(pose.id, pose.name, pose.defaultMinutes);
  }
}

export const BOX_BREATHING_PHASE_CUES: Record<string, string> = {
  '吸う': '鼻から吸います。',
  '止める': '止めます。',
  '吐く': 'ゆっくり吐きます。',
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
  'voice-catcow-r1',
  'voice-catcow-r2',
  'voice-vrksasana-r1',
  'voice-vrksasana-r2',
  'voice-uttanasana-r1',
  'voice-uttanasana-r2',
  'voice-balasana-r1',
  'voice-tadasana-r1',
  'voice-tadasana-r2',
  'voice-savasana-r1',
  'voice-paschimottanasana-1',
  'voice-paschimottanasana-2',
  'voice-paschimottanasana-3',
  'voice-start-paschimottanasana',
  'voice-start-test-pose',
  'voice-test-pose-1',
  'voice-test-pose-2',
  'voice-start-thoracic',
  'voice-thoracic-1',
  'voice-thoracic-2',
  'voice-thoractic-3',
  'voice-thoracic-r1',
  'voice-thoracic-r2',
  'voice-abdominal-1',
  'voice-abdominal-2',
  'voice-abdominal-r1',
  'voice-abdominal-r2',
  'voice-box-intro',
  'voice-box-intro-2',
  'voice-box-inhale',
  'voice-box-exhale',
  'voice-box-final',
  'voice-box-end',
  'voice-start-test-breathwork',
  'voice-test-breathwork-1',
  'voice-test-breathwork-2',
  'voice-test-breathwork-r1',
  'voice-test-breathwork-r2',
  'voice-start-complete-breathing',
  'voice-complete-breathing-1',
  'voice-complete-breathing-2',
  'voice-complete-breathing-3',
  'voice-complete-breathing-4',
  'voice-complete-breathing-r1',
  'voice-complete-breathing-r2',
  'voice-susokukan-1',
  'voice-susokukan-2',
  'voice-susokukan-3',
  'voice-susokukan-4',
  'voice-susokukan-5',
  'voice-susokukan-6',
  'voice-susokukan-7',
  'voice-susokukan-8',
  'voice-susokukan-end-1',
  'voice-susokukan-end-2',
  'voice-susokukan-end-3',
  'voice-mindfulness-1',
  'voice-mindfulness-2',
  'voice-mindfulness-3',
  'voice-mindfulness-4',
  'voice-mindfulness-5',
  'voice-mindfulness-6',
  'voice-mindfulness-7',
  'voice-mindfulness-8',
  'voice-mindfulness-9',
  'voice-mindfulness-10',
  'voice-mindfulness-11',
  'voice-mindfulness-12',
  'voice-mindfulness-13',
  'voice-mindfulness-14',
  'voice-mindfulness-15',
  'voice-mindfulness-16',
  'voice-mindfulness-end-1',
  'voice-mindfulness-end-2',
  'voice-mindfulness-end-3',
  'voice-abdominal-intro-1',
  'voice-abdominal-intro-2',
  'voice-abdominal-intro-3',
  'voice-abdominal-r3',
  'voice-abdominal-end',
  'voice-thoracic-intro-1',
  'voice-thoracic-intro-2',
  'voice-thoracic-intro-3',
  'voice-thoracic-r3',
  'voice-thoracic-end',
  'voice-complete-r1',
  'voice-complete-r2',
  'voice-complete-end',
  'voice-abdominal-intro-4',
  'voice-abdominal-r4',
  'voice-abdominal-end-2',
  'voice-thoracic-intro-4',
  'voice-thoracic-r4',
  'voice-thoracic-end-2',
  'voice-complete-end-2',
];
