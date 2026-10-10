import { useEffect, useRef, useState } from 'react';
import { SusokukanSession, type SusokukanState, SUSOKUKAN_INTRO_SEC, SUSOKUKAN_TOTAL_SEC } from '../lib/susokukanSession';

export function SusokukanExperience() {
  const [state, setState] = useState<SusokukanState>({ status: 'idle', elapsed: 0, subtitle: '' });
  const session = useRef<SusokukanSession | null>(null);
  useEffect(() => {
    const player = new SusokukanSession(setState);
    session.current = player;
    return () => { player.dispose(); session.current = null; };
  }, []);
  const active = ['playing', 'loading', 'paused'].includes(state.status);
  const silent = active && state.elapsed >= SUSOKUKAN_INTRO_SEC;
  const remaining = Math.max(0, SUSOKUKAN_TOTAL_SEC - Math.floor(state.elapsed));
  const label = state.status === 'idle' ? '準備ができたら開始してください'
    : state.status === 'loading' ? '音声を読み込み中'
    : state.status === 'paused' ? '一時停止中'
    : state.status === 'completed' ? 'お疲れさまでした'
    : state.status === 'error' ? '音声を再生できませんでした。通信と音量を確認して、もう一度お試しください。'
    : silent ? '静寂' : 'ガイド中';
  return (
    <div className="meditation-experience">
      <div className="meditation-display">
        <div className={`meditation-visual ${silent ? 'is-silent' : ''} ${state.status === 'playing' ? 'is-active' : ''} ${state.status === 'completed' ? 'is-done' : ''}`}>
          {state.status === 'completed' ? <div className="meditation-complete-mark"><span>完了</span></div> : <div className="meditation-breath-circle" />}
        </div>
        <div className="meditation-info">
          <strong className="meditation-name">数息観</strong>
          <span className="meditation-timer">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</span>
          <span className="meditation-state" role={state.status === 'error' ? 'alert' : undefined}>{label}</span>
        </div>
      </div>
      {active && <div className="meditation-subtitle" aria-live="polite">{state.subtitle}</div>}
      <div className="meditation-controls">
        {!active && <button className="primary-button meditation-start-btn" onClick={() => session.current?.start()}>{state.status === 'idle' ? '瞑想を始める' : 'もう一度'}</button>}
        {(state.status === 'playing' || state.status === 'loading') && <button className="secondary-button" onClick={() => session.current?.pause()}>一時停止</button>}
        {state.status === 'paused' && <button className="primary-button" onClick={() => session.current?.resume()}>再開する</button>}
        {active && <button className="ghost-button" onClick={() => session.current?.stop()}>中止する</button>}
      </div>
      <div className="meditation-description"><p>最初の1分で数息観の説明を聞き、その後4分は静寂の中で呼吸を数えます。</p><span className="meditation-tradition">禅Yoga</span></div>
    </div>
  );
}
