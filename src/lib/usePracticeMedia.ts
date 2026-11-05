import { useEffect, useRef, useState } from 'react';

export interface MediaTrack { url: string; seconds: number; phase: 'intro' | 'practice' | 'transition' }

type Status = 'idle' | 'intro' | 'running' | 'paused' | 'transition' | 'error' | 'completed';

export function usePracticeMedia(tracks: readonly MediaTrack[]) {
  const [trackIndex, setTrackIndex] = useState(0);
  const [status, setStatus] = useState<Status>('idle');
  const [elapsed, setElapsed] = useState(0);
  const generation = useRef(0);
  const playback = useRef(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  const frame = useRef(0);
  const deadline = useRef<number | undefined>(undefined);

  function releaseAudio() {
    playback.current++;
    cancelAnimationFrame(frame.current);
    clearTimeout(deadline.current);
    const track = audio.current;
    audio.current = null;
    if (track) {
      track.pause();
      track.removeAttribute('src');
      track.load();
    }
  }

  function stopWork() {
    generation.current++;
    releaseAudio();
  }

  useEffect(() => {
    const leave = () => { stopWork(); setStatus('idle'); setTrackIndex(0); setElapsed(0); };
    const hide = () => { if (document.hidden) leave(); };
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', leave);
    return () => {
      stopWork();
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', leave);
    };
  }, []);

  function play(track: HTMLAudioElement, index: number) {
    const current = generation.current;
    const active = () => generation.current === current && audio.current === track;
    const fail = () => {
      if (!active()) return;
      stopWork();
      setStatus('error');
    };
    const attempt = ++playback.current;
    clearTimeout(deadline.current);
    let lastMediaTime = track.currentTime;
    const armDeadline = () => {
      clearTimeout(deadline.current);
      deadline.current = window.setTimeout(fail, 8000);
    };
    function sync() {
      if (!active() || playback.current !== attempt || track.paused || track.ended) return;
      const mediaTime = track.currentTime;
      if (mediaTime !== lastMediaTime) {
        lastMediaTime = mediaTime;
        armDeadline();
      }
      setElapsed(Math.min(tracks[index].seconds, mediaTime) * 1000);
      frame.current = requestAnimationFrame(sync);
    }
    armDeadline();
    const phase = tracks[index].phase;
    setStatus(phase === 'practice' ? 'running' : phase);
    track.play().then(() => {
      if (active() && playback.current === attempt && !track.paused) frame.current = requestAnimationFrame(sync);
    }).catch(() => { if (playback.current === attempt) fail(); });
  }

  function openTrack(index: number) {
    const { url, seconds: expected } = tracks[index];
    const track = new Audio(url);
    const current = generation.current;
    audio.current = track;
    setTrackIndex(index);
    setElapsed(0);
    const active = () => generation.current === current && audio.current === track;

    const fail = () => {
      if (!active()) return;
      stopWork();
      setStatus('error');
    };
    track.addEventListener('error', fail);
    track.addEventListener('loadedmetadata', () => {
      if (active() && Math.abs(track.duration - expected) > 0.01) fail();
    });
    track.addEventListener('ended', () => {
      if (!active()) return;
      if (!track.ended || !Number.isFinite(track.duration) ||
          Math.abs(track.duration - expected) > 0.01 || track.currentTime < expected - 0.01) {
        fail();
        return;
      }
      releaseAudio();
      setElapsed(expected * 1000);
      if (index + 1 === tracks.length) {

        setStatus('completed');
      } else {
        openTrack(index + 1);
      }
    });
    play(track, index);
  }

  function start() {
    if (audio.current) return;
    stopWork();
    setElapsed(0);
    openTrack(0);
  }

  function pause() {
    const track = audio.current;
    if (!track || track.paused || track.ended) return;
    track.pause();
    playback.current++;
    cancelAnimationFrame(frame.current);
    clearTimeout(deadline.current);
    setElapsed(Math.min(tracks[trackIndex].seconds, track.currentTime) * 1000);
    setStatus('paused');
  }

  function resume() {
    const track = audio.current;
    if (track?.paused && !track.ended) play(track, trackIndex);
  }
  return { status, trackIndex, elapsed, start, pause, resume, stop: () => { stopWork(); setTrackIndex(0); setElapsed(0); setStatus('idle'); } };
}
