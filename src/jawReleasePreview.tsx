import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { jawRelease } from './lib/jawRelease';

const [intro, ...remaining] = jawRelease.guide.cues;
const phases = remaining.filter(cue => cue.type === 'silence');
const totalMs = jawRelease.timing.plannedSec * 1000;
type Status = 'idle' | 'intro' | 'running' | 'paused' | 'error' | 'completed';

function JawReleasePreview() {
  const [status, setStatus] = useState<Status>('idle');
  const [ready, setReady] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const generation = useRef(0);
  const audio = useRef<SpeechSynthesisUtterance | null>(null);
  const deadline = useRef<number | undefined>(undefined);
  const frame = useRef(0);
  const startTime = useRef(0);
  const progress = useRef(0);

  function stopWork() {
    generation.current++;
    cancelAnimationFrame(frame.current);
    clearTimeout(deadline.current);
    if (audio.current) {
      audio.current.onend = null;
      audio.current.onerror = null;
      audio.current = null;
      window.speechSynthesis.cancel();
    }
  }

  useEffect(() => {
    const hide = () => { if (document.hidden) { stopWork(); setStatus('idle'); setElapsed(0); } };
    const leave = () => { stopWork(); setStatus('idle'); setElapsed(0); };
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', leave);
    return () => {
      stopWork();
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', leave);
    };
  }, []);

  function run() {
    const current = generation.current;
    startTime.current = performance.now() - progress.current;
    setStatus('running');
    function tick(now: number) {
      if (current !== generation.current) return;
      progress.current = Math.min(totalMs, now - startTime.current);
      setElapsed(progress.current);
      if (progress.current === totalMs) setStatus('completed');
      else frame.current = requestAnimationFrame(tick);
    }
    frame.current = requestAnimationFrame(tick);
  }

  function start() {
    if (!ready || audio.current) return;
    stopWork();
    progress.current = 0;
    setElapsed(0);
    const current = generation.current;
    const fail = () => {
      if (generation.current !== current) return;
      stopWork();
      setStatus('error');
    };
    try {
      const synth = window.speechSynthesis;
      const voice = synth.getVoices().find(candidate => candidate.localService && /^ja(?:-|$)/i.test(candidate.lang));
      if (!voice) { fail(); return; }
      const utterance = new SpeechSynthesisUtterance(intro.speechText);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      let started = false;
      utterance.onstart = () => { started = true; };
      utterance.onend = () => {
        if (generation.current !== current || audio.current !== utterance) return;
        if (!started) { fail(); return; }
        clearTimeout(deadline.current);
        audio.current = null;
        run();
      };
      utterance.onerror = fail;
      audio.current = utterance;
      setStatus('intro');
      deadline.current = window.setTimeout(fail, 45000);
      synth.speak(utterance);
    } catch {
      fail();
    }
  }

  let phaseStart = 0;
  const phase = phases.find(cue => {
    const end = phaseStart + cue.durationSec! * 1000;
    if (elapsed < end) return true;
    phaseStart = end;
    return false;
  });
  const practicing = status === 'running' || status === 'paused';
  const holding = phase?.id.startsWith('hold-');
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
    <p role="status">{status === 'intro' ? intro.displayText : status === 'completed' ? '実践を終了しました。' : status === 'error' ? '音声を再生できませんでした。端末の日本語音声を確認して、もう一度お試しください。' : practicing ? phase?.displayText : '説明のあとに45秒実践します。'}</p>
    {practicing && phase && <p>{phase.displayRound} / 5 回 · {Math.ceil((phaseStart + phase.durationSec! * 1000 - elapsed) / 1000)} 秒</p>}
    {(status === 'idle' || status === 'error' || status === 'completed') && <button disabled={!ready} onClick={start}>説明から開始</button>}
    {status === 'running' && <button onClick={() => { stopWork(); setStatus('paused'); }}>一時停止</button>}
    {status === 'paused' && <button onClick={run}>再開</button>}
    {(status === 'intro' || practicing) && <button onClick={() => { stopWork(); setElapsed(0); setStatus('idle'); }}>停止</button>}
  </main>;
}

if (import.meta.env.DEV) createRoot(document.getElementById('root')!).render(<JawReleasePreview />);
