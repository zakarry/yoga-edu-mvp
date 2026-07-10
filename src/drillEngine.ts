import type { DrillEntry } from './drillData';
import { drillEntries } from './drillData';

export interface QuizQuestion {
  entryId: string;
  chapter: number;
  questionText: string;
  choices: string[];
  correctIndex: number;
  sourceType: 'def' | 'check';
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickDistractors(correct: DrillEntry, pool: DrillEntry[], count: number): DrillEntry[] {
  // 同じtype(用語/人物/文献/体系/実践)の他項目を優先して誤答にする(紛らわしさ=学習効果)
  const sameType = pool.filter((e) => e.id !== correct.id && e.type === correct.type);
  const others = pool.filter((e) => e.id !== correct.id && e.type !== correct.type);
  const candidates = shuffle(sameType).concat(shuffle(others));
  return candidates.slice(0, count);
}

/**
 * 指定した項目群から、四択の「定義当てクイズ」を1問生成する。
 * 出題文＝タイトル、選択肢＝定義(1つが正解・3つが他項目の定義)。
 */
export function buildQuestion(entry: DrillEntry, pool: DrillEntry[]): QuizQuestion {
  const distractors = pickDistractors(entry, pool, 3);
  const choiceEntries = shuffle([entry, ...distractors]);
  const choices = choiceEntries.map((e) => e.def);
  const correctIndex = choiceEntries.findIndex((e) => e.id === entry.id);
  return {
    entryId: entry.id,
    chapter: entry.chapter,
    questionText: `「${entry.title}」の正しい説明はどれか。`,
    choices,
    correctIndex,
    sourceType: 'def',
  };
}

export function buildQuizSet(chapters: number[], count: number, levelUp: boolean): QuizQuestion[] {
  const pool = drillEntries.filter((e) => chapters.includes(e.chapter) && (levelUp || !e.l2));
  const picked = shuffle(pool).slice(0, Math.min(count, pool.length));
  return picked.map((e) => buildQuestion(e, pool));
}

/** 弱点(不正解が多い項目)優先で出題する */
export function buildWeakPointQuizSet(
  chapters: number[],
  count: number,
  levelUp: boolean,
  stats: Record<string, { correct: number; wrong: number }>,
): QuizQuestion[] {
  const pool = drillEntries.filter((e) => chapters.includes(e.chapter) && (levelUp || !e.l2));
  const scored = pool
    .map((e) => {
      const s = stats[e.id];
      const wrongRate = s ? s.wrong / Math.max(1, s.correct + s.wrong) : 0.5; // 未挑戦は中間優先度
      const attempts = s ? s.correct + s.wrong : 0;
      return { entry: e, priority: wrongRate * 100 - attempts };
    })
    .sort((a, b) => b.priority - a.priority);
  const picked = scored.slice(0, Math.min(count, scored.length)).map((s) => s.entry);
  return shuffle(picked).map((e) => buildQuestion(e, pool));
}
