import { useEffect, useRef, useState, useCallback } from 'react';
import { getMeditationEntry } from '../lib/meditationCatalog';
import { buildMeditationCues, getMeditationAudioKeys } from '../lib/meditationCueBuilder';
import { createPracticeAudioRuntime, type RuntimeEvent } from '../lib/practiceAudioRuntime';
import { unlockAudioContext, preloadVoiceKeys } from '../lib/voiceGuide';

const SUSOKUKAN_TOTAL_SEC = 300;

export function SusokukanExperience() {
  const entry = getMeditationEntry('susokukan-5min')!;
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'completed' | 'error'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [subtitle, setSubtitle] = useState('');
  const runtimeRef = useRef<ReturnType<typeof createPracticeAudioRuntime> | null>(null);
  const startTimestampRef = useRef<number>(0);
  const pauseAccumRef = useRef<number>(0);
  const pausedAtRef = useRef<number | null>(null);

  const handleEvent = useCallback((event: RuntimeEvent) => {
    if (event.type === 'subtitle') {
      setSubtitle(event.subtitle ?? '');
    } else if (event.type === 'complete') {
      setStatus('completed');
      setSubtitle('');
    } else if (event.type === 'stateChange' && event.state === 'completed') {
      setStatus('completed');
    }
  }, []);

  const start = useCallback(() => {
    unlockAudioContext();
    preloadVoiceKeys(getMeditationAudioKeys(entry));
    runtimeRef.current?.dispose();
    setStatus('running');
    setElapsed(0);
    setSubtitle('');
    startTimestampRef.current = Date.now();
    pauseAccumRef.current = 0;
    pausedAtRef.current = null;

    const runtime = createPracticeAudioRuntime();
    runtime.setSource('practice_audio_runtime');
    runtime.addListener(handleEvent);
    runtimeRef.current = runtime;
    runtime.start({ practiceId: entry.id, cues: buildMeditationCues(entry) });
  }, [entry, handleEvent]);

  const pause = useCallback(() => {
    setStatus('paused');
    pausedAtRef.current = Date.now();
    runtimeRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    if (pausedAtRef.current !== null) {
      pauseAccumRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
    setStatus('running');
    runtimeRef.current?.resume();
  }, []);

  const stop = useCallback(() => {
    runtimeRef.current?.dispose();
    runtimeRef.current = null;
    setStatus('idle');
    setElapsed(0);
    setSubtitle('');
    startTimestampRef.current = 0;
    pauseAccumRef.current = 0;
    pausedAtRef.current = null;
  }, []);

  useEffect(() => {
    if (status !== 'running' && status !== 'paused') return;
    const timer = window.setInterval(() => {
      if (startTimestampRef.current === 0) return;
      const now = Date.now();
      const pauseOffset = pauseAccumRef.current + (pausedAtRef.current !== null ? now - pausedAtRef.current : 0);
      const sec = Math.floor((now - startTimestampRef.current - pauseOffset) / 1000);
      setElapsed(sec);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => {
    return () => {
      runtimeRef.current?.dispose();
      runtimeRef.current = null;
    };
  }, []);

  const active = status === 'running' || status === 'paused';
  const remaining = status === 'completed' ? 0 : Math.max(0, SUSOKUKAN_TOTAL_SEC - elapsed);
  const label = status === 'idle' ? '準備ができたら開始してください'
    : status === 'paused' ? '一時停止中'
    : status === 'completed' ? 'お疲れさまでした'
    : status === 'error' ? '音声を再生できませんでした。通信と音量を確認して、もう一度お試しください。'
    : elapsed >= 60 && status === 'running' ? '静寂' : 'ガイド中';

  return (
    <div className="meditation-experience">
      <div className="meditation-display">
        <div className={`meditation-visual ${elapsed >= 60 ? 'is-silent' : ''} ${status === 'running' ? 'is-active' : ''} ${status === 'completed' ? 'is-done' : ''}`}>
          {status === 'completed' ? <div className="meditation-complete-mark"><span>完了</span></div> : <div className="meditation-breath-circle" />}
        </div>
        <div className="meditation-info">
          <strong className="meditation-name">数息観</strong>
          <span className="meditation-timer">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</span>
          <span className="meditation-state" role={status === 'error' ? 'alert' : undefined}>{label}</span>
        </div>
      </div>
      {active && <div className="meditation-subtitle" aria-live="polite">{subtitle}</div>}
      <div className="meditation-controls">
        {!active && <button className="primary-button meditation-start-btn" onClick={start}>{status === 'idle' ? '瞑想を始める' : 'もう一度'}</button>}
        {status === 'running' && <button className="secondary-button" onClick={pause}>一時停止</button>}
        {status === 'paused' && <button className="primary-button" onClick={resume}>再開する</button>}
        {active && <button className="ghost-button" onClick={stop}>中止する</button>}
      </div>
      <div className="meditation-description"><p>最初の1分で数息観の説明を聞き、その後4分は静寂の中で呼吸を数えます。</p><span className="meditation-tradition">禅Yoga</span></div>
    </div>
  );
}
