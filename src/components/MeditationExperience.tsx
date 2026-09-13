import { useEffect, useRef, useState, useCallback } from 'react';
import type { MeditationCatalogEntry, MeditationTimelineEvent } from '../lib/meditationCatalog';
import { getVoiceGuideEngine } from '../lib/voiceGuide';

interface MeditationExperienceProps {
  entry: MeditationCatalogEntry;
}

interface ActiveEvent {
  event: MeditationTimelineEvent;
  subtitle: string;
}

export function MeditationExperience({ entry }: MeditationExperienceProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [inSilence, setInSilence] = useState(false);

  const timersRef = useRef<number[]>([]);
  const intervalRef = useRef<number | null>(null);
  const firedEventsRef = useRef<Set<number>>(new Set());
  const voiceEngine = getVoiceGuideEngine();

  const totalSec = entry.durationSec;
  const remainingSec = Math.max(0, totalSec - elapsedSec);
  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const fireEvent = useCallback(
    (event: MeditationTimelineEvent) => {
      if (event.type === 'voice') {
        if (event.text) {
          voiceEngine.speak(event.text);
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

  const start = useCallback(() => {
    clearTimers();
    firedEventsRef.current = new Set();
    setIsRunning(true);
    setIsPaused(false);
    setIsCompleted(false);
    setElapsedSec(0);
    setInSilence(false);

    const sortedTimeline = [...entry.timeline].sort((a, b) => a.atSec - b.atSec);

    sortedTimeline.forEach((event, idx) => {
      if (event.type === 'subtitle') {
        const t = window.setTimeout(() => {
          if (!firedEventsRef.current.has(idx)) {
            firedEventsRef.current.add(idx);
            setCurrentSubtitle(event.text ?? '');
          }
        }, event.atSec * 1000);
        timersRef.current.push(t);
        return;
      }

      const t = window.setTimeout(() => {
        if (firedEventsRef.current.has(idx)) return;
        firedEventsRef.current.add(idx);
        fireEvent(event);

        if (event.type === 'complete') {
          setIsRunning(false);
          setIsCompleted(true);
          if (intervalRef.current !== null) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      }, event.atSec * 1000);
      timersRef.current.push(t);
    });

    intervalRef.current = window.setInterval(() => {
      setElapsedSec((prev) => {
        const next = prev + 1;
        if (next >= totalSec) {
          return totalSec;
        }
        return next;
      });
    }, 1000);
  }, [entry.timeline, totalSec, clearTimers, fireEvent]);

  const pause = useCallback(() => {
    setIsPaused(true);
    voiceEngine.pause();
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [voiceEngine]);

  const resume = useCallback(() => {
    setIsPaused(false);
    voiceEngine.resume();
    if (intervalRef.current === null) {
      intervalRef.current = window.setInterval(() => {
        setElapsedSec((prev) => {
          const next = prev + 1;
          if (next >= totalSec) {
            return totalSec;
          }
          return next;
        });
      }, 1000);
    }
  }, [voiceEngine]);

  const stop = useCallback(() => {
    clearTimers();
    voiceEngine.stop();
    setIsRunning(false);
    setIsPaused(false);
    setIsCompleted(false);
    setElapsedSec(0);
    setCurrentSubtitle('');
    setInSilence(false);
  }, [clearTimers, voiceEngine]);

  useEffect(() => {
    return () => {
      clearTimers();
      voiceEngine.stop();
    };
  }, [clearTimers, voiceEngine]);

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
          <span className="meditation-timer">{isRunning || isCompleted ? displayTime : '5:00'}</span>
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
