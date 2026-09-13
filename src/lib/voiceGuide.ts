export interface VoiceCue {
  text: string;
  atSeconds: number;
}

export interface VoiceGuideSequence {
  cues: VoiceCue[];
  totalSeconds: number;
}

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function isTTSAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string): void {
  if (!isTTSAvailable()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ja-JP';
  u.rate = 0.9;
  u.pitch = 1.0;
  u.volume = 1.0;
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

export function buildAsanaVoiceGuide(poseName: string, totalMinutes: number): VoiceGuideSequence {
  const totalSeconds = totalMinutes * 60;
  const cues: VoiceCue[] = [
    { text: `${poseName}を始めます。`, atSeconds: 0 },
    { text: '足裏を安定させ、自然に立ちましょう。', atSeconds: 5 },
    { text: '肩の力を抜いて、呼吸を続けます。', atSeconds: 15 },
    { text: '無理に胸を張る必要はありません。自然な姿勢で。', atSeconds: 30 },
    { text: '体の感覚に注意を向けましょう。', atSeconds: 45 },
  ];
  if (totalSeconds > 60) {
    cues.push({ text: 'ここ数呼吸、この姿勢を保ちましょう。', atSeconds: 60 });
  }
  if (totalSeconds > 90) {
    cues.push({ text: '残り時間も、ゆっくり呼吸を続けます。', atSeconds: 90 });
  }
  cues.push({ text: 'あと30秒です。自然な呼吸を続けましょう。', atSeconds: Math.max(0, totalSeconds - 30) });
  cues.push({ text: 'お疲れさまでした。次のポーズへ進みます。', atSeconds: totalSeconds });
  return { cues, totalSeconds };
}

export function buildPranayamaVoiceGuide(poseName: string, totalMinutes: number): VoiceGuideSequence {
  const totalSeconds = totalMinutes * 60;
  const cues: VoiceCue[] = [
    { text: `${poseName}を始めます。楽な姿勢になりましょう。`, atSeconds: 0 },
    { text: '鼻からゆっくり呼吸します。', atSeconds: 5 },
    { text: '呼吸のリズムを感じましょう。', atSeconds: 15 },
    { text: '肩や顎の力を抜いて。', atSeconds: 30 },
  ];
  if (totalSeconds > 60) {
    cues.push({ text: 'このリズムを保ちましょう。', atSeconds: 60 });
  }
  cues.push({ text: 'あと30秒です。自然な呼吸に戻しましょう。', atSeconds: Math.max(0, totalSeconds - 30) });
  cues.push({ text: 'お疲れさまでした。次へ進みます。', atSeconds: totalSeconds });
  return { cues, totalSeconds };
}

export function buildMeditationVoiceGuide(poseName: string, totalMinutes: number): VoiceGuideSequence {
  const totalSeconds = totalMinutes * 60;
  const cues: VoiceCue[] = [
    { text: `${poseName}を始めます。`, atSeconds: 0 },
    { text: '楽な姿勢をとります。目を閉じても構いません。', atSeconds: 3 },
    { text: '呼吸に注意を向けましょう。', atSeconds: 10 },
    { text: '呼吸がそれたら、やさしく戻しましょう。', atSeconds: 25 },
  { text: '今この瞬間にいましょう。', atSeconds: 45 },
  ];
  if (totalSeconds > 60) {
    cues.push({ text: '体の感覚を感じましょう。', atSeconds: 60 });
  }
  cues.push({ text: 'ゆっくり意識を戻しましょう。', atSeconds: Math.max(0, totalSeconds - 15) });
  cues.push({ text: 'お疲れさまでした。', atSeconds: totalSeconds });
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
      return buildAsanaVoiceGuide(pose.name, pose.defaultMinutes);
    case 'pranayama':
      return buildPranayamaVoiceGuide(pose.name, pose.defaultMinutes);
    case 'dhyana':
      return buildMeditationVoiceGuide(pose.name, pose.defaultMinutes);
    default:
      return buildAsanaVoiceGuide(pose.name, pose.defaultMinutes);
  }
}
