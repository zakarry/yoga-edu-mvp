// 4-layer AI Teacher architecture types

// ── Layer 1: Professional Yoga Core ──
// Shared across all AI teachers — safety + yoga knowledge accuracy
export interface ProfessionalYogaCore {
  asanaUnderstanding: boolean;
  pranayamaUnderstanding: boolean;
  dhyanaUnderstanding: boolean;
  sequenceCapability: boolean;
  knowledgeBaseConnected: boolean;
  safetyPrinciples: boolean;
  knowledgeGuardActive: boolean;
  noMedicalDiagnosis: boolean;
}

export const PROFESSIONAL_YOGA_CORE: ProfessionalYogaCore = {
  asanaUnderstanding: true,
  pranayamaUnderstanding: true,
  dhyanaUnderstanding: true,
  sequenceCapability: true,
  knowledgeBaseConnected: true,
  safetyPrinciples: true,
  knowledgeGuardActive: true,
  noMedicalDiagnosis: true,
};

// ── Layer 2: My Teacher Personality ──
export type PersonalityType =
  | 'gentle' | 'bright' | 'calm' | 'energetic'
  | 'concise' | 'polite' | 'breath_specialist'
  | 'meditation_specialist' | 'beginner_friendly' | 'music_flow';

export interface MyTeacherPersonality {
  name: string;
  avatar: string;
  personality: PersonalityType;
  specialty: string;
  teachingLanguage: string;
  uiLanguage: string;
}

// ── Layer 3: My Yoga Memory ──
// Long-term user understanding. NOT medical diagnosis.

export type MemoryEntryType =
  | 'favorite_practice'
  | 'disliked_practice'
  | 'frequent_practice'
  | 'preferred_duration'
  | 'preferred_time'
  | 'preferred_explanation_style'
  | 'preferred_teacher_tone'
  | 'goal'
  | 'user_reported_concern'
  | 'practice_history_note'
  | 'streak_note';

export interface MemoryEntry {
  id: string;
  type: MemoryEntryType;
  label: string;
  detail: string | null;
  source: 'user_reported' | 'inferred_from_practice' | 'inferred_from_diagnosis';
  active: boolean;
  createdAt: string;
  lastConfirmedAt: string | null;
}

// user_reported_concern — explicitly NOT a medical diagnosis
export interface UserReportedConcern {
  area: string;
  text: string;
  source: 'user_reported';
  lastConfirmedAt: string;
}

// ── Layer 4: Today Context ──
// Per-session state, not persisted long-term

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export interface TodayContext {
  availableMinutes: number | null;
  mood: string | null;
  wantToMove: boolean | null;
  wantToRest: boolean | null;
  intensityPreference: 'gentle' | 'moderate' | 'dynamic' | null;
  requestedType: 'asana' | 'pranayama' | 'dhyana' | null;
  requestedStyle: string | null;
  todayConcern: string | null;
  todayPain: string | null;
  timeOfDay: TimeOfDay | null;
}

export function emptyTodayContext(): TodayContext {
  return {
    availableMinutes: null,
    mood: null,
    wantToMove: null,
    wantToRest: null,
    intensityPreference: null,
    requestedType: null,
    requestedStyle: null,
    todayConcern: null,
    todayPain: null,
    timeOfDay: null,
  };
}

// ── Combined 4-layer context ──
export interface FourLayerContext {
  core: ProfessionalYogaCore;
  personality: MyTeacherPersonality | null;
  memory: MemoryEntry[];
  todayContext: TodayContext;
}
