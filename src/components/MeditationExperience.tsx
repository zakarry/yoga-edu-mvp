import { useEffect, useRef, useState, useCallback } from 'react';
import type { MeditationCatalogEntry, MeditationTimelineEvent } from '../lib/meditationCatalog';
import { getVoiceGuideEngine } from '../lib/voiceGuide';
import { SusokukanExperience } from './SusokukanExperience';

interface MeditationExperienceProps {
  entry: MeditationCatalogEntry;
}

export function MeditationExperience({ entry }: MeditationExperienceProps) {
  if (entry.id === 'susokukan-5min') return <SusokukanExperience />;
  if (entry.category === 'yoga_nidra') return <SequentialNidraExperience entry={entry} />;
  return <TimelineMeditationExperience entry={entry} />;
}

function SequentialNidraExperience({ entry }: { entry: MeditationCatalogEntry }) {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [inSilence, setInSilence] = useState(false);

  const cueIndexRef = useRef(0);
  const startTimestampRef = useRef<number>(0);
  const pausedAtRef = useRef<number | null>(null);
  const pauseAccumRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const isAdvancingRef = useRef(false);
  const voiceEngine = getVoiceGuideEngine();

  const sortedTimeline = [...entry.timeline].sort((a, b) => a.atSec - b.atSec);
  const totalSec = entry.durationSec;

  const getElapsed = useCallback(() => {
    if (startTimestampRef.current === 0) return 0;
    const now = Date.now();
    const pauseOffset = pauseAccumRef.current + (pausedAtRef.current !== null ? now - pausedAtRef.current : 0);
    return (now - startTimestampRef.current - pauseOffset) / 1000;
  }, []);

  const advance = useCallback(() => {
    if (isAdvancingRef.current) return;
    isAdvancingRef.current = true;

    const idx = cueIndexRef.current;
    if (idx >= sortedTimeline.length) {
      isAdvancingRef.current = false;
      return;
    }

    const event = sortedTimeline[idx];

    if (event.type === 'complete') {
      setCurrentSubtitle(event.text ?? '');
      setInSilence(false);
      setIsRunning(false);
      setIsCompleted(true);
      voiceEngine.setOnCueEnd(null);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      cueIndexRef.current = idx + 1;
      isAdvancingRef.current = false;
      return;
    }

    if (event.type === 'silence') {
      setCurrentSubtitle(event.text ?? '静寂');
      setInSilence(true);
      voiceEngine.setOnCueEnd(null);
      cueIndexRef.current = idx + 1;
      isAdvancingRef.current = false;

      const dur = event.durationSec ?? 30;
      silenceTimerRef.current = window.setTimeout(() => {
        silenceTimerRef.current = null;
        advance();
      }, dur * 1000);
      return;
    }

    if (event.type === 'voice') {
      const displayText = event.text ?? '';
      const speakText = event.audioText ?? event.text ?? '';
      setCurrentSubtitle(displayText);
      setInSilence(false);
      cueIndexRef.current = idx + 1;
      isAdvancingRef.current = false;

      voiceEngine.setOnCueEnd(() => {
        advance();
      });

      if (event.audioKey) {
        voiceEngine.speakByKey(event.audioKey, speakText);
      } else {
        voiceEngine.speak(speakText);
      }
      return;
    }

    cueIndexRef.current = idx + 1;
    isAdvancingRef.current = false;
    advance();
  }, [sortedTimeline, voiceEngine]);

  const updateTimer = useCallback(() => {
    setElapsedSec(Math.floor(getElapsed()));
  }, [getElapsed]);

  const start = useCallback(() => {
    voiceEngine.stop();
    voiceEngine.setOnCueEnd(null);
    if (silenceTimerRef.current !== null) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    cueIndexRef.current = 0;
    isAdvancingRef.current = false;
    startTimestampRef.current = Date.now();
    pauseAccumRef.current = 0;
    pausedAtRef.current = null;
    setIsRunning(true);
    setIsPaused(false);
    setIsCompleted(false);
    setElapsedSec(0);
    setInSilence(false);
    setCurrentSubtitle('');

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    const loop = () => {
      updateTimer();
      if (rafRef.current !== null) {
        rafRef.current = requestAnimationFrame(loop);
      }
    };
    rafRef.current = requestAnimationFrame(loop);

    advance();
  }, [voiceEngine, advance, updateTimer]);

  const pause = useCallback(() => {
    setIsPaused(true);
    pausedAtRef.current = Date.now();
    voiceEngine.pause();
    if (silenceTimerRef.current !== null) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, [voiceEngine]);

  const resume = useCallback(() => {
    if (pausedAtRef.current !== null) {
      pauseAccumRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
    setIsPaused(false);
    voiceEngine.resume();

    const idx = cueIndexRef.current - 1;
    if (idx >= 0 && idx < sortedTimeline.length) {
      const prevEvent = sortedTimeline[idx];
      if (prevEvent.type === 'silence' && silenceTimerRef.current === null) {
        const remaining = Math.max(1, (prevEvent.durationSec ?? 30) - 1);
        silenceTimerRef.current = window.setTimeout(() => {
          silenceTimerRef.current = null;
          advance();
        }, remaining * 1000);
      }
    }
  }, [voiceEngine, sortedTimeline, advance]);

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (silenceTimerRef.current !== null) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    voiceEngine.setOnCueEnd(null);
    voiceEngine.stop();
    setIsRunning(false);
    setIsPaused(false);
    setIsCompleted(false);
    setElapsedSec(0);
    setCurrentSubtitle('');
    setInSilence(false);
    cueIndexRef.current = 0;
    isAdvancingRef.current = false;
    startTimestampRef.current = 0;
    pauseAccumRef.current = 0;
    pausedAtRef.current = null;
  }, [voiceEngine]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (silenceTimerRef.current !== null) {
        window.clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      voiceEngine.setOnCueEnd(null);
      voiceEngine.stop();
    };
  }, [voiceEngine]);

  const mins = Math.floor(elapsedSec / 60);
  const secs = elapsedSec % 60;
  const displayTime = `${mins}:${secs.toString().padStart(2, '0')}`;
  const isNidra = entry.category === 'yoga_nidra';
  const approxLabel = isNidra
    ? entry.durationSec >= 600 ? '約10分' : '約3分30秒'
    : `${Math.floor(totalSec / 60)}:${(totalSec % 60).toString().padStart(2, '0')}`;

  return (
    <div className="meditation-experience">
      <div className="meditation-display">
        <div className={`meditation-visual ${inSilence ? 'is-silent' : ''} ${isRunning && !isPaused ? 'is-active' : ''} ${isCompleted ? 'is-done' : ''}`}>
          {isCompleted ? (
            <div className="meditation-complete-mark">
              <span>完了</span>
            </div>
          ) : (
            <div className="meditation-breath-circle" />
          )}
        </div>

        <div className="meditation-info">
          <strong className="meditation-name">{entry.nameJa}</strong>
          <span className="meditation-timer">{isRunning || isCompleted ? displayTime : approxLabel}</span>
          <span className="meditation-state">
            {isCompleted
              ? 'お疲れさまでした'
              : !isRunning
                ? '準備ができたら開始してください'
                : isPaused
                  ? '一時停止中'
                  : inSilence
                    ? '静寂'
                    : currentSubtitle
                      ? 'ガイド中'
                      : '実践中'}
          </span>
        </div>
      </div>

      {isRunning && currentSubtitle && (
        <div className="meditation-subtitle" aria-live="polite">
          {currentSubtitle}
        </div>
      )}

      <div className="meditation-controls">
        {!isRunning && !isCompleted && (
          <button className="primary-button meditation-start-btn" onClick={start}>
            瞑想を始める
          </button>
        )}
        {isRunning && !isPaused && (
          <button className="secondary-button" onClick={pause}>
            一時停止
          </button>
        )}
        {isRunning && isPaused && (
          <button className="primary-button" onClick={resume}>
            再開する
          </button>
        )}
        {isRunning && (
          <button className="ghost-button" onClick={stop}>
            中止する
          </button>
        )}
        {isCompleted && (
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

function TimelineMeditationExperience({ entry }: MeditationExperienceProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [inSilence, setInSilence] = useState(false);

  const startTimestampRef = useRef<number>(0);
  const pausedAtRef = useRef<number | null>(null);
  const pauseAccumRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const firedEventsRef = useRef<Set<number>>(new Set());
  const voiceEngine = getVoiceGuideEngine();

  const totalSec = entry.durationSec;

  const getElapsed = useCallback(() => {
    if (startTimestampRef.current === 0) return 0;
    const now = Date.now();
    const pauseOffset = pauseAccumRef.current + (pausedAtRef.current !== null ? now - pausedAtRef.current : 0);
    return Math.min(totalSec, (now - startTimestampRef.current - pauseOffset) / 1000);
  }, [totalSec]);

  const fireEvent = useCallback(
    (event: MeditationTimelineEvent) => {
      if (event.type === 'voice') {
        if (event.text) {
          const speakText = event.audioText ?? event.text;
          if (event.audioKey) {
            voiceEngine.speakByKey(event.audioKey, speakText);
          } else {
            voiceEngine.speak(speakText);
          }
          setCurrentSubtitle(event.text);
        }
        setInSilence(false);
      } else if (event.type === 'silence') {
        if (event.text) {
          setCurrentSubtitle(event.text);
        } else {
          setCurrentSubtitle('静寂');
        }
        setInSilence(true);
      } else if (event.type === 'complete') {
        if (event.text) {
          setCurrentSubtitle(event.text);
        }
        setInSilence(false);
      }
    },
    [voiceEngine],
  );

  const checkTimeline = useCallback(() => {
    const elapsed = getElapsed();
    setElapsedSec(Math.floor(elapsed));

    const sortedTimeline = [...entry.timeline].sort((a, b) => a.atSec - b.atSec);

    for (let i = 0; i < sortedTimeline.length; i++) {
      if (firedEventsRef.current.has(i)) continue;
      const event = sortedTimeline[i];
      if (elapsed >= event.atSec) {
        firedEventsRef.current.add(i);
        fireEvent(event);

        if (event.type === 'complete') {
          setIsRunning(false);
          setIsCompleted(true);
          if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
          return;
        }
      }
    }

    if (elapsed >= totalSec && !firedEventsRef.current.has(sortedTimeline.length - 1)) {
      const lastEvent = sortedTimeline[sortedTimeline.length - 1];
      if (lastEvent.type === 'complete') {
        firedEventsRef.current.add(sortedTimeline.length - 1);
        fireEvent(lastEvent);
        setIsRunning(false);
        setIsCompleted(true);
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      }
    }
  }, [entry.timeline, totalSec, getElapsed, fireEvent]);

  const start = useCallback(() => {
    voiceEngine.stop();
    firedEventsRef.current = new Set();
    startTimestampRef.current = Date.now();
    pauseAccumRef.current = 0;
    pausedAtRef.current = null;
    setIsRunning(true);
    setIsPaused(false);
    setIsCompleted(false);
    setElapsedSec(0);
    setInSilence(false);
    setCurrentSubtitle('');

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    const loop = () => {
      checkTimeline();
      if (rafRef.current !== null) {
        rafRef.current = requestAnimationFrame(loop);
      }
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [checkTimeline, voiceEngine]);

  const pause = useCallback(() => {
    setIsPaused(true);
    pausedAtRef.current = Date.now();
    voiceEngine.pause();
  }, [voiceEngine]);

  const resume = useCallback(() => {
    if (pausedAtRef.current !== null) {
      pauseAccumRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
    setIsPaused(false);
    voiceEngine.resume();
  }, [voiceEngine]);

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    voiceEngine.stop();
    setIsRunning(false);
    setIsPaused(false);
    setIsCompleted(false);
    setElapsedSec(0);
    setCurrentSubtitle('');
    setInSilence(false);
    firedEventsRef.current = new Set();
    startTimestampRef.current = 0;
    pauseAccumRef.current = 0;
    pausedAtRef.current = null;
  }, [voiceEngine]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      voiceEngine.stop();
    };
  }, [voiceEngine]);

  const remainingSec = Math.max(0, totalSec - elapsedSec);
  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const displayTime = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className="meditation-experience">
      <div className="meditation-display">
        <div className={`meditation-visual ${inSilence ? 'is-silent' : ''} ${isRunning && !isPaused ? 'is-active' : ''} ${isCompleted ? 'is-done' : ''}`}>
          {isCompleted ? (
            <div className="meditation-complete-mark">
              <span>完了</span>
            </div>
          ) : (
            <div className="meditation-breath-circle" />
          )}
        </div>

        <div className="meditation-info">
          <strong className="meditation-name">{entry.nameJa}</strong>
          <span className="meditation-timer">{isRunning || isCompleted ? displayTime : `${Math.floor(totalSec / 60)}:${(totalSec % 60).toString().padStart(2, '0')}`}</span>
          <span className="meditation-state">
            {isCompleted
              ? 'お疲れさまでした'
              : !isRunning
                ? '準備ができたら開始してください'
                : isPaused
                  ? '一時停止中'
                  : inSilence
                    ? '静寂'
                    : currentSubtitle
                      ? 'ガイド中'
                      : '実践中'}
          </span>
        </div>
      </div>

      {isRunning && currentSubtitle && (
        <div className="meditation-subtitle" aria-live="polite">
          {currentSubtitle}
        </div>
      )}

      <div className="meditation-controls">
        {!isRunning && !isCompleted && (
          <button className="primary-button meditation-start-btn" onClick={start}>
            瞑想を始める
          </button>
        )}
        {isRunning && !isPaused && (
          <button className="secondary-button" onClick={pause}>
            一時停止
          </button>
        )}
        {isRunning && isPaused && (
          <button className="primary-button" onClick={resume}>
            再開する
          </button>
        )}
        {isRunning && (
          <button className="ghost-button" onClick={stop}>
            中止する
          </button>
        )}
        {isCompleted && (
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
