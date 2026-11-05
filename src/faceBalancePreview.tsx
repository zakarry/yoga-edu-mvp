import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { usePracticeMedia, type MediaTrack } from './lib/usePracticeMedia';
import timing from './assets/face-balance/timing.json';
import jawTiming from './assets/jaw-release/timing.json';
import jawIntro from './assets/jaw-release/intro.wav?url';
import jawPractice from './assets/jaw-release/practice.wav?url';
import { jawRelease } from './lib/jawRelease';

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

type ExerciseKey = Key | 'jaw';
interface CourseTrack extends MediaTrack { id: ExerciseKey; step: number }

function tracksFor(id: ExerciseKey, step: number): CourseTrack[] {
  if (id === 'jaw') return [
    { id, step, phase: 'intro', url: jawIntro, seconds: jawTiming.introFrames / jawTiming.sampleRate },
    { id, step, phase: 'practice', url: jawPractice, seconds: jawTiming.practiceFrames / jawTiming.sampleRate },
  ];
  const item = timing[id];
  const track = (phase: MediaTrack['phase'], seconds: number): CourseTrack => ({
    id, step, phase, seconds, url: audio['./assets/face-balance/' + id + '-' + phase + '.wav'],
  });
  return [
    track('intro', item.introFrames / item.sampleRate),
    track('practice', item.practiceSec),
    track('transition', item.transitionFrames / item.sampleRate),
  ];
}

function PreviewSession({ order }: { order: readonly ExerciseKey[] }) {
  const tracks = order.flatMap(tracksFor);
  const { status, trackIndex, elapsed, start, pause, resume, stop } = usePracticeMedia(tracks);
  const [ready, setReady] = useState(false);
  const track = tracks[trackIndex];
  const item = track.id === 'jaw' ? null : timing[track.id];
  const name = item?.name ?? jawRelease.content.name;
  const practiceSeconds = item?.practiceSec ?? jawTiming.practiceFrames / jawTiming.sampleRate;
  const active = track.phase === 'practice' && (status === 'running' || status === 'paused');
  const busy = status === 'running' || status === 'paused' || status === 'intro' || status === 'transition';
  const seconds = status === 'completed' || track.phase === 'transition' ? 0
    : Math.max(0, Math.ceil(practiceSeconds - (active ? elapsed / 1000 : 0)));
  const cue = active ? item?.segments.find(segment =>
    elapsed >= segment.start * 1000 && elapsed < (segment.start + segment.seconds) * 1000) : undefined;
  const jawSecond = Math.floor(elapsed / 1000);
  const jawHolding = jawSecond % 9 < 5;
  const jawClosing = !item && active && jawSecond >= 42;
  const stage = jawClosing ? '切替（実践枠内）' : track.phase === 'intro' ? '説明' : track.phase === 'transition' ? '切替' : '実践';
  const caption = status === 'error' ? '音声を再生できませんでした。'
    : status === 'completed' ? '検品再生が終了しました。'
    : status === 'idle' ? '説明音声の終了後に実践タイマーを開始します。'
    : track.phase === 'intro' ? (item?.intro ?? jawRelease.guide.cues[0].displayText)
    : track.phase === 'transition' ? item?.transitionCaption
    : cue?.caption ?? (jawClosing ? 'お疲れさまでした。' : jawHolding ? '顎の力を抜いたまま保ちます。鼻で自然に呼吸します。' : '顎の力を抜いて休みます。');
  const jawCue = !item && active ? jawTiming.segments.find(segment =>
    elapsed >= segment.start * 1000 && elapsed < (segment.start + segment.frames / jawTiming.sampleRate) * 1000) : undefined;
  return <section>
    <h2>{name}</h2>
    {order.length > 1 && <p data-testid="course-step">{track.step + 1} / {order.length} 種目 · {busy ? stage : status === 'completed' ? '終了' : '待機'}</p>}
    <p>{item?.classification ?? '現代'} ／ {item?.breath ?? '鼻で自然に呼吸'}</p>
    <p>監修待ち項目　{item?.review ?? '顎の開口範囲'}、共通安全文言</p>
    <label><input type="checkbox" checked={ready} disabled={busy} onChange={event => setReady(event.target.checked)} /> 検品用の再生であることを確認しました</label>
    <div>
      <svg viewBox="0 0 160 120" width="160" role="img" aria-label={cue?.caption ?? '開始・終了の模式図'}>
        <ellipse cx="80" cy="58" rx="44" ry="49" fill="#e2f1e7" stroke="#254438" strokeWidth="3" />
        <path d="M60 47h8m24 0h8m-24 13h8" stroke="#254438" strokeWidth="3" strokeLinecap="round" />
        <path d={(!item && active && jawHolding ? 'M64 76h32m-28 8h24' : visualPaths[cue?.visual ?? 'rest'])} fill="none" stroke="#254438" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
    <output aria-label="実践残り秒数">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</output>
    <p role="status">{caption}</p>
    {cue && item && <p>{cue.phase} · {cue.round} / {item.segments[item.segments.length - 1].round} 周</p>}
    {!item && active && <p>{Math.min(5, Math.floor(jawSecond / 9) + 1)} / 5 回 {jawCue?.reading}</p>}
    {!busy && <button disabled={!ready} onClick={start}>説明から開始</button>}
    {busy && status !== 'paused' && <button onClick={pause}>一時停止</button>}
    {status === 'paused' && <button onClick={resume}>再開</button>}
    {busy && <button onClick={stop}>停止</button>}
  </section>;
}

function FaceBalancePreview() {
  const [id, setId] = useState<Key>('kapola');
  const [courseIndex, setCourseIndex] = useState(-1);
  return <main style={{ maxWidth: 720, margin: 'auto', padding: 20, fontFamily: 'sans-serif', lineHeight: 1.65 }}>
    <h1>FACE BALANCE YOGA v0.5</h1>
    <p><strong>開発検品用・公開不可</strong>。監修前の音声と模式図を、動作を行わず確認する画面です。</p>
    <label>種目 <select disabled={courseIndex >= 0} value={id} onChange={event => setId(event.target.value as Key)}>
      {keys.map(key => <option key={key} value={key}>{timing[key].name}</option>)}
    </select></label>
    <div><label>連続再生コース <select value={courseIndex} onChange={event => setCourseIndex(Number(event.target.value))}>
      <option value={-1}>単独種目を再生</option>
      {courses.map((course, index) => <option key={course.name} value={index}>{course.name}</option>)}
    </select></label></div>
    <PreviewSession key={courseIndex < 0 ? id : 'course-' + courseIndex} order={courseIndex < 0 ? [id] : courses[courseIndex].order} />
    <h2>コース尺</h2>
    <p>8分フルの総所要時間は約9分19秒です。表示は音源実尺の合計で、読み込み・一時停止の時間は別です。</p>
    <ul>{courses.map(course => {
      const tracks = course.order.flatMap(tracksFor);
      const totals = {
        practice: tracks.filter(track => track.phase === 'practice').reduce((sum, track) => sum + track.seconds, 0),
        total: tracks.reduce((sum, track) => sum + track.seconds, 0),
      };
      return <li key={course.name}>{course.name} · 実践 {totals.practice}秒 ／ 総尺 {totals.total.toFixed(3)}秒</li>;
    })}</ul>
    <a href="/jaw-release.html">Jaw Releaseの検品へ</a>
  </main>;
}

if (import.meta.env.DEV) createRoot(document.getElementById('root')!).render(<FaceBalancePreview />);
