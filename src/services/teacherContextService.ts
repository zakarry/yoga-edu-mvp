import { getLatestDiagnosis, type DiagnosisRecord } from './diagnosisService';
import { getPracticeLogs, type PracticeLog } from './practiceLogService';
import {
  loadPersona, loadGrowth, loadLocalPracticeLogs,
  type AITeacherPersona, type AITeacherGrowth, type LocalPracticeLog,
} from '../lib/aiTeacherStorage';
import { getMemory, summarizeMemory, loadLocalMemory, type MemorySummary } from './aiTeacherMemoryService';
import type { TodayContext } from '../types/aiTeacherLayers';

export type PracticeType = 'asana' | 'pranayama' | 'dhyana';

export interface TeacherContext {
  userId?: string;
  latestDiagnosis?: {
    resultType?: string;
    goals?: string[];
    preferredStyles?: string[];
    preferredDuration?: number;
  };
  practiceSummary: {
    totalSessions: number;
    streakDays: number;
    recentTypes: PracticeType[];
    favoriteTypes: string[];
    averageDuration?: number;
    lastPracticeAt?: string;
  };
  preferences: {
    explanation: 'short' | 'standard' | 'detailed';
    cue: 'more' | 'as_needed' | 'minimal';
    praise: 'more' | 'normal' | 'less';
  };
  persona: {
    name: string;
    personality: string;
    specialty: string;
    teachingLanguage: string;
  } | null;
  sessionIntent?: {
    requestedMinutes?: number;
    requestedStyle?: string;
    requestedType?: string;
    userMessage?: string;
  };
  memorySummary?: MemorySummary;
  todayContext?: TodayContext;
}

interface PracticeRecord {
  practice_type: PracticeType;
  duration_min: number | null;
  created_at: string;
}

function extractDiagnosisContext(diag: DiagnosisRecord): TeacherContext['latestDiagnosis'] {
  const scores = diag.score_json ?? {};
  const resultType = diag.result_type ?? undefined;
  const goals: string[] = [];
  const preferredStyles: string[] = [];
  let preferredDuration: number | undefined;

  const learning = diag.learning_record_json;
  if (learning && typeof learning === 'object') {
    const rec = learning as Record<string, unknown>;
    if (typeof rec['preferredDuration'] === 'number') preferredDuration = rec['preferredDuration'] as number;
    if (Array.isArray(rec['goals'])) goals.push(...(rec['goals'] as string[]).filter((s) => typeof s === 'string'));
    if (Array.isArray(rec['preferredStyles'])) preferredStyles.push(...(rec['preferredStyles'] as string[]).filter((s) => typeof s === 'string'));
  }

  if (typeof scores['yogaActivity'] === 'number' && (scores['yogaActivity'] as number) > 60) {
    if (!goals.includes('日常の実践')) goals.push('日常の実践');
  }

  return { resultType, goals, preferredStyles, preferredDuration };
}

function summarizePractice(records: PracticeRecord[]): TeacherContext['practiceSummary'] {
  const totalSessions = records.length;
  if (totalSessions === 0) {
    return {
      totalSessions: 0,
      streakDays: 0,
      recentTypes: [],
      favoriteTypes: [],
    };
  }

  const recentTypes: PracticeType[] = records.slice(0, 10).map((r) => r.practice_type);
  const typeCounts: Record<string, number> = {};
  let totalDuration = 0;
  let durationCount = 0;
  let lastPracticeAt: string | undefined;

  for (const r of records) {
    typeCounts[r.practice_type] = (typeCounts[r.practice_type] ?? 0) + 1;
    if (r.duration_min) { totalDuration += r.duration_min; durationCount++; }
    if (!lastPracticeAt || r.created_at > lastPracticeAt) lastPracticeAt = r.created_at;
  }

  const favoriteTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);

  const averageDuration = durationCount > 0 ? Math.round(totalDuration / durationCount) : undefined;

  return {
    totalSessions,
    streakDays: 0,
    recentTypes,
    favoriteTypes,
    averageDuration,
    lastPracticeAt,
  };
}

export function getRecentPracticePatterns(records: PracticeRecord[]): PracticeType[] {
  return records.slice(0, 5).map((r) => r.practice_type);
}

export function getPreferredPracticePatterns(records: PracticeRecord[]): PracticeType[] {
  const counts: Record<string, number> = {};
  for (const r of records) {
    counts[r.practice_type] = (counts[r.practice_type] ?? 0) + 1;
  }
  return (Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k as PracticeType));
}

export function getRecentDurationPattern(records: PracticeRecord[]): number | undefined {
  const recent = records.slice(0, 5).filter((r) => r.duration_min != null);
  if (recent.length === 0) return undefined;
  return Math.round(recent.reduce((sum, r) => sum + (r.duration_min ?? 0), 0) / recent.length);
}

export async function buildTeacherContext(
  userId: string | null,
  growth: AITeacherGrowth,
  sessionIntent?: TeacherContext['sessionIntent'],
  todayContext?: TodayContext,
): Promise<TeacherContext> {
  const persona = loadPersona();
  const prefs = growth.prefs;

  let practiceRecords: PracticeRecord[];
  let latestDiagnosis: TeacherContext['latestDiagnosis'];

  if (userId) {
    const { data: diagData } = await getLatestDiagnosis(userId);
    latestDiagnosis = diagData ? extractDiagnosisContext(diagData) : undefined;

    const { data: logs } = await getPracticeLogs(userId);
    practiceRecords = (logs ?? []).map((l) => ({
      practice_type: l.practice_type,
      duration_min: l.duration_min,
      created_at: l.created_at,
    }));
  } else {
    latestDiagnosis = undefined;
    const localLogs: LocalPracticeLog[] = loadLocalPracticeLogs();
    practiceRecords = localLogs.map((l) => ({
      practice_type: l.practice_type,
      duration_min: l.duration_min,
      created_at: l.created_at,
    }));
  }

  const summary = summarizePractice(practiceRecords);
  summary.streakDays = growth.streakDays;
  if (summary.favoriteTypes.length === 0 && growth.favoriteTypes.length > 0) {
    summary.favoriteTypes = growth.favoriteTypes;
  }

  const memoryEntries = await getMemory(userId);
  const memorySummary = summarizeMemory(memoryEntries);

  return {
    userId: userId ?? undefined,
    latestDiagnosis,
    practiceSummary: summary,
    preferences: {
      explanation: prefs.explanation === 'standard' ? 'standard' : prefs.explanation,
      cue: prefs.cue,
      praise: prefs.praise,
    },
    persona: persona ? {
      name: persona.name,
      personality: persona.personality,
      specialty: persona.specialty,
      teachingLanguage: persona.teachingLanguage,
    } : null,
    sessionIntent,
    memorySummary,
    todayContext,
  };
}

export function buildLocalContext(growth: AITeacherGrowth, sessionIntent?: TeacherContext['sessionIntent'], todayContext?: TodayContext): TeacherContext {
  const persona = loadPersona();
  const localLogs = loadLocalPracticeLogs();
  const records: PracticeRecord[] = localLogs.map((l) => ({
    practice_type: l.practice_type,
    duration_min: l.duration_min,
    created_at: l.created_at,
  }));
  const summary = summarizePractice(records);
  summary.streakDays = growth.streakDays;
  if (summary.favoriteTypes.length === 0 && growth.favoriteTypes.length > 0) {
    summary.favoriteTypes = growth.favoriteTypes;
  }
  const memoryEntries = loadLocalMemory();
  const memorySummary = summarizeMemory(memoryEntries);

  return {
    practiceSummary: summary,
    preferences: {
      explanation: growth.prefs.explanation,
      cue: growth.prefs.cue,
      praise: growth.prefs.praise,
    },
    persona: persona ? {
      name: persona.name,
      personality: persona.personality,
      specialty: persona.specialty,
      teachingLanguage: persona.teachingLanguage,
    } : null,
    sessionIntent,
    memorySummary,
    todayContext,
  };
}
