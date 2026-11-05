import { useState } from 'react';
import { usePracticeMedia } from './lib/usePracticeMedia';
import { createRoot } from 'react-dom/client';
import { jawRelease } from './lib/jawRelease';
import introUrl from './assets/jaw-release/intro.wav?url';
import practiceUrl from './assets/jaw-release/practice.wav?url';
import timing from './assets/jaw-release/timing.json';

const [intro, ...remaining] = jawRelease.guide.cues;
const phases = remaining.filter(cue => cue.type === 'silence');
const totalMs = jawRelease.timing.plannedSec * 1000;
function JawReleasePreview() {
  const [ready, setReady] = useState(false);
  const { status, elapsed: mediaElapsed, start, pause, resume, stop } = usePracticeMedia([
    { url: introUrl, phase: 'intro', seconds: timing.introFrames / timing.sampleRate },
    { url: practiceUrl, phase: 'practice', seconds: totalMs / 1000 },
  ]);
  const elapsed = status === 'intro' ? 0 : mediaElapsed;
  let phaseStart = 0;
  const phase = phases.find(cue => {
    const end = phaseStart + cue.durationSec! * 1000;
    if (elapsed < end) return true;
    phaseStart = end;
    return false;
  });
  const practicing = status === 'running' || status === 'paused';
  const holding = phase?.id.startsWith('hold-');
  const spokenCue = timing.segments.find(cue =>
    elapsed >= cue.start * 1000 && elapsed < (cue.start + cue.frames / timing.sampleRate) * 1000);
  const cueOffset = spokenCue ? spokenCue.start % 9 : null;
  const cueCaption = cueOffset === null ? null
    : cueOffset < 5 ? String(5 - cueOffset)
    : cueOffset === 5 ? 'ゆるめて。'
    : spokenCue!.start < 42 ? '次は' + (Math.floor(spokenCue!.start / 9) + 2) + '回目。' : 'お疲れさまでした。';
  const seconds = Math.ceil((totalMs - elapsed) / 1000);

  return <main style={{ maxWidth: 540, margin: 'auto', padding: 20, fontFamily: 'sans-serif', lineHeight: 1.65 }}>
    <p>FACE BALANCE YOGA v0.5 · 開発検品用・監修待ち</p>
    <h1>{jawRelease.content.name}</h1>
    <p>現代の運動。痛みや違和感がある場合は開始せず、途中で感じたら停止してください。</p>
    <label><input type="checkbox" checked={ready} onChange={event => setReady(event.target.checked)} disabled={status === 'intro' || practicing} /> 注意を読みました</label>
    <svg viewBox="0 0 160 120" width="160" role="img" aria-label={practicing && holding ? '上下の歯を少し離す模式図' : '顎を休める模式図'}>
      <ellipse cx="80" cy="58" rx="44" ry="49" fill="#e2f1e7" stroke="#254438" strokeWidth="3" />
      <path d="M60 45h8m24 0h8m-24 13h8" stroke="#254438" strokeWidth="3" strokeLinecap="round" />
      <path d={practicing && holding ? 'M64 76h32m-28 8h24' : 'M64 78q16 6 32 0'} fill="none" stroke="#254438" strokeWidth="3" strokeLinecap="round" />
    </svg>
    <p><output aria-label="実践残り秒数">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</output></p>
    <p role="status">{status === 'intro' ? intro.displayText : status === 'completed' ? '実践を終了しました。' : status === 'error' ? '音声を再生できませんでした。もう一度お試しください。' : practicing ? phase?.displayText : '説明のあとに45秒実践します。'}</p>
    {practicing && <p data-testid="spoken-cue" style={{ minHeight: "1.65em" }}>{cueCaption}</p>}
    {practicing && phase && <p>{phase.displayRound} / 5 回 · {Math.ceil((phaseStart + phase.durationSec! * 1000 - elapsed) / 1000)} 秒</p>}
    {(status === 'idle' || status === 'error' || status === 'completed') && <button disabled={!ready} onClick={start}>説明から開始</button>}
    {status === 'running' && <button onClick={pause}>一時停止</button>}
    {status === 'paused' && <button onClick={resume}>再開</button>}
    {(status === 'intro' || practicing) && <button onClick={stop}>停止</button>}
  </main>;
}

if (import.meta.env.DEV) createRoot(document.getElementById('root')!).render(<JawReleasePreview />);
