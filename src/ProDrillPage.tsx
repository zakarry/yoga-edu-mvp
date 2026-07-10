import { useEffect, useMemo, useState } from 'react';
import { chapterList } from './drillData';
import { buildQuizSet, buildWeakPointQuizSet, type QuizQuestion } from './drillEngine';
import { TopBackLink } from './components/TopBackLink';

interface EntryStat {
  correct: number;
  wrong: number;
}

interface DrillProgress {
  stats: Record<string, EntryStat>;
  streakDays: number;
  lastStudyDate: string | null;
  totalAnswered: number;
}

const STORAGE_KEY = 'yoga-pro-drill-progress-v1';

function loadProgress(): DrillProgress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DrillProgress;
  } catch {
    /* ignore */
  }
  return { stats: {}, streakDays: 0, lastStudyDate: null, totalAnswered: 0 };
}

function saveProgress(p: DrillProgress) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function updateStreak(p: DrillProgress): DrillProgress {
  const today = todayStr();
  if (p.lastStudyDate === today) return p;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streakDays = p.lastStudyDate === yesterday ? p.streakDays + 1 : 1;
  return { ...p, streakDays, lastStudyDate: today };
}

type Mode = 'select' | 'quiz' | 'summary';

interface ProDrillPageProps {
  onBackHome: () => void;
}

export function ProDrillPage({ onBackHome }: ProDrillPageProps) {
  const [progress, setProgress] = useState<DrillProgress>(() => loadProgress());
  const [mode, setMode] = useState<Mode>('select');
  const [selectedChapters, setSelectedChapters] = useState<number[]>([1]);
  const [includeL2, setIncludeL2] = useState(false);
  const [weakMode, setWeakMode] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionWrong, setSessionWrong] = useState(0);

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  const totalMastered = useMemo(
    () => Object.values(progress.stats).filter((s) => s.correct >= 2 && s.wrong === 0).length,
    [progress.stats],
  );

  const toggleChapter = (ch: number) => {
    setSelectedChapters((prev) => (prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch].sort((a, b) => a - b)));
  };

  const startQuiz = () => {
    if (selectedChapters.length === 0) return;
    const set = weakMode
      ? buildWeakPointQuizSet(selectedChapters, 10, includeL2, progress.stats)
      : buildQuizSet(selectedChapters, 10, includeL2);
    if (set.length === 0) return;
    setQuestions(set);
    setQIndex(0);
    setChosen(null);
    setSessionCorrect(0);
    setSessionWrong(0);
    setMode('quiz');
  };

  const answer = (idx: number) => {
    if (chosen !== null) return;
    setChosen(idx);
    const q = questions[qIndex];
    const isCorrect = idx === q.correctIndex;
    setProgress((prev) => {
      const s = prev.stats[q.entryId] ?? { correct: 0, wrong: 0 };
      const nextStats = {
        ...prev.stats,
        [q.entryId]: isCorrect ? { ...s, correct: s.correct + 1 } : { ...s, wrong: s.wrong + 1 },
      };
      const withStreak = updateStreak({ ...prev, stats: nextStats, totalAnswered: prev.totalAnswered + 1 });
      return withStreak;
    });
    if (isCorrect) setSessionCorrect((c) => c + 1);
    else setSessionWrong((c) => c + 1);
  };

  const next = () => {
    if (qIndex + 1 < questions.length) {
      setQIndex((i) => i + 1);
      setChosen(null);
    } else {
      setMode('summary');
    }
  };

  const q = questions[qIndex];

  return (
    <div className="page-shell pro-drill-page">
      <section className="hero-panel federation-hero pro-yoga-hero">
        <div>
          <TopBackLink onBackHome={onBackHome} />
          <span className="eyebrow">Professional Yoga Certification Drill</span>
          <h2>ヨガAIドリル｜検定対策</h2>
          <p>公式教科書 全11章・234項目から出題。間違えた項目は優先的に再出題されます。</p>
        </div>
      </section>

      <div className="feature-showcase pro-drill-stats">
        <section className="panel">
          <h3>学習の記録</h3>
          <ul className="check-list">
            <li>連続学習日数：{progress.streakDays} 日</li>
            <li>習得済み項目：{totalMastered} / 234</li>
            <li>これまでの解答数：{progress.totalAnswered} 問</li>
          </ul>
        </section>
      </div>

      {mode === 'select' && (
        <section className="panel pro-drill-select">
          <h3>出題範囲を選ぶ</h3>
          <div className="pro-drill-chapter-grid">
            {chapterList.map((c) => (
              <button
                key={c.chapter}
                className={`chip-toggle${selectedChapters.includes(c.chapter) ? ' on' : ''}`}
                onClick={() => toggleChapter(c.chapter)}
              >
                第{c.chapter}章　{c.title}（{c.count}）
              </button>
            ))}
          </div>

          <label className="l2-check">
            <input type="checkbox" checked={includeL2} onChange={(e) => setIncludeL2(e.target.checked)} />
            レベル2（上級）項目も含める
          </label>

          <label className="l2-check">
            <input type="checkbox" checked={weakMode} onChange={(e) => setWeakMode(e.target.checked)} />
            苦手項目を優先して出題する
          </label>

          <div className="hero-actions">
            <button className="gold-button" onClick={startQuiz} disabled={selectedChapters.length === 0}>
              ドリルを始める（10問）
            </button>
          </div>
        </section>
      )}

      {mode === 'quiz' && q && (
        <section className="panel pro-drill-quiz">
          <div className="pro-drill-progress-bar">
            問題 {qIndex + 1} / {questions.length}
          </div>
          <h3>{q.questionText}</h3>
          <div className="pro-drill-choices">
            {q.choices.map((c, i) => {
              let cls = 'pro-drill-choice';
              if (chosen !== null) {
                if (i === q.correctIndex) cls += ' correct';
                else if (i === chosen) cls += ' wrong';
              }
              return (
                <button key={i} className={cls} onClick={() => answer(i)} disabled={chosen !== null}>
                  {c}
                </button>
              );
            })}
          </div>
          {chosen !== null && (
            <div className="hero-actions">
              <button className="secondary-button" onClick={next}>
                {qIndex + 1 < questions.length ? '次の問題へ' : '結果を見る'}
              </button>
            </div>
          )}
        </section>
      )}

      {mode === 'summary' && (
        <section className="panel pro-drill-summary">
          <h3>今回の結果</h3>
          <div className="status-card gold-accent">
            <strong>
              正解 {sessionCorrect} / {questions.length}
            </strong>
            <p>間違えた項目は「苦手項目を優先」で復習できます。</p>
          </div>
          <div className="hero-actions">
            <button className="gold-button" onClick={() => setMode('select')}>
              もう一度挑戦する
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
