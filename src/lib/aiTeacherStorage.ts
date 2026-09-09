// AI Teacher persona + program + growth + local practice fallback
// All keys are namespaced to avoid collision with existing localStorage keys.

const TEACHER_KEY = 'yogaTeacher';
const TODAY_YOGA_KEY = 'todayYoga';
const GROWTH_KEY = 'yogaGrowth';
const LOCAL_PRACTICE_KEY = 'yoga-ai-practice-local-v1';

// ── Persona ──

export interface AITeacherPersona {
  name: string;
  avatar: string;
  personality: string;
  specialty: string;
  uiLanguage: 'ja' | 'en' | 'zh' | 'ko';
  teachingLanguage: 'ja' | 'en' | 'zh' | 'ko';
  createdAt: string;
}

export function loadPersona(): AITeacherPersona | null {
  try {
    const raw = localStorage.getItem(TEACHER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AITeacherPersona;
  } catch {
    return null;
  }
}

export function savePersona(persona: AITeacherPersona): void {
  try {
    localStorage.setItem(TEACHER_KEY, JSON.stringify(persona));
  } catch {
    // ignore
  }
}

export function clearPersona(): void {
  try {
    localStorage.removeItem(TEACHER_KEY);
  } catch {
    // ignore
  }
}

// ── Today's Program ──

export interface ProgramItem {
  name: string;
  type: 'asana' | 'pranayama' | 'dhyana';
  durationMin: number;
}

export interface TodayProgram {
  items: ProgramItem[];
  generatedAt: string;
  basedOn: 'diagnosis' | 'history' | 'default';
}

export function loadTodayProgram(): TodayProgram | null {
  try {
    const raw = localStorage.getItem(TODAY_YOGA_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TodayProgram;
  } catch {
    return null;
  }
}

export function saveTodayProgram(program: TodayProgram): void {
  try {
    localStorage.setItem(TODAY_YOGA_KEY, JSON.stringify(program));
  } catch {
    // ignore
  }
}

// ── Growth (non-sensitive) ──

export type PrefExplanation = 'short' | 'standard' | 'detailed';
export type PrefCue = 'more' | 'as_needed' | 'minimal';
export type PrefPraise = 'more' | 'normal' | 'less';

export interface AITeacherPrefs {
  explanation: PrefExplanation;
  cue: PrefCue;
  praise: PrefPraise;
}

export interface AITeacherGrowth {
  sessions: number;
  favoriteTypes: string[];
  preferredStyle: string | null;
  relationshipLevel: number;
  understandingLevel: number;
  facts: string[];
  streakDays: number;
  lastPracticeDate: string | null;
  prefs: AITeacherPrefs;
}

const DEFAULT_GROWTH: AITeacherGrowth = {
  sessions: 0,
  favoriteTypes: [],
  preferredStyle: null,
  relationshipLevel: 1,
  understandingLevel: 1,
  facts: [],
  streakDays: 0,
  lastPracticeDate: null,
  prefs: { explanation: 'standard', cue: 'as_needed', praise: 'normal' },
};

export function loadGrowth(): AITeacherGrowth {
  try {
    const raw = localStorage.getItem(GROWTH_KEY);
    if (!raw) return { ...DEFAULT_GROWTH };
    const parsed = JSON.parse(raw) as Partial<AITeacherGrowth>;
    return { ...DEFAULT_GROWTH, ...parsed };
  } catch {
    return { ...DEFAULT_GROWTH };
  }
}

export function saveGrowth(growth: AITeacherGrowth): void {
  try {
    localStorage.setItem(GROWTH_KEY, JSON.stringify(growth));
  } catch {
    // ignore
  }
}

// ── Local practice fallback (non-logged-in) ──

export interface LocalPracticeLog {
  id: string;
  practice_type: 'asana' | 'pranayama' | 'dhyana';
  practice_name: string;
  duration_min: number | null;
  mood_before: string | null;
  mood_after: string | null;
  ai_teacher_used: boolean;
  created_at: string;
}

export function loadLocalPracticeLogs(): LocalPracticeLog[] {
  try {
    const raw = localStorage.getItem(LOCAL_PRACTICE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as LocalPracticeLog[];
  } catch {
    return [];
  }
}

export function saveLocalPracticeLog(log: Omit<LocalPracticeLog, 'id' | 'created_at'>): LocalPracticeLog {
  const entry: LocalPracticeLog = {
    ...log,
    id: `local-practice-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  const logs = loadLocalPracticeLogs();
  logs.unshift(entry);
  try {
    localStorage.setItem(LOCAL_PRACTICE_KEY, JSON.stringify(logs.slice(0, 100)));
  } catch {
    // ignore
  }
  return entry;
}

export function getLocalPracticeSummary(): { asana: number; pranayama: number; dhyana: number; totalSessions: number } {
  const logs = loadLocalPracticeLogs();
  const summary = { asana: 0, pranayama: 0, dhyana: 0, totalSessions: 0 };
  for (const log of logs) {
    if (log.practice_type in summary) {
      (summary as Record<string, number>)[log.practice_type]++;
    }
    summary.totalSessions++;
  }
  return summary;
}
