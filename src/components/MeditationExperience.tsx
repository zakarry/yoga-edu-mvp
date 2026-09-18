import { useEffect, useRef, useState, useCallback } from 'react';
import type { MeditationCatalogEntry } from '../lib/meditationCatalog';
import { buildMeditationCues, getMeditationAudioKeys } from '../lib/meditationCueBuilder';
import { createPracticeAudioRuntime, type RuntimeEvent } from '../lib/practiceAudioRuntime';
import { unlockAudioContext, preloadVoiceKeys } from '../lib/voiceGuide';
import { SusokukanExperience } from './SusokukanExperience';

interface MeditationExperienceProps {
  entry: MeditationCatalogEntry;
}

export function MeditationExperience({ entry }: MeditationExperienceProps) {
  if (entry.id === 'susokukan-5min') return <SusokukanExperience />;
  return <UnifiedMeditationExperience entry={entry} />;
}

function UnifiedMeditationExperience({ entry }: MeditationExperienceProps) {
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'completed'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [subtitle, setSubtitle] = useState('');
  const [inSilence, setInSilence] = useState(false);

  const runtimeRef = useRef<ReturnType<typeof createPracticeAudioRuntime> | null>(null);
  const startTimestampRef = useRef<number>(0);
  const pauseAccumRef = useRef<number>(0);
  const pausedAtRef = useRef<number | null>(null);
  const cueIndexRef = useRef(0);
  const cuesRef = useRef<ReturnType<typeof buildMeditationCues>>([]);

  const totalSec = entry.durationSec;

  const handleEvent = useCallback((event: RuntimeEvent) => {
    if (event.type === 'subtitle') {
      setSubtitle(event.subtitle ?? '');
      const cue = cuesRef.current[event.cueIndex ?? -1];
      setInSilence(cue?.type === 'silence');
    } else if (event.type === 'cueStart') {
      const cue = cuesRef.current[event.cueIndex ?? -1];
      setInSilence(cue?.type === 'silence');
      cueIndexRef.current = event.cueIndex ?? 0;
    } else if (event.type === 'complete') {
      setStatus('completed');
      setInSilence(false);
    } else if (event.type === 'stateChange' && event.state === 'completed') {
      setStatus('completed');
    }
  }, []);

  const start = useCallback(() => {
    unlockAudioContext();
    preloadVoiceKeys(getMeditationAudioKeys(entry));
    runtimeRef.current?.dispose();
    const cues = buildMeditationCues(entry);
    cuesRef.current = cues;
    setStatus('running');
    setElapsed(0);
    setSubtitle('');
    setInSilence(false);
    cueIndexRef.current = 0;
    startTimestampRef.current = Date.now();
    pauseAccumRef.current = 0;
    pausedAtRef.current = null;

    const runtime = createPracticeAudioRuntime();
    runtime.setSource('practice_audio_runtime');
    runtime.addListener(handleEvent);
    runtimeRef.current = runtime;
    runtime.start({ practiceId: entry.id, cues });
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
    setInSilence(false);
    cueIndexRef.current = 0;
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
  }, [status, totalSec]);

  useEffect(() => {
    return () => {
      runtimeRef.current?.dispose();
      runtimeRef.current = null;
    };
  }, []);

  const isNidra = entry.category === 'yoga_nidra';
  const approxLabel = isNidra
    ? entry.durationSec >= 600 ? '約10分' : '約3分30秒'
    : `${Math.floor(totalSec / 60)}:${(totalSec % 60).toString().padStart(2, '0')}`;
  const remainingSec = status === 'completed' ? 0 : Math.max(0, totalSec - elapsed);
  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const displayTime = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className="meditation-experience">
      <div className="meditation-display">
        <div className={`meditation-visual ${inSilence ? 'is-silent' : ''} ${status === 'running' ? 'is-active' : ''} ${status === 'completed' ? 'is-done' : ''}`}>
          {status === 'completed' ? (
            <div className="meditation-complete-mark">
              <span>完了</span>
            </div>
          ) : (
            <div className="meditation-breath-circle" />
          )}
        </div>

        <div className="meditation-info">
          <strong className="meditation-name">{entry.nameJa}</strong>
          <span className="meditation-timer">{status === 'running' || status === 'completed' ? displayTime : approxLabel}</span>
          <span className="meditation-state">
            {status === 'completed'
              ? 'お疲れさまでした'
              : status === 'idle'
                ? '準備ができたら開始してください'
                : status === 'paused'
                  ? '一時停止中'
                  : inSilence
                    ? '静寂'
                    : subtitle
                      ? 'ガイド中'
                      : '実践中'}
          </span>
        </div>
      </div>

      {status === 'running' && subtitle && (
        <div className="meditation-subtitle" aria-live="polite">
          {subtitle}
        </div>
      )}

      <div className="meditation-controls">
        {status === 'idle' && (
          <button className="primary-button meditation-start-btn" onClick={start}>
            瞑想を始める
          </button>
        )}
        {status === 'running' && (
          <button className="secondary-button" onClick={pause}>
            一時停止
          </button>
        )}
        {status === 'paused' && (
          <button className="primary-button" onClick={resume}>
            再開する
          </button>
        )}
        {(status === 'running' || status === 'paused') && (
          <button className="ghost-button" onClick={stop}>
            中止する
          </button>
        )}
        {status === 'completed' && (
          <button className="primary-button" onClick={start}>
            もう一度
          </button>
        )}
      </div>

      <div className="meditation-description">
        <p>{entry.description}</p>
        {entry.tradition && <span className="meditation-tradition">{entry.tradition}</span>}
      </div>
    </div>
  );
}
