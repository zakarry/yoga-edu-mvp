import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { usePracticeMedia } from './lib/usePracticeMedia';
import timing from './assets/face-balance/timing.json';
import jawTiming from './assets/jaw-release/timing.json';

type Key = keyof typeof timing;
const audio = import.meta.glob<string>('./assets/face-balance/*.wav', { eager: true, query: '?url', import: 'default' });
const keys = Object.keys(timing) as Key[];
const courses = [
  { name: '3分・本番前の笑顔準備', order: ['jaw', 'lip', 'smile'] },
  { name: '3分・朝の表情スイッチ', order: ['kapola', 'simhasana', 'tongue'] },
  { name: '短時間・夜のほぐし', order: ['jaw', 'griva', 'relax'] },
  { name: '5分・提案／監修待ち', order: ['jaw', 'kapola', 'tongue', 'smile', 'relax'] },
  { name: '8分・フル', order: ['jaw', ...keys] },
] as const;

const visualPaths: Record<string, string> = {
  rest: 'M60 79q20 5 40 0',
  cheeks: 'M51 66a8 7 0 1 0 0 14a8 7 0 1 0 0-14 M109 66a8 7 0 1 0 0 14a8 7 0 1 0 0-14',
  lion: 'M65 75q15-7 30 0',
  'tongue-front': 'M64 75h32m-23 0v13q7 9 14 0V75',
  'tongue-right': 'M63 76h34m-20 0q-9 16-18 6',
  'tongue-left': 'M63 76h34m-14 0q9 16 18 6',
  o: 'M80 70a8 9 0 1 0 0 18a8 9 0 1 0 0-18',
  smile: 'M58 73q22 22 44 0',
  'neck-right': 'M94 86H54m0 0l10-9m-10 9l10 9',
  'neck-left': 'M66 86h40m0 0l-10-9m10 9l-10 9',
  'neck-down': 'M80 75v24m0 0l-8-8m8 8l8-8',
  brow: 'M56 38q8-6 16 0m16 0q8-6 16 0',
};

function PreviewSession({ id }: { id: Key }) {
  const item = timing[id];
  const tracks = [
    { url: audio['./assets/face-balance/' + id + '-intro.wav'], seconds: item.introFrames / item.sampleRate },
    { url: audio['./assets/face-balance/' + id + '-practice.wav'], seconds: item.practiceSec },
    { url: audio['./assets/face-balance/' + id + '-transition.wav'], seconds: item.transitionFrames / item.sampleRate },
  ];
  const { status, elapsed, start, pause, resume, stop } = usePracticeMedia(tracks);
  const [ready, setReady] = useState(false);
  const seconds = Math.ceil(item.practiceSec - elapsed / 1000);
  const active = status === 'running' || status === 'paused';
  const busy = active || status === 'intro' || status === 'transition';
  const cue = active ? item.segments.find(segment =>
    elapsed >= segment.start * 1000 && elapsed < (segment.start + segment.seconds) * 1000) : undefined;
  const caption = status === 'intro' ? item.intro : status === 'transition' ? item.transitionCaption
    : status === 'completed' ? '検品再生が終了しました。' : status === 'error' ? '音声を再生できませんでした。'
    : cue?.caption ?? '説明音声の終了後に実践タイマーを開始します。';

  return <section>
    <h2>{item.name}</h2>
    <p>{item.classification} ／ {item.breath}</p>
    <p>監修待ち項目　{item.review}、共通安全文言</p>
    <label><input type="checkbox" checked={ready} disabled={busy} onChange={event => setReady(event.target.checked)} /> 検品用の再生であることを確認しました</label>
    <div>
      <svg viewBox="0 0 160 120" width="160" role="img" aria-label={cue?.caption ?? '開始・終了の模式図'}>
        <ellipse cx="80" cy="58" rx="44" ry="49" fill="#e2f1e7" stroke="#254438" strokeWidth="3" />
        <path d="M60 47h8m24 0h8m-24 13h8" stroke="#254438" strokeWidth="3" strokeLinecap="round" />
        <path d={visualPaths[cue?.visual ?? 'rest']} fill="none" stroke="#254438" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
    <output aria-label="実践残り秒数">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</output>
    <p role="status">{caption}</p>
    {cue && <p>{cue.phase} · {cue.round} / {item.segments[item.segments.length - 1].round} 周</p>}
    {!busy && <button disabled={!ready} onClick={start}>説明から開始</button>}
    {status === 'running' && <button onClick={pause}>一時停止</button>}
    {status === 'paused' && <button onClick={resume}>再開</button>}
    {busy && <button onClick={stop}>停止</button>}
  </section>;
}

function FaceBalancePreview() {
  const [id, setId] = useState<Key>('kapola');
  return <main style={{ maxWidth: 720, margin: 'auto', padding: 20, fontFamily: 'sans-serif', lineHeight: 1.65 }}>
    <h1>FACE BALANCE YOGA v0.5</h1>
    <p><strong>開発検品用・公開不可</strong>。監修前の音声と模式図を、動作を行わず確認する画面です。</p>
    <label>種目 <select value={id} onChange={event => setId(event.target.value as Key)}>
      {keys.map(key => <option key={key} value={key}>{timing[key].name}</option>)}
    </select></label>
    <PreviewSession key={id} id={id} />
    <h2>コース尺</h2>
    <p>素材実尺の合計。読み込み・一時停止・種目選択の時間は別です。</p>
    <ul>{courses.map(course => {
      const totals = course.order.reduce((sum, key) => {
        if (key === 'jaw') return { practice: sum.practice + 45, total: sum.total + 45 + jawTiming.introFrames / jawTiming.sampleRate };
        const item = timing[key];
        return { practice: sum.practice + item.practiceSec, total: sum.total + item.practiceSec + (item.introFrames + item.transitionFrames) / item.sampleRate };
      }, { practice: 0, total: 0 });
      return <li key={course.name}>{course.name} · 実践 {totals.practice}秒 ／ 総尺 {totals.total.toFixed(3)}秒</li>;
    })}</ul>
    <a href="/jaw-release.html">Jaw Releaseの検品へ</a>
  </main>;
}

if (import.meta.env.DEV) createRoot(document.getElementById('root')!).render(<FaceBalancePreview />);
