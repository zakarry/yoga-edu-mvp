import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../lib/auth';
import { savePracticeLog, getPracticeLogs, type PracticeLog } from '../services/practiceLogService';
import {
  loadPersona, savePersona, clearPersona,
  loadTodayProgram, saveTodayProgram,
  loadGrowth, saveGrowth,
  saveLocalPracticeLog, loadLocalPracticeLogs,
  loadNextSuggestion, saveNextSuggestion, clearNextSuggestion,
  saveTodayContextSession, loadTodayContextSession, clearTodayContextSession,
  type AITeacherPersona, type TodayProgram,
  type AITeacherGrowth, type LocalPracticeLog,
  type AITeacherPrefs, type PrefExplanation, type PrefCue, type PrefPraise,
  type NextSuggestion,
} from '../lib/aiTeacherStorage';
import type { DiagnosisRecord, SafetyState } from '../services/diagnosisService';
import { buildTeacherContext, type TeacherContext } from '../services/teacherContextService';
import { generateTodayPlan, type TodayPlan } from '../services/todayPlannerService';
import { generateTeacherResponse, generateNextSuggestion, type ConversationContext } from '../services/teacherResponseService';
import { attachKnowledgeToTodayPlan, fetchKnowledgeExplanation, type TodayPlanWithKnowledge } from '../services/todayPlanKnowledgeService';
import type { KnowledgeExplanation } from '../services/teacherKnowledgeService';
import { runLLMRequestDryRun, type DryRunResult } from '../services/llmRequestDryRun';
import type { LLMPersona, LLMSessionContext } from '../types/aiTeacherLLM';
import { resolveConcretePoses, getDefaultPlanPoses, getPoseKnowledgeLink, getPoseById, type ConcretePose, type PoseStage } from '../lib/poseLibrary';
import { loadLocalMemory, summarizeMemory, getMemory } from '../services/aiTeacherMemoryService';
import { emptyTodayContext, type TodayContext, type RequestedMode } from '../types/aiTeacherLayers';
import { getPlanGate, gateVerdictAllowsGeneration, gateStateMessage, getPracticeEntryGate, practiceEntryAllows, computeTodayContextSignature, isPlanStale, type PlanGateVerdict, type PracticeEntryVerdict } from '../services/planGate';
import { isTTSAvailable, buildVoiceGuide, getVoiceStatus, getVoiceGuideEngine, getEngineType, preloadVoicePhrases, preloadVoiceKeys, ALL_VOICE_KEYS, REMAINING_CUES, BOX_BREATHING_PHASE_CUES, type VoiceGuideSequence, type VoiceStatus, type EngineType } from '../lib/voiceGuide';

interface MyAITeacherPageProps {
  onBackHome: () => void;
  onOpenDiagnosis: () => void;
  onOpenMyPage: () => void;
  onOpenProYoga: () => void;
  latestDiagnosis: DiagnosisRecord | null;
  initialMinutes?: number;
  entryTarget?: string | null;
}

type StepId = 'home' | 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'step6' | 'step7' | 'step8';

type LangCode = 'ja' | 'en' | 'zh' | 'ko';

const AVATAR_OPTIONS = ['🧘‍♀️', '🧘‍♂️', '🧑‍🏫', '🧘', '🌸', '🌿', '🌅', '🪷', '⚡'];

const PERSONALITY_OPTIONS = [
  { v: 'gentle', label: '穏やかで寄り添う' },
  { v: 'encouraging', label: '明るく励ます' },
  { v: 'precise', label: '論理的で丁寧' },
  { v: 'philosophical', label: '静かで哲学的' },
  { v: 'strict', label: '少し厳しく導く' },
];

const SPECIALTY_OPTIONS = [
  { v: 'pranayama', label: '呼吸法' },
  { v: 'hatha', label: 'ハタヨガ' },
  { v: 'vinyasa', label: 'ヴィンヤサ' },
  { v: 'yin', label: '陰ヨガ' },
  { v: 'meditation', label: '瞑想' },
  { v: 'philosophy', label: 'ヨガ哲学' },
];

const SPECIALTY_LEGACY_MAP: Record<string, string> = {
  relax: '呼吸法',
  breathwork: '呼吸法',
  asana: 'ハタヨガ',
  breathing: '呼吸法',
};

function specialtyLabel(value: string): string {
  return SPECIALTY_OPTIONS.find((s) => s.v === value)?.label ?? SPECIALTY_LEGACY_MAP[value] ?? value;
}

const LANG_OPTIONS: { v: LangCode; label: string }[] = [
  { v: 'ja', label: '日本語' },
  { v: 'en', label: 'English' },
  { v: 'zh', label: '中文' },
  { v: 'ko', label: '한국어' },
];

const CAMERA_GUIDE: Record<LangCode, string> = {
  ja: '全身が入る位置にスマホを置いてください。',
  en: 'Place your phone so your whole body is visible.',
  zh: '请把手机放在能拍到全身的位置。',
  ko: '전신이 화면에 들어오도록 휴대폰을 놓아 주세요.',
};

const CAMERA_TOGGLE_LABEL: Record<LangCode, { on: string; off: string }> = {
  ja: { on: '自分の動きを画面で確認する', off: '画面を閉じる' },
  en: { on: 'Check your movement on screen', off: 'Close screen' },
  zh: { on: '在画面上确认自己的动作', off: '关闭画面' },
  ko: { on: '화면에서 자신의 움직임 확인하기', off: '화면 닫기' },
};

const CAMERA_DISCLAIMER: Record<LangCode, string> = {
  ja: '※AI先生はカメラ映像から姿勢の診断・採点は行いません。自分の動きを確認するための鏡のような機能です。',
  en: '※AI Teacher does not diagnose or score your posture from camera. It is like a mirror to check your own movement.',
  zh: '※AI老师不会通过摄像头诊断或评分您的姿势。它只是确认自己动作的镜子功能。',
  ko: '※AI 선생님은 카메라 영상에서 자세를 진단하거나 채점하지 않습니다. 자신의 움직임을 확인하기 위한 거울 같은 기능입니다.',
};

const PRACTICE_START_GUIDE: Record<LangCode, string> = {
  ja: 'それでは、ゆっくり始めましょう。',
  en: 'Let\'s begin slowly.',
  zh: '那么，慢慢开始吧。',
  ko: '그럼, 천천히 시작해 봅시다.',
};

const MOOD_BEFORE_OPTIONS = ['落ち着いている', '普通', '少し疲れている', '集中したい'];
const MOOD_AFTER_OPTIONS = ['とても良い', '良い', '普通', '少し疲れた'];

interface PracticeGuide {
  id: string;
  name: string;
  purpose: string;
  steps: string[];
  estimate: string;
  defaultDuration: number;
  hasTimer?: boolean;
  timerPhases?: { label: string; seconds: number; body: string }[];
  timerRounds?: number;
}

const PRACTICE_GUIDES: Record<'pranayama' | 'dhyana' | 'asana', PracticeGuide[]> = {
  pranayama: [
    {
      id: 'box-breathing',
      name: 'Box Breathing',
      purpose: '気持ちを落ち着け、呼吸に意識を戻すための短い実践',
      steps: [
        '楽な姿勢になる（椅子でも床でもOK）',
        '4秒かけて鼻からゆっくり吸う',
        '4秒、そのまま静かに止める',
        '4秒かけて鼻から細く長く吐く',
        '4秒、次の呼吸の前に静かに止める',
      ],
      estimate: '4〜6周（約1分30秒〜2分）',
      defaultDuration: 2,
      hasTimer: true,
      timerPhases: [
        { label: '吸う', seconds: 4, body: '鼻からゆっくり吸って、胸やお腹にやさしく空気を入れます。' },
        { label: '止める', seconds: 4, body: '苦しくない範囲で、そのまま静かにキープします。' },
        { label: '吐く', seconds: 4, body: '鼻から細く長く吐いて、肩の力も一緒にゆるめます。' },
        { label: '止める', seconds: 4, body: '次の呼吸の前に、落ち着いてひと呼吸ぶん間を取ります。' },
      ],
      timerRounds: 4,
    },
    {
      id: 'abdominal-breathing',
      name: '腹式呼吸',
      purpose: 'お腹の深い動きを感じながら、自律神経を整える実践',
      steps: [
        '仰向けまたは椅子に座り、楽な姿勢になる',
        '片手をお腹に置き、呼吸の動きを感じる',
        '鼻から自然に吸い、お腹が膨らむのを感じる',
        'ゆっくり鼻から吐き、お腹が戻るのを感じる',
        '無理に深く吸わず、自然な範囲で続ける',
      ],
      estimate: '2〜3分',
      defaultDuration: 3,
    },
    {
      id: 'alternate-nostril',
      name: '交替鼻呼吸',
      purpose: '左右の鼻孔を交互に使い、心身のバランスを整える実践',
      steps: [
        '楽な姿勢で座り、右手を鼻の前に持ってくる',
        '親指で右鼻を閉じ、左鼻からゆっくり吸う',
        '薬指で左鼻を閉じ、親指を離して右鼻からゆっくり吐く',
        '右鼻から吸い、親指で右鼻を閉じて左鼻から吐く',
        'これを交互に繰り返す',
      ],
      estimate: '2〜3分',
      defaultDuration: 3,
    },
  ],
  dhyana: [
    {
      id: 'mindful-breath',
      name: '1分間マインドフルネス',
      purpose: '呼吸に意識を向け、今この瞬間に戻る短い瞑想',
      steps: [
        '背筋を伸ばして楽な姿勢で座る',
        '目を閉じるか、薄く開いて前に置く',
        '呼吸の動き（鼻の奥、胸、お腹）に注意を向ける',
        '呼吸がそれてきたら、やさしく呼吸に戻す',
        '1分間、ただ呼吸を観察し続ける',
      ],
      estimate: '1分',
      defaultDuration: 1,
    },
    {
      id: 'body-scan',
      name: 'ボディスキャン',
      purpose: '体の各部分に意識を向け、緊張を手放す瞑想',
      steps: [
        '仰向けに寝るか、椅子に座る',
        '足のつま先から順番に意識を向ける',
        'ふくらはぎ、太もも、お腹、胸、腕、肩、頭まで',
        '各部分で緊張がないか感じ、あればゆるめる',
        '最後に全身を感じて終わる',
      ],
      estimate: '3〜5分',
      defaultDuration: 5,
    },
  ],
  asana: [
    {
      id: 'today-plan-asana',
      name: '今日のアーサナ',
      purpose: '今日のプログラムで選ばれたポーズを順番に実践します',
      steps: [
        '下に表示されている今日のポーズを確認する',
        '各ポーズのお手本画像を見てから、ゆっくり動く',
        '無理のない範囲で行う',
        '呼吸と動きを合わせる',
        '全ポーズ終了後、記録画面へ進む',
      ],
      estimate: '5〜10分',
      defaultDuration: 10,
    },
  ],
};

function getGuidesForType(type: 'asana' | 'pranayama' | 'dhyana'): PracticeGuide[] {
  return PRACTICE_GUIDES[type];
}

function calcUnderstandingAxis(g: AITeacherGrowth, hasPersona: boolean): { practice: number; preference: number; continuity: number } {
  const practice = Math.min(100, Math.round((g.sessions / 50) * 100));
  const prefCount =
    (g.prefs.explanation !== 'standard' ? 1 : 0) +
    (g.prefs.cue !== 'as_needed' ? 1 : 0) +
    (g.prefs.praise !== 'normal' ? 1 : 0) +
    (hasPersona ? 1 : 0);
  const preference = Math.min(100, Math.round((prefCount / 4) * 100));
  const continuity = Math.min(100, Math.round((g.streakDays / 30) * 100));
  return { practice, preference, continuity };
}

const DEMO_FEEDBACK: Record<LangCode, string[]> = {
  ja: [
    'ゆっくり呼吸を続けましょう',
    '無理のない範囲で続けてください',
    '呼吸に意識を向けてみましょう',
    '急がず、自分のペースで',
    '現在はデモフィードバックです',
  ],
  en: [
    'Let\'s keep breathing slowly',
    'Continue within your comfortable range',
    'Bring awareness to your breath',
    'No rush, go at your own pace',
    'This is demo feedback for now',
  ],
  zh: [
    '请继续缓慢呼吸',
    '请在不要勉强的范围内继续',
    '把注意力放在呼吸上',
    '不要着急，按自己的节奏',
    '目前是演示反馈',
  ],
  ko: [
    '천천히 호흡을 계속해 봅시다',
    '무리하지 않는 범위에서 계속하세요',
    '호흡에 의식을 향해 보세요',
    '서두르지 말고 자신의 페이스로',
    '현재는 데모 피드백입니다',
  ],
};

const PREF_EXPLANATION_OPTIONS: { v: PrefExplanation; label: string }[] = [
  { v: 'short', label: '短め' },
  { v: 'standard', label: '標準' },
  { v: 'detailed', label: '詳しく' },
];
const PREF_CUE_OPTIONS: { v: PrefCue; label: string }[] = [
  { v: 'more', label: '多め' },
  { v: 'as_needed', label: '必要時' },
  { v: 'minimal', label: '最低限' },
];
const PREF_PRAISE_OPTIONS: { v: PrefPraise; label: string }[] = [
  { v: 'more', label: '多め' },
  { v: 'normal', label: '普通' },
  { v: 'less', label: '少なめ' },
];

function getRelationshipStage(sessions: number): { label: string; min: number; max: number } {
  if (sessions < 5) return { label: '出会ったばかり', min: 0, max: 5 };
  if (sessions < 20) return { label: 'Getting to know you', min: 5, max: 20 };
  if (sessions < 50) return { label: 'Personalized Teacher', min: 20, max: 50 };
  return { label: 'Deeply Personalized', min: 50, max: 100 };
}

function getAdaptMessages(prefs: AITeacherPrefs): string[] {
  const msgs: string[] = [];
  if (prefs.explanation === 'short') msgs.push('説明を短めにします');
  else if (prefs.explanation === 'detailed') msgs.push('説明を詳しくします');
  if (prefs.cue === 'minimal') msgs.push('声かけを必要最小限にします');
  else if (prefs.cue === 'more') msgs.push('声かけを多めにします');
  if (prefs.praise === 'more') msgs.push('励ましを少し多めにします');
  else if (prefs.praise === 'less') msgs.push('励ましを控えめにします');
  return msgs;
}

// ── Safety check ──

function isSafetyBlocked(safetyState: SafetyState | undefined | null): boolean {
  return safetyState === 'stop_and_refer';
}

function isSafetyCautioned(safetyState: SafetyState | undefined | null): boolean {
  return safetyState === 'caution';
}

// ── Rule-based chat (safety-modified) ──

interface ChatMessage {
  role: 'user' | 'teacher';
  text: string;
  isSafety?: boolean;
  knowledgeUsed?: boolean;
}

function buildLocalContextFast(growth: AITeacherGrowth, sessionIntent?: ConversationContext, todayContext?: TodayContext): TeacherContext {
  const persona = loadPersona();
  const localLogs = loadLocalPracticeLogs();
  const records = localLogs.map((l) => ({
    practice_type: l.practice_type,
    duration_min: l.duration_min,
    created_at: l.created_at,
  }));
  const typeCounts: Record<string, number> = {};
  let totalDuration = 0;
  let durationCount = 0;
  let lastPracticeAt: string | undefined;
  for (const r of records) {
    typeCounts[r.practice_type] = (typeCounts[r.practice_type] ?? 0) + 1;
    if (r.duration_min) { totalDuration += r.duration_min; durationCount++; }
    if (!lastPracticeAt || r.created_at > lastPracticeAt) lastPracticeAt = r.created_at;
  }
  const favoriteTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  const averageDuration = durationCount > 0 ? Math.round(totalDuration / durationCount) : undefined;
  return {
    practiceSummary: {
      totalSessions: records.length,
      streakDays: growth.streakDays,
      recentTypes: records.slice(0, 10).map((r) => r.practice_type),
      favoriteTypes: favoriteTypes.length > 0 ? favoriteTypes : growth.favoriteTypes,
      averageDuration,
      lastPracticeAt,
    },
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
    sessionIntent: sessionIntent ? {
      requestedMinutes: sessionIntent.requestedMinutes,
      requestedStyle: sessionIntent.requestedStyle,
      requestedType: sessionIntent.requestedType,
      userMessage: sessionIntent.lastUserMessage,
    } : undefined,
    memorySummary: summarizeMemory(loadLocalMemory()),
    todayContext: todayContext ?? emptyTodayContext(),
  };
}

// ── Component ──

function resolvePosesFromProgram(prog: TodayProgram | null): ConcretePose[] {
  if (!prog || !prog.items || prog.items.length === 0) return [];
  const poses: ConcretePose[] = [];
  for (const item of prog.items) {
    if (item.practiceId) {
      const pose = getPoseById(item.practiceId);
      if (pose) {
        poses.push({ ...pose, defaultMinutes: item.durationMin });
        continue;
      }
    }
    const resolved = resolveConcretePoses(item.name);
    if (resolved.length > 0) {
      for (const p of resolved) {
        poses.push({ ...p, defaultMinutes: item.durationMin });
      }
    }
  }
  return poses;
}

export function MyAITeacherPage({ onBackHome, onOpenDiagnosis, onOpenMyPage, onOpenProYoga, latestDiagnosis, initialMinutes, entryTarget }: MyAITeacherPageProps) {
  const auth = useAuth();
  const [step, setStep] = useState<StepId>('home');
  const [persona, setPersona] = useState<AITeacherPersona | null>(null);
  const [program, setProgram] = useState<TodayProgram | null>(null);
  const [growth, setGrowth] = useState<AITeacherGrowth>(loadGrowth());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [practiceActive, setPracticeActive] = useState(false);
  const [practiceType, setPracticeType] = useState<'asana' | 'pranayama' | 'dhyana' | null>(null);
  const [moodBefore, setMoodBefore] = useState<string>('');
  const [moodAfter, setMoodAfter] = useState<string>('');
  const [practiceNote, setPracticeNote] = useState<string>('');
  const [cloudLogs, setCloudLogs] = useState<PracticeLog[]>([]);
  const [practiceDuration, setPracticeDuration] = useState<number>(10);
  const [localLogs, setLocalLogs] = useState<LocalPracticeLog[]>(loadLocalPracticeLogs());
  const [saveStatus, setSaveStatus] = useState<string>('');

  const practiceCount = auth.user ? cloudLogs.length : localLogs.length;
  const [conversationContext, setConversationContext] = useState<ConversationContext>({});

  useEffect(() => {
    if (initialMinutes) {
      setConversationContext((prev) => ({ ...prev, requestedMinutes: initialMinutes }));
    }
  }, [initialMinutes]);
  const [todayPlan, setTodayPlan] = useState<TodayPlanWithKnowledge | null>(null);
  const [knowledgeExplanation, setKnowledgeExplanation] = useState<KnowledgeExplanation | null>(null);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [sessionSafetyBlocked, setSessionSafetyBlocked] = useState(false);
  const testPlanParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('testPlan') : null;
  const testPlanMode = testPlanParam === 'knowledge-k6';
  const testPlanCompositeMode = testPlanParam === 'knowledge-k6-composite';
  const [teacherContext, setTeacherContext] = useState<TeacherContext | null>(null);
  const [todayContext, setTodayContext] = useState<TodayContext>(emptyTodayContext());
  const [showTodayCheck, setShowTodayCheck] = useState(false);
  const [todayCheckResult, setTodayCheckResult] = useState<'none' | 'mild' | 'pain' | 'unknown' | null>(null);
  const [memoryLoaded, setMemoryLoaded] = useState(false);
  const [memoryConcerns, setMemoryConcerns] = useState<string[]>([]);
  const todayCheckRef = useRef<HTMLDivElement>(null);
  const [nextSuggestion, setNextSuggestion] = useState<NextSuggestion | null>(loadNextSuggestion());
  const [showContextSignals, setShowContextSignals] = useState(false);
  const [showExampleGuide, setShowExampleGuide] = useState(false);
  const [concretePosesOverride, setConcretePosesOverride] = useState<ConcretePose[] | null>(null);
  const concretePoses = useMemo(() => {
    if (concretePosesOverride) return concretePosesOverride;
    return resolvePosesFromProgram(program);
  }, [concretePosesOverride, program]);
  const [currentPoseIdx, setCurrentPoseIdx] = useState(0);
  const [posePhase, setPosePhase] = useState<'list' | 'guide' | 'active' | 'done'>('list');
  const [poseElapsedTotal, setPoseElapsedTotal] = useState(0);
  const poseGuideRef = useRef<HTMLDivElement>(null);
  const [showMemorySummary, setShowMemorySummary] = useState(false);
  const [dryRunInput, setDryRunInput] = useState('');
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [dryRunLoading, setDryRunLoading] = useState(false);
  const dryRunMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('testPlan') === 'llm-dry-run';
  const guideVideoRef = useRef<HTMLVideoElement>(null);
  const practiceVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (auth.user) {
      getPracticeLogs(auth.user.id).then(({ data }) => {
        if (data) setCloudLogs(data);
      });
    }
  }, [auth.user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setMemoryLoaded(false);
      const entries = await getMemory(auth.user?.id ?? null);
      if (cancelled) return;
      const summary = summarizeMemory(entries);
      setMemoryConcerns(summary.activeConcerns);
      setMemoryLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [auth.user]);

  // Persona form state
  const [editingPersona, setEditingPersona] = useState(false);
  const [formName, setFormName] = useState('');
  const [formAvatar, setFormAvatar] = useState('🧘');
  const [formPersonality, setFormPersonality] = useState('gentle');
  const [formSpecialty, setFormSpecialty] = useState('pranayama');
  const [formUiLang, setFormUiLang] = useState<LangCode>('ja');
  const [formTeachingLang, setFormTeachingLang] = useState<LangCode>('ja');
  const [demoMsgIdx, setDemoMsgIdx] = useState(0);
  const [chatTyping, setChatTyping] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<PracticeGuide | null>(null);
  const [practicePhase, setPracticePhase] = useState<'guide' | 'active' | 'done'>('guide');
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPhaseIdx, setTimerPhaseIdx] = useState(0);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [timerRound, setTimerRound] = useState(1);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [simpleTimerRemaining, setSimpleTimerRemaining] = useState(0);
  const [practiceAborted, setPracticeAborted] = useState(false);
  const [practiceSessionId, setPracticeSessionId] = useState<string | null>(null);
  const [isSavingPractice, setIsSavingPractice] = useState(false);
  const [voiceGuideOn, setVoiceGuideOn] = useState(true);
  const [practicePaused, setPracticePaused] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const voiceGuideRef = useRef<VoiceGuideSequence | null>(null);
  const firedCuesRef = useRef<Set<string>>(new Set());
  const lastBoxPhaseRef = useRef<string>('');
  const ttsAvailable = isTTSAvailable();
  const voiceEngine = getVoiceGuideEngine();
  const [engineType, setEngineType] = useState<EngineType>(voiceEngine.type);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('stopped');
  const [voiceName, setVoiceName] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceDiag, setVoiceDiag] = useState<{ voicesCount: number; jaCount: number; lastEvent: string | null; errorCode: string | null; speaking: boolean; pending: boolean; paused: boolean }>({ voicesCount: 0, jaCount: 0, lastEvent: null, errorCode: null, speaking: false, pending: false, paused: false });

  const refreshVoiceDiag = useCallback(() => {
    const synth = isTTSAvailable() ? window.speechSynthesis : null;
    if (synth) {
      const voices = synth.getVoices();
      const jaCount = voices.filter((v) => v.lang === 'ja-JP' || v.lang.startsWith('ja')).length;
      setVoiceDiag((prev) => ({
        voicesCount: voices.length,
        jaCount,
        lastEvent: prev.lastEvent,
        errorCode: prev.errorCode,
        speaking: synth.speaking,
        pending: synth.pending,
        paused: synth.paused,
      }));
    }
    setEngineType(voiceEngine.type);
    const s = voiceEngine.getStatus();
    setVoiceStatus(s.status);
    setVoiceName(s.voiceName);
    setVoiceError(s.error);
  }, [voiceEngine]);

  const handleTestVoice = useCallback(() => {
    voiceEngine.speak('AI先生の音声ガイドです。');
    setVoiceDiag((prev) => ({ ...prev, lastEvent: 'speak', errorCode: null }));
    refreshVoiceDiag();
  }, [voiceEngine, refreshVoiceDiag]);

  useEffect(() => {
    refreshVoiceDiag();
    if (!isTTSAvailable()) return;
    const handler = () => refreshVoiceDiag();
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', handler);
  }, [refreshVoiceDiag]);

  useEffect(() => {
    preloadVoiceKeys(ALL_VOICE_KEYS);
  }, []);

  useEffect(() => {
    const p = loadPersona();
    setPersona(p);
    if (p) {
      setFormName(p.name);
      setFormAvatar(p.avatar);
      setFormPersonality(p.personality);
      setFormSpecialty(p.specialty);
      setFormUiLang(p.uiLanguage);
      setFormTeachingLang(p.teachingLanguage);
    }
    const savedSession = loadTodayContextSession<TodayContext>();
    const savedTodayCtx = savedSession?.todayContext ?? null;
    const restoredCheckResult = savedSession?.todayCheckResult ?? null;
    if (savedTodayCtx) {
      setTodayContext(savedTodayCtx);
      if (restoredCheckResult === 'none' || restoredCheckResult === 'mild' || restoredCheckResult === 'pain' || restoredCheckResult === 'unknown') {
        setTodayCheckResult(restoredCheckResult);
      }
    }
    const saved = loadTodayProgram();
    if (saved) {
      const restoredSig = computeTodayContextSignature({
        todayCheckResult: restoredCheckResult as 'none' | 'pain' | 'unknown' | null,
        requestedMode: savedTodayCtx?.requestedMode ?? null,
        selectionResolved: savedTodayCtx?.selectionResolved ?? false,
        availableMinutes: savedTodayCtx?.availableMinutes ?? null,
        intensityPreference: savedTodayCtx?.intensityPreference ?? null,
        mood: savedTodayCtx?.mood ?? null,
      });
      if (saved.todayContextSignature && saved.todayContextSignature === restoredSig) {
        setProgram(saved);
      } else {
        try { localStorage.removeItem('todayYoga'); } catch { /* ignore */ }
      }
    }
  }, []);

  useEffect(() => {
    saveTodayContextSession(todayContext, todayCheckResult);
  }, [todayContext, todayCheckResult]);

  // Demo feedback rotation during active practice (adapted by prefs)
  useEffect(() => {
    if (!cameraOn || !practiceActive) return;
    const lang = persona?.teachingLanguage ?? 'ja';
    let msgs = [...(DEMO_FEEDBACK[lang] ?? DEMO_FEEDBACK.ja)];
    if (growth.prefs.cue === 'minimal') {
      msgs = msgs.filter((_, i) => i % 2 === 0);
    }
    if (growth.prefs.cue === 'more') {
      msgs = [...msgs, 'その調子です', 'ゆっくり深く'];
    }
    if (msgs.length === 0) msgs = [DEMO_FEEDBACK.ja[0]];
    const intervalMs = growth.prefs.cue === 'minimal' ? 8000 : growth.prefs.cue === 'more' ? 3500 : 5000;
    const interval = setInterval(() => {
      setDemoMsgIdx((prev) => (prev + 1) % msgs.length);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [cameraOn, practiceActive, persona, growth.prefs.cue]);

  // Camera stream acquisition — only on cameraOn toggle or facing mode switch
  useEffect(() => {
    if (!cameraOn) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: cameraFacingMode }, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const target = practicePhase === 'active' ? practiceVideoRef.current : guideVideoRef.current;
        if (target) {
          target.srcObject = stream;
          target.play().catch(() => {});
        }
      } catch {
        if (!cancelled) setCameraOn(false);
      }
    })();
    return () => { cancelled = true; };
  }, [cameraOn, cameraFacingMode]);

  // Re-attach stream when phase changes (video element swaps)
  useEffect(() => {
    if (!streamRef.current) return;
    const target = practicePhase === 'active' ? practiceVideoRef.current : guideVideoRef.current;
    if (target && target.srcObject !== streamRef.current) {
      target.srcObject = streamRef.current;
      target.play().catch(() => {});
    }
  }, [practicePhase]);

  // Stop stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const safetyBlocked = isSafetyBlocked(latestDiagnosis?.safety_state) || sessionSafetyBlocked;
  const safetyCautioned = isSafetyCautioned(latestDiagnosis?.safety_state);

  const planGateVerdict: PlanGateVerdict = getPlanGate({
    memoryLoaded,
    hasMemoryConcerns: memoryConcerns.length > 0,
    todayCheckResult,
    requestedMode: todayContext.requestedMode,
    safetyBlocked,
    selectionResolved: todayContext.selectionResolved,
  });

  const planGenerationBlocked = !gateVerdictAllowsGeneration(planGateVerdict);

  const practiceEntryVerdict: PracticeEntryVerdict = getPracticeEntryGate({
    memoryLoaded,
    hasMemoryConcerns: memoryConcerns.length > 0,
    todayCheckResult,
    selectionResolved: todayContext.selectionResolved,
    safetyBlocked,
  });

  const practiceEntryBlocked = !practiceEntryAllows(practiceEntryVerdict);

  const todayContextSignature = computeTodayContextSignature({
    todayCheckResult,
    requestedMode: todayContext.requestedMode,
    selectionResolved: todayContext.selectionResolved,
    availableMinutes: todayContext.availableMinutes,
    intensityPreference: todayContext.intensityPreference,
    mood: todayContext.mood,
  });

  const planIsStale = isPlanStale(program?.todayContextSignature, todayContextSignature);

  const invalidatePlan = useCallback(() => {
    setProgram(null);
    setConcretePosesOverride(null);
    setCurrentPoseIdx(0);
    setPosePhase('list');
    setPracticePhase('guide');
    try { localStorage.removeItem('todayYoga'); } catch { /* ignore */ }
  }, []);

  const canEnterPracticeStep = useCallback(() => {
    if (safetyBlocked || practiceEntryBlocked) return false;
    if (planIsStale) return false;
    if (!program) return false;
    return true;
  }, [safetyBlocked, practiceEntryBlocked, planIsStale, program]);

  const handleShowTodayCheck = useCallback(() => {
    setShowTodayCheck(true);
    setTimeout(() => {
      todayCheckRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  }, []);

  const handleGenerateProgram = useCallback(async (overrideToday?: TodayContext) => {
    if (safetyBlocked) return;
    const effectiveToday = overrideToday ?? todayContext;
    const verdict = getPlanGate({
      memoryLoaded,
      hasMemoryConcerns: memoryConcerns.length > 0,
      todayCheckResult: effectiveToday.todayPain ? 'pain' : todayCheckResult,
      requestedMode: effectiveToday.requestedMode,
      safetyBlocked,
      selectionResolved: effectiveToday.selectionResolved,
    });
    if (!gateVerdictAllowsGeneration(verdict)) return;
    const ctx = await buildTeacherContext(auth.user?.id ?? null, growth, conversationContext, effectiveToday);
    setTeacherContext(ctx);
    let plan;
    if (testPlanMode) {
      plan = {
        title: 'K6受入テストプラン',
        summary: 'Knowledge連携確認用テストプラン',
        totalMinutes: 7,
        items: [
          { type: 'pranayama' as const, name: '腹式呼吸', minutes: 3 },
          { type: 'asana' as const, name: 'ブジャンガーサナ', minutes: 3 },
          { type: 'dhyana' as const, name: '瞑想', minutes: 1 },
        ],
        adaptationNotes: [],
        sourceSignals: ['testPlan=knowledge-k6'],
      };
    } else if (testPlanCompositeMode) {
      plan = {
        title: 'K6.3.1複合practiceテストプラン',
        summary: '複合practice 2リンク確認用テストプラン',
        totalMinutes: 7,
        items: [
          { type: 'asana' as const, name: '山のポーズから立ち木のポーズ', minutes: 3 },
          { type: 'pranayama' as const, name: '腹式呼吸', minutes: 3 },
          { type: 'dhyana' as const, name: '瞑想', minutes: 1 },
        ],
        adaptationNotes: [],
        sourceSignals: ['testPlan=knowledge-k6-composite'],
      };
    } else {
      plan = generateTodayPlan(ctx);
    }
    const planWithKnowledge = await attachKnowledgeToTodayPlan(plan);
    setTodayPlan(planWithKnowledge);
    const contextSnapshot = effectiveToday;
    const snapshotSignature = computeTodayContextSignature({
      todayCheckResult: contextSnapshot.todayPain ? 'pain' : todayCheckResult,
      requestedMode: contextSnapshot.requestedMode,
      selectionResolved: contextSnapshot.selectionResolved,
      availableMinutes: contextSnapshot.availableMinutes,
      intensityPreference: contextSnapshot.intensityPreference,
      mood: contextSnapshot.mood,
    });
    const newProgram: TodayProgram = {
      items: plan.items.map((i) => ({ name: i.name, type: i.type, durationMin: i.minutes, practiceId: i.practiceId })),
      generatedAt: new Date().toISOString(),
      basedOn: (testPlanMode || testPlanCompositeMode) ? 'default' : (ctx.practiceSummary.totalSessions > 0 ? 'history' : 'default'),
      todayContextSignature: snapshotSignature,
    };
    setProgram(newProgram);
    saveTodayProgram(newProgram);
    setConcretePosesOverride(null);
    setCurrentPoseIdx(0);
    setPosePhase('list');
    setStep('step2');
  }, [safetyBlocked, auth.user, growth, conversationContext, testPlanMode, testPlanCompositeMode, todayContext, todayCheckResult]);

  const handleSavePersona = useCallback(() => {
    const newPersona: AITeacherPersona = {
      name: formName || 'MAYA',
      avatar: formAvatar,
      personality: formPersonality,
      specialty: formSpecialty,
      uiLanguage: formUiLang,
      teachingLanguage: formTeachingLang,
      createdAt: persona?.createdAt ?? new Date().toISOString(),
    };
    savePersona(newPersona);
    setPersona(newPersona);
    setEditingPersona(false);
  }, [formName, formAvatar, formPersonality, formSpecialty, formUiLang, formTeachingLang, persona]);

  const handleDryRun = useCallback(async () => {
    if (!dryRunInput.trim()) return;
    setDryRunLoading(true);
    setDryRunResult(null);
    const dryRunPersona: LLMPersona | null = persona ? {
      name: persona.name,
      personality: persona.personality,
      specialty: persona.specialty,
      teachingLanguage: persona.teachingLanguage,
    } : null;
    const dryRunSessionContext: LLMSessionContext = {
      requestedMinutes: conversationContext.requestedMinutes ?? null,
      requestedType: conversationContext.requestedType ?? null,
      requestedStyle: conversationContext.requestedStyle ?? null,
      explanationPreference: growth.prefs.explanation,
      cuePreference: growth.prefs.cue,
      praisePreference: growth.prefs.praise,
      practiceSummary: {
        totalSessions: growth.sessions,
        favoriteTypes: growth.favoriteTypes,
        preferredStyle: growth.preferredStyle,
      },
    };
    const result = await runLLMRequestDryRun({
      userMessage: dryRunInput.trim(),
      isLoggedIn: !!auth.user,
      persona: dryRunPersona,
      sessionContext: dryRunSessionContext,
    });
    setDryRunResult(result);
    setDryRunLoading(false);
  }, [dryRunInput, auth.user, persona, growth, conversationContext]);

  const handleSendChat = useCallback(() => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = { role: 'user', text: chatInput };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setChatTyping(true);
    const delay = 150 + Math.random() * 150;
    setTimeout(async () => {
      const ctx = teacherContext ?? buildLocalContextFast(growth, conversationContext, todayContext);
      const response = await generateTeacherResponse(ctx, userMsg.text, conversationContext);
      if (response.updatedContext) {
        setConversationContext(response.updatedContext);
      }
      const reply: ChatMessage = {
        role: 'teacher',
        text: response.text,
        isSafety: response.isSafety,
        knowledgeUsed: response.knowledgeUsed,
      };
      setChatMessages((prev) => [...prev, reply]);
      setChatTyping(false);
      if (response.isSafety) {
        setSessionSafetyBlocked(true);
      }
    }, delay);
  }, [chatInput, persona, teacherContext, growth, conversationContext]);

  useEffect(() => {
    if (!timerRunning || !selectedGuide?.hasTimer) return;
    const phases = selectedGuide.timerPhases!;
    const phase = phases[timerPhaseIdx];
    if (!phase) return;

    setTimerRemaining(phase.seconds);
    const tick = window.setInterval(() => {
      setTimerRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(tick);
          const nextIdx = timerPhaseIdx + 1;
          if (nextIdx >= phases.length) {
            const nextRound = timerRound + 1;
            if (nextRound > (selectedGuide.timerRounds ?? 1)) {
              setTimerRunning(false);
              setTimerPhaseIdx(0);
              setTimerRound(1);
              if (sessionStartedAt) {
                const elapsedSec = Math.max(1, Math.round((Date.now() - sessionStartedAt) / 1000));
                setPoseElapsedTotal((t) => t + elapsedSec);
                const elapsedMin = Math.max(1, Math.round(elapsedSec / 60));
                setPracticeDuration(elapsedMin);
              }
              setPracticePhase('done');
              voiceEngine.stop();
              setCurrentSubtitle('');
            } else {
              setTimerRound(nextRound);
              setTimerPhaseIdx(0);
            }
          } else {
            setTimerPhaseIdx(nextIdx);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(tick);
  }, [timerRunning, timerPhaseIdx, timerRound, selectedGuide]);

  useEffect(() => {
    if (!timerRunning || selectedGuide?.hasTimer || practicePhase !== 'active') return;
    setSimpleTimerRemaining(practiceDuration * 60);
    const tick = window.setInterval(() => {
      setSimpleTimerRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(tick);
          setTimerRunning(false);
          if (sessionStartedAt) {
            const elapsedSec = Math.max(1, Math.round((Date.now() - sessionStartedAt) / 1000));
            setPoseElapsedTotal((t) => t + elapsedSec);
            const elapsedMin = Math.max(1, Math.round(elapsedSec / 60));
            setPracticeDuration(elapsedMin);
          }
          setPracticePhase('done');
          voiceEngine.stop();
          setCurrentSubtitle('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(tick);
  }, [timerRunning, selectedGuide, practicePhase, practiceDuration]);

  const fireCue = useCallback((text: string) => {
    if (!voiceGuideOn) return;
    if (firedCuesRef.current.has(text)) return;
    firedCuesRef.current.add(text);
    voiceEngine.speak(text);
    setCurrentSubtitle(text);
  }, [voiceGuideOn, voiceEngine]);

  useEffect(() => {
    if (!timerRunning || practicePaused || !voiceGuideOn) return;
    const seq = voiceGuideRef.current;
    if (!seq) return;
    if (selectedGuide?.hasTimer) {
      const phase = selectedGuide.timerPhases![timerPhaseIdx];
      if (!phase) return;
      const phaseLabel = phase.label ?? '';
      if (phaseLabel !== lastBoxPhaseRef.current) {
        lastBoxPhaseRef.current = phaseLabel;
        const cue = BOX_BREATHING_PHASE_CUES[phaseLabel];
        if (cue) fireCue(cue);
      }
    } else {
      const remaining = simpleTimerRemaining;
      for (const cue of REMAINING_CUES) {
        if (remaining === cue.atRemaining) {
          fireCue(cue.text);
          break;
        }
      }
      for (const cue of seq.cues) {
        if (remaining === seq.totalSeconds - cue.atSeconds && cue.atSeconds > 0) {
          fireCue(cue.text);
          break;
        }
      }
      if (remaining === 0 && seq.cues.length > 0) {
        const lastCue = seq.cues[seq.cues.length - 1];
        fireCue(lastCue.text);
      }
    }
  }, [timerRunning, practicePaused, voiceGuideOn, simpleTimerRemaining, timerPhaseIdx, selectedGuide, fireCue]);

  const handleAbortPractice = useCallback(() => {
    setTimerRunning(false);
    setTimerPhaseIdx(0);
    setTimerRound(1);
    setSimpleTimerRemaining(0);
    setPracticeAborted(true);
    setPracticeActive(false);
    setPracticePhase('guide');
    setPosePhase('guide');
    setPoseElapsedTotal(0);
    setSelectedGuide(null);
    setPracticeType(null);
    setMoodBefore('');
    setMoodAfter('');
    setPracticeNote('');
    setSessionStartedAt(null);
    setPracticeSessionId(null);
    setPracticePaused(false);
    voiceEngine.stop();
    setCurrentSubtitle('');
  }, [voiceEngine]);

  const startVoiceGuide = useCallback((pose: ConcretePose) => {
    if (!voiceGuideOn) return;
    const seq = buildVoiceGuide(pose);
    voiceGuideRef.current = seq;
    firedCuesRef.current = new Set();
    lastBoxPhaseRef.current = '';
    const allTexts = seq.cues.map((c) => c.text).concat(REMAINING_CUES.map((c) => c.text));
    preloadVoicePhrases(allTexts);
    if (seq.cues.length > 0) {
      const firstCue = seq.cues[0];
      firedCuesRef.current.add(firstCue.text);
      voiceEngine.speak(firstCue.text);
      setCurrentSubtitle(firstCue.text);
    }
  }, [voiceGuideOn, voiceEngine]);

  const handlePausePractice = useCallback(() => {
    setTimerRunning(false);
    setPracticePaused(true);
    voiceEngine.pause();
  }, [voiceEngine]);

  const handleResumePractice = useCallback(() => {
    setTimerRunning(true);
    setPracticePaused(false);
    voiceEngine.resume();
  }, [voiceEngine]);

  const handleCompletePractice = useCallback(async () => {
    if (!practiceType || practicePhase !== 'done' || practiceAborted || isSavingPractice) return;
    setIsSavingPractice(true);
    const practiceName = selectedGuide?.name ?? program?.items.find((i) => i.type === practiceType)?.name ?? '実践';
    const totalElapsedSec = poseElapsedTotal > 0 ? poseElapsedTotal : (sessionStartedAt ? Math.max(1, Math.round((Date.now() - sessionStartedAt) / 1000)) : practiceDuration * 60);
    const autoDuration = Math.max(1, Math.round(totalElapsedSec / 60));
    const logParams = {
      practice_type: practiceType,
      practice_name: practiceName,
      duration_min: autoDuration,
      mood_before: moodBefore || null,
      mood_after: moodAfter || null,
      note: practiceNote || null,
      ai_teacher_used: true,
      practice_session_id: practiceSessionId ?? undefined,
    };

    if (auth.user) {
      const { error } = await savePracticeLog(auth.user.id, auth.privacy, logParams);
      if (error) {
        setSaveStatus('クラウド保存に失敗しました。ローカルに保存します。');
        saveLocalPracticeLog(logParams);
      } else {
        setSaveStatus('クラウドに保存しました');
      }
    } else {
      saveLocalPracticeLog(logParams);
      setSaveStatus('ローカルに保存しました（ログインするとクラウド保存できます）');
    }

    // Update growth (non-sensitive)
    const newGrowth: AITeacherGrowth = {
      ...growth,
      sessions: growth.sessions + 1,
      favoriteTypes: updateFavoriteTypes(growth.favoriteTypes, practiceType),
      preferredStyle: growth.preferredStyle ?? formSpecialty,
      relationshipLevel: Math.min(10, growth.relationshipLevel + 0.5),
      understandingLevel: Math.min(10, growth.understandingLevel + 0.3),
      facts: updateFacts(growth.facts, practiceType, practiceDuration),
      streakDays: updateStreak(growth.streakDays, growth.lastPracticeDate),
      lastPracticeDate: new Date().toISOString().slice(0, 10),
    };
    saveGrowth(newGrowth);
    setGrowth(newGrowth);
    setLocalLogs(loadLocalPracticeLogs());

    // Generate next practice suggestion (non-sensitive)
    const ctx = teacherContext ?? buildLocalContextFast(newGrowth, conversationContext);
    const suggestion = generateNextSuggestion(ctx, practiceType, practiceDuration);
    const nextSug: NextSuggestion = {
      text: suggestion.text,
      suggestedType: suggestion.suggestedType,
      suggestedDuration: suggestion.suggestedDuration,
      createdAt: new Date().toISOString(),
    };
    saveNextSuggestion(nextSug);
    setNextSuggestion(nextSug);

    // Rebuild context for next session
    const updatedCtx = await buildTeacherContext(auth.user?.id ?? null, newGrowth, {});
    setTeacherContext(updatedCtx);
    setConversationContext({});

    if (auth.user) {
      const { data: refetched } = await getPracticeLogs(auth.user.id);
      if (refetched) setCloudLogs(refetched);
    }

    setPracticeActive(false);
    setPracticeType(null);
    setMoodBefore('');
    setMoodAfter('');
    setPracticeNote('');
    setSelectedGuide(null);
    setPracticePhase('guide');
    setPosePhase('list');
    setPoseElapsedTotal(0);
    setTimerRunning(false);
    setTimerPhaseIdx(0);
    setTimerRound(1);
    setPracticePaused(false);
    voiceEngine.stop();
    setCurrentSubtitle('');
    setSessionStartedAt(null);
    setSimpleTimerRemaining(0);
    setPracticeAborted(false);
    setPracticeSessionId(null);
    setIsSavingPractice(false);
    setStep('step7');
  }, [practiceType, program, practiceDuration, moodBefore, moodAfter, practiceNote, auth, growth, formSpecialty, teacherContext, conversationContext, selectedGuide, practicePhase, practiceAborted, sessionStartedAt, isSavingPractice, practiceSessionId]);

  const steps: Array<{ id: StepId; label: string; n: string }> = [
    { id: 'step1', label: '今の状態', n: '1' },
    { id: 'step2', label: '今日のプログラム', n: '2' },
    { id: 'step3', label: '保存', n: '3' },
    { id: 'step4', label: 'AI先生設定', n: '4' },
    { id: 'step5', label: '対話', n: '5' },
    { id: 'step6', label: '実践', n: '6' },
    { id: 'step7', label: '記録', n: '7' },
    { id: 'step8', label: '先生の成長', n: '8' },
  ];

  const isEventDemo = entryTarget === 'event-demo';

  const handleEventDemoStart = useCallback(() => {
    if (safetyBlocked || !practiceEntryAllows(practiceEntryVerdict)) return;
    setConcretePosesOverride(getDefaultPlanPoses());
    setPracticeType('asana');
    setSelectedGuide(null);
    setPracticePhase('guide');
    setPosePhase('guide');
    setCurrentPoseIdx(0);
    setStep('step6');
    setTimeout(() => {
      poseGuideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }, [safetyBlocked, practiceEntryVerdict]);

  return (
    <div className="page-shell ai-teacher-shell">
      {isEventDemo && (
        <section className="panel event-demo-hero">
          <span className="eyebrow">Yoga AI / イベント体験</span>
          <h2>AI先生を体験してみよう</h2>
          <p>山のポーズ・呼吸・瞑想をAI先生と一緒に数分で体験できます。</p>
          <button className="primary-button event-demo-start-btn" onClick={handleEventDemoStart} disabled={safetyBlocked || practiceEntryBlocked}>
            {safetyBlocked ? '安全のため現在制限されています' : 'AI先生デモを始める'}
          </button>
        </section>
      )}
      <section className="hero-panel compact-hero ai-teacher-hero">
        <div className="ai-teacher-hero-main">
          <div className="ai-teacher-hero-top-bar">
            <span className="eyebrow">AI先生 / My AI Teacher</span>
            <button className="ghost-button ai-teacher-back-btn" onClick={onBackHome}>TOPへ戻る</button>
          </div>
          <h2>あなたのAI先生</h2>
          <p>AI先生が、今日の状態に合わせてヨガ・呼吸・瞑想を一緒にガイドします。</p>
          <p className="ai-teacher-brand-note">Yoga Knowledgeを基礎に、アーサナ・呼吸法・瞑想を流れとして分かりやすくガイドするAI先生です。使うほど、あなたの好みや継続傾向を覚えていきます。</p>
          <p className="ai-teacher-camera-hint-home">お手本画像を見ながら、カメラを鏡として自分の動きも確認できます。</p>
          {persona && (
            <div className="ai-teacher-hero-teacher">
              <span className="ai-teacher-hero-avatar">{persona.avatar}</span>
              <div className="ai-teacher-hero-teacher-info">
                <strong>{persona.name}</strong>
                <span>{PERSONALITY_OPTIONS.find((p) => p.v === persona.personality)?.label ?? persona.personality}</span>
                <span>{specialtyLabel(persona.specialty)}</span>
                <span>指導言語: {LANG_OPTIONS.find((l) => l.v === persona.teachingLanguage)?.label ?? persona.teachingLanguage}</span>
              </div>
            </div>
          )}
          <div className="ai-teacher-hero-cta-row">
            {planGateVerdict === 'BLOCK_LOADING' && (
              <span className="ai-teacher-memory-loading-hint">{gateStateMessage('LOADING_MEMORY')}</span>
            )}
            {planGateVerdict === 'REQUIRE_TODAY_CHECK' && (
              <button className="primary-button" onClick={() => setShowTodayCheck(true)}>
                今日の状態を確認する
              </button>
            )}
            {gateVerdictAllowsGeneration(planGateVerdict) && (
              <button className="primary-button" onClick={() => void handleGenerateProgram()} disabled={safetyBlocked}>
                {safetyBlocked ? '安全のため現在プログラム生成を制限しています' : '今日のヨガ'}
              </button>
            )}
            {planGateVerdict === 'BLOCK_SAFETY' && (
              <span className="ai-teacher-safety-gate-text">安全のため実践を制限しています</span>
            )}
            <button className="secondary-button" onClick={() => setStep('step5')}>話しかける</button>
            <button className="ghost-button" onClick={() => setStep('step4')}>
              {persona ? '先生を育てる / 設定' : 'AI先生をつくる'}
            </button>
          </div>
          {showTodayCheck && todayCheckResult === null && !todayContext.selectionResolved && memoryConcerns.length > 0 && (
            <div className="ai-teacher-today-check" ref={todayCheckRef}>
              <p>以前、{memoryConcerns[0].split('に')[0]}に不安があると教えてもらっています。今日の状態はいかがですか？</p>
                <div className="ai-teacher-today-check-options">
                  <button className="secondary-button" onClick={() => {
                    invalidatePlan();
                    const updated = { ...todayContext, todayConcern: null, todayPain: null, requestedMode: 'normal' as RequestedMode, selectionResolved: true };
                    setTodayContext(updated);
                    setTodayCheckResult('none');
                    setShowTodayCheck(false);
                    handleGenerateProgram(updated);
                  }}>今日は気にならない</button>
                  <button className="secondary-button" onClick={() => {
                    invalidatePlan();
                    const updated = { ...todayContext, todayConcern: '少し気になる', todayPain: null, requestedMode: 'gentle' as RequestedMode, selectionResolved: true };
                    setTodayContext(updated);
                    setTodayCheckResult('mild');
                    setShowTodayCheck(false);
                    handleGenerateProgram(updated);
                  }}>少し気になる</button>
                  <button className="secondary-button" onClick={() => {
                    invalidatePlan();
                    const updated = { ...todayContext, todayPain: '痛みがある', todayConcern: null, requestedMode: null, selectionResolved: false };
                    setTodayContext(updated);
                    setTodayCheckResult('pain');
                    setShowTodayCheck(false);
                  }}>痛みがある</button>
                  <button className="ghost-button" onClick={() => {
                    setTodayCheckResult('unknown');
                    setShowTodayCheck(false);
                  }}>答えたくない</button>
                </div>
              </div>
          )}
          {todayCheckResult === 'pain' && (
            <div className="ai-teacher-today-check ai-teacher-safety-gate" ref={todayCheckRef}>
              <p>今日は痛みがあるとのことなので、AI先生から個別の身体判断やポーズ提案は行いません。無理に実践せず、必要に応じて医療専門家や信頼できる指導者に相談してください。</p>
              <div className="ai-teacher-today-check-options">
                <button className="secondary-button" onClick={() => {
                  setTodayCheckResult(null);
                  setStep('step5');
                }}>一般的な呼吸・瞑想について見る</button>
                <button className="ghost-button" onClick={() => {
                  setTodayCheckResult(null);
                  setStep('home');
                }}>今日は実践しない</button>
              </div>
              <p className="ai-teacher-safety-note" style={{ fontSize: '12px', marginTop: '8px' }}>※呼吸・瞑想も個別治療としては提供しません。</p>
            </div>
          )}
          {todayCheckResult === 'unknown' && (
            <div className="ai-teacher-today-check" ref={todayCheckRef}>
              <p>わかりました。身体の状態を前提にせず、一般的な短い実践をご案内できます。</p>
              <div className="ai-teacher-today-check-options">
                <button className="secondary-button" onClick={() => {
                  invalidatePlan();
                  const updated = { ...todayContext, todayConcern: null, todayPain: null, requestedMode: 'general_short' as RequestedMode, selectionResolved: true };
                  setTodayContext(updated);
                  setShowTodayCheck(false);
                  handleGenerateProgram(updated);
                }}>一般的な短い実践</button>
                <button className="secondary-button" onClick={() => {
                  invalidatePlan();
                  const updated = { ...todayContext, requestedType: null, requestedMode: 'breath_meditation' as RequestedMode, selectionResolved: true, todayConcern: null, todayPain: null };
                  setTodayContext(updated);
                  setShowTodayCheck(false);
                  handleGenerateProgram(updated);
                }}>呼吸・瞑想中心</button>
                <button className="ghost-button" onClick={() => {
                  setTodayCheckResult(null);
                  setStep('home');
                }}>今日はやめておく</button>
              </div>
            </div>
          )}
        </div>
        <div className="ai-teacher-hero-kpis">
          <div className="ai-teacher-hero-kpi">
            <strong>DIAGNOSIS</strong>
            <span>{latestDiagnosis ? '済み' : '未受診'}</span>
          </div>
          <div className="ai-teacher-hero-kpi">
            <strong>PRACTICE</strong>
            <span>{practiceCount}回</span>
          </div>
          <div className="ai-teacher-hero-kpi">
            <strong>MEMORY</strong>
            <span>{growth.facts.length}件</span>
          </div>
        </div>
      </section>

      {/* Step navigation */}
      <nav className="ai-teacher-step-nav">
        <button className={step === 'home' ? 'active' : ''} onClick={() => setStep('home')}>Home</button>
        {steps.map((s) => (
          <button key={s.id} className={step === s.id ? 'active' : ''} onClick={() => setStep(s.id)}>
            <span className="step-num">{s.n}</span> {s.label}
          </button>
        ))}
      </nav>

      {/* Home / shortcut cards */}
      {step === 'home' && (
        <section className="panel ai-teacher-pillars-panel">
          <div className="section-inline-header tight">
            <h3>今日の実践を選ぶ</h3>
          </div>
          <div className="ai-teacher-pillar-grid">
            {(['asana', 'pranayama', 'dhyana'] as const).map((pt) => {
              const labels = { asana: 'Asana', pranayama: 'Pranayama', dhyana: 'Dhyana' };
              const subs = { asana: 'アーサナ', pranayama: '呼吸法', dhyana: '瞑想' };
              const descs = {
                asana: '目的や体調に合わせて、今日のポーズを選んで実践します。',
                pranayama: 'ボックスブリージングなど、リズムを整える呼吸を案内します。',
                dhyana: '1分の静かな時間で、心を落ち着かせます。',
              };
              return (
                <article key={pt} className="ai-teacher-pillar-card"
                  onClick={() => { if (canEnterPracticeStep()) { setPracticeType(pt); setSelectedGuide(null); setPracticePhase('guide'); setStep('step6'); } }}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' && canEnterPracticeStep()) { setPracticeType(pt); setSelectedGuide(null); setPracticePhase('guide'); setStep('step6'); } }}
                  style={(safetyBlocked || practiceEntryBlocked || planIsStale || !program) ? { pointerEvents: 'none', opacity: 0.5 } : undefined}
                >
                  <span className="ai-teacher-pillar-label">{labels[pt]}</span>
                  <strong>{subs[pt]}</strong>
                  <p>{descs[pt]}</p>
                  <button type="button" className="secondary-button ai-teacher-pillar-button" disabled={safetyBlocked}>
                    {safetyBlocked ? '安全確認が必要です' : '実践を始める'}
                  </button>
                </article>
              );
            })}
          </div>
          <div className="ai-teacher-home-actions">
            {planGateVerdict === 'REQUIRE_TODAY_CHECK' && (
              <button className="primary-button" onClick={() => setShowTodayCheck(true)}>
                今日の状態を確認する
              </button>
            )}
            {gateVerdictAllowsGeneration(planGateVerdict) && (
              <button className="primary-button" onClick={() => void handleGenerateProgram()} disabled={safetyBlocked}>
                {safetyBlocked ? '安全のため現在プログラム生成を制限しています' : '今日のプログラムを生成する'}
              </button>
            )}
            {planGateVerdict === 'BLOCK_LOADING' && (
              <span className="ai-teacher-memory-loading-hint">{gateStateMessage('LOADING_MEMORY')}</span>
            )}
            {planGateVerdict === 'BLOCK_SAFETY' && (
              <span className="ai-teacher-safety-gate-text">安全のため実践を制限しています</span>
            )}
            <button className="secondary-button" onClick={() => { if (!safetyBlocked && !practiceEntryBlocked) { setConcretePosesOverride(getDefaultPlanPoses()); setPracticeType('asana'); setSelectedGuide(null); setPracticePhase('guide'); setPosePhase('list'); setStep('step6'); } }} disabled={safetyBlocked || practiceEntryBlocked || (memoryConcerns.length > 0 && (planIsStale || !program))}>
              デモをすぐ始める
            </button>
            {!persona && (
              <button className="ghost-button" onClick={() => setStep('step4')}>AI先生をつくる</button>
            )}
          </div>
          {safetyCautioned && !safetyBlocked && (
            <p className="ai-teacher-safety-note">
              診断結果に注意フラグがあります。無理のない範囲で、一般的な実践のみ行ってください。
            </p>
          )}
          {safetyBlocked && (
            <p className="ai-teacher-safety-note safety-blocked">
              診断結果により個別実践の制限が必要です。専門家にご相談ください。一般的なリラックス呼吸のみ案内できます。
            </p>
          )}
          {todayPlan && todayPlan.sourceSignals.length > 0 && (
            <div className="ai-teacher-context-signals">
              <button className="ai-teacher-collapse-toggle" onClick={() => setShowContextSignals((v) => !v)}>
                先生が今日参考にしたこと {showContextSignals ? '▲' : '▼'}
              </button>
              {showContextSignals && (
                <ul className="ai-teacher-signal-list">
                  {todayPlan.sourceSignals.map((s, idx) => <li key={idx}>{s}</li>)}
                </ul>
              )}
            </div>
          )}
          {nextSuggestion && (
            <div className="ai-teacher-next-suggestion">
              <p>{nextSuggestion.text}</p>
              {nextSuggestion.suggestedType && (
                <button className="secondary-button" disabled={safetyBlocked || practiceEntryBlocked || (memoryConcerns.length > 0 && (planIsStale || !program))} onClick={() => {
                  if (safetyBlocked || practiceEntryBlocked || (memoryConcerns.length > 0 && (planIsStale || !program))) return;
                  setPracticeType(nextSuggestion.suggestedType as 'asana' | 'pranayama' | 'dhyana');
                  if (nextSuggestion.suggestedDuration) setPracticeDuration(nextSuggestion.suggestedDuration);
                  setSelectedGuide(null); setPracticePhase('guide');
                  setStep('step6');
                  clearNextSuggestion();
                  setNextSuggestion(null);
                }}>
                  {safetyBlocked ? '安全確認が必要です' : practiceEntryBlocked ? '今日の状態を確認してください' : (memoryConcerns.length > 0 && (planIsStale || !program)) ? 'プログラムを再生成してください' : 'この提案で始める'}
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {/* STEP 1: Diagnosis status */}
      {step === 'step1' && (
        <section className="panel ai-teacher-step-panel">
          <h3>STEP 1 — 今の状態</h3>
          {latestDiagnosis ? (
            <div className="ai-teacher-diagnosis-summary">
              <span className="eyebrow">最新AI診断</span>
              <strong>{new Date(latestDiagnosis.created_at).toLocaleDateString('ja-JP')}</strong>
              <p>診断タイプ: {latestDiagnosis.diagnosis_type === 'student' ? '生徒' : '先生'}</p>
              {latestDiagnosis.result_type && <p>結果: {latestDiagnosis.result_type}</p>}
              {latestDiagnosis.safety_state !== 'normal' && (
                <p className="safety-badge" data-state={latestDiagnosis.safety_state}>
                  安全状態: {latestDiagnosis.safety_state === 'caution' ? '注意' : '実践停止・専門家相談推奨'}
                </p>
              )}
              <button className="secondary-button" onClick={onOpenDiagnosis}>もう一度診断する</button>
            </div>
          ) : (
            <div className="ai-teacher-no-diagnosis">
              <p>まだAI診断を受けていません。まずは診断から始めましょう。</p>
              <button className="primary-button" onClick={onOpenDiagnosis}>AI診断を受ける</button>
            </div>
          )}
        </section>
      )}

      {/* STEP 2: Today's program */}
      {step === 'step2' && (
        <section className="panel ai-teacher-step-panel">
          <h3>STEP 2 — 今日のプログラム</h3>
          {safetyBlocked ? (
            <p className="ai-teacher-safety-note safety-blocked">
              診断結果により個別プログラムの生成を制限しています。専門家にご相談ください。
            </p>
          ) : program ? (
            <div className="ai-teacher-program-list">
              {program.items.map((item, idx) => {
                const planItem = todayPlan?.items[idx];
                const showKnowledgeLink = auth.user && planItem?.knowledgeAvailable && !safetyBlocked;
                return (
                <div key={idx} className="ai-teacher-program-item">
                  <span className={`type-pill ${item.type}`}>
                    {item.type === 'asana' ? 'アーサナ' : item.type === 'pranayama' ? '呼吸法' : '瞑想'}
                  </span>
                  <strong>{item.name}</strong>
                  <span className="ai-teacher-duration">約{item.durationMin}分</span>
                  <button className="secondary-button" disabled={safetyBlocked || practiceEntryBlocked || (memoryConcerns.length > 0 && (planIsStale || !program))} onClick={() => {
                    if (safetyBlocked || practiceEntryBlocked || (memoryConcerns.length > 0 && (planIsStale || !program))) return;
                    setPracticeType(item.type);
                    setPracticeDuration(item.durationMin);
                    setSelectedGuide(null); setPracticePhase('guide');
                    setStep('step6');
                  }}>{safetyBlocked ? '安全確認が必要です' : practiceEntryBlocked ? '今日の状態を確認してください' : (memoryConcerns.length > 0 && (planIsStale || !program)) ? 'プログラムを再生成してください' : '実践する'}</button>
                  {showKnowledgeLink && planItem?.knowledgeLinks && planItem.knowledgeLinks.length > 0 ? (
                    planItem.knowledgeLinks.map((link, linkIdx) => (
                      <button
                        key={linkIdx}
                        className="knowledge-link-button"
                        onClick={async () => {
                          setKnowledgeLoading(true);
                          setKnowledgeExplanation(null);
                          const entry = await fetchKnowledgeExplanation(link.masterId);
                          setKnowledgeExplanation(entry);
                          setKnowledgeLoading(false);
                        }}
                      >
                        {link.label}
                      </button>
                    ))
                  ) : showKnowledgeLink && planItem?.knowledgeMasterId ? (
                    <button
                      className="knowledge-link-button"
                      onClick={async () => {
                        if (!planItem?.knowledgeMasterId) return;
                        setKnowledgeLoading(true);
                        setKnowledgeExplanation(null);
                        const entry = await fetchKnowledgeExplanation(planItem.knowledgeMasterId);
                        setKnowledgeExplanation(entry);
                        setKnowledgeLoading(false);
                      }}
                    >
                      この実践について
                    </button>
                  ) : null}
                  {!auth.user && (
                    <span className="knowledge-login-hint">ログインで解説を見る</span>
                  )}
                </div>
                );
              })}
              <p className="ai-teacher-program-meta">
                生成日時: {new Date(program.generatedAt).toLocaleString('ja-JP')} / 元: {program.basedOn === 'diagnosis' ? '診断' : program.basedOn === 'history' ? '履歴' : 'デフォルト'}
              </p>
              {todayPlan && todayPlan.adaptationNotes.length > 0 && (
                <div className="ai-teacher-plan-reasons">
                  <h4>なぜこのプログラム？</h4>
                  <ul>
                    {todayPlan.adaptationNotes.map((note, idx) => <li key={idx}>{note}</li>)}
                  </ul>
                </div>
              )}
              {todayPlan && todayPlan.sourceSignals.length > 0 && (
                <div className="ai-teacher-context-signals">
                  <button className="ai-teacher-collapse-toggle" onClick={() => setShowContextSignals((v) => !v)}>
                    先生が参考にしたシグナル {showContextSignals ? '▲' : '▼'}
                  </button>
                  {showContextSignals && (
                    <ul className="ai-teacher-signal-list">
                      {todayPlan.sourceSignals.map((s, idx) => <li key={idx}>{s}</li>)}
                    </ul>
                  )}
                </div>
              )}
              <button className="primary-button" onClick={() => setStep('step3')}>プログラムを保存する</button>
              {knowledgeLoading && (
                <div className="knowledge-explanation-box">
                  <p className="knowledge-loading">読み込み中…</p>
                </div>
              )}
              {knowledgeExplanation && (
                <div className="knowledge-explanation-box">
                  <h4 className="knowledge-explanation-title">{knowledgeExplanation.title}</h4>
                  <p className="knowledge-explanation-text">{knowledgeExplanation.publicContent}</p>
                  <span className="chat-knowledge-badge">Yoga Knowledgeを参考にしています</span>
                  <button className="ghost-button knowledge-close-button" onClick={() => setKnowledgeExplanation(null)}>閉じる</button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p>プログラムがまだありません。</p>
              <button className="primary-button" onClick={() => void handleGenerateProgram()} disabled={safetyBlocked}>生成する</button>
            </div>
          )}
        </section>
      )}

      {/* STEP 3: Save */}
      {step === 'step3' && (
        <section className="panel ai-teacher-step-panel">
          <h3>STEP 3 — 保存</h3>
          {program ? (
            <div>
              <p>今日のプログラムを保存します。次回アクセス時に同じ内容が表示されます。</p>
              <button className="primary-button" onClick={() => {
                saveTodayProgram(program);
                setSaveStatus('保存しました');
                setTimeout(() => setSaveStatus(''), 3000);
              }}>保存する</button>
              {saveStatus && <p className="ai-teacher-save-status">{saveStatus}</p>}
            </div>
          ) : (
            <p>保存するプログラムがありません。STEP 2で生成してください。</p>
          )}
        </section>
      )}

      {/* STEP 4: AI Teacher persona */}
      {step === 'step4' && (
        <section className="panel ai-teacher-step-panel">
          <h3>STEP 4 — AI先生設定</h3>
          {persona && !editingPersona ? (
            <div className="ai-teacher-persona-display">
              <span className="ai-teacher-avatar-lg">{persona.avatar}</span>
              <div className="ai-teacher-persona-fields">
                <div><strong>名前</strong><span>{persona.name}</span></div>
                <div><strong>性格</strong><span>{PERSONALITY_OPTIONS.find((p) => p.v === persona.personality)?.label ?? persona.personality}</span></div>
                <div><strong>得意分野</strong><span>{specialtyLabel(persona.specialty)}</span></div>
                <div><strong>画面言語</strong><span>{persona.uiLanguage === 'ja' ? '日本語' : 'English'}</span></div>
                <div><strong>指導言語</strong><span>{persona.teachingLanguage === 'ja' ? '日本語' : 'English'}</span></div>
              </div>
              <div className="ai-teacher-persona-actions">
                <button className="secondary-button" onClick={() => setEditingPersona(true)}>変更する</button>
                <button className="ghost-button" onClick={() => {
                  clearPersona();
                  setPersona(null);
                  setEditingPersona(true);
                  setFormName('');
                  setFormAvatar('🧘‍♀️');
                  setFormPersonality('gentle');
                  setFormSpecialty('pranayama');
                }}>削除する</button>
              </div>
              <p className="ai-teacher-memory-note">
                AI先生を変更・削除しても、診断履歴や実践記録はmyYOGAカルテに残ります。
              </p>
            </div>
          ) : (
            <div className="ai-teacher-persona-form">
              <div className="field">
                <label>先生の名前</label>
                <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="MAYA" />
              </div>
              <div className="field">
                <label>見た目（アバター）</label>
                <div className="chip-grid">
                  {AVATAR_OPTIONS.map((a) => (
                    <button key={a} className={`select-chip ${formAvatar === a ? 'active' : ''}`} onClick={() => setFormAvatar(a)}>{a}</button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>性格</label>
                <select value={formPersonality} onChange={(e) => setFormPersonality(e.target.value)}>
                  {PERSONALITY_OPTIONS.map((p) => <option key={p.v} value={p.v}>{p.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label>得意分野</label>
                <select value={formSpecialty} onChange={(e) => setFormSpecialty(e.target.value)}>
                  {SPECIALTY_OPTIONS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
                </select>
              </div>
              <div className="field-grid">
                <div className="field">
                  <label>画面言語</label>
                  <select value={formUiLang} onChange={(e) => setFormUiLang(e.target.value as LangCode)}>
                    {LANG_OPTIONS.map((l) => <option key={l.v} value={l.v}>{l.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>指導言語</label>
                  <select value={formTeachingLang} onChange={(e) => setFormTeachingLang(e.target.value as LangCode)}>
                    {LANG_OPTIONS.map((l) => <option key={l.v} value={l.v}>{l.label}</option>)}
                  </select>
                </div>
              </div>
              <button className="primary-button" onClick={handleSavePersona}>保存する</button>
            </div>
          )}
        </section>
      )}

      {/* STEP 5: Chat */}
      {step === 'step5' && (
        <section className="panel ai-teacher-step-panel">
          <h3>STEP 5 — 先生と対話</h3>
          <div className="ai-teacher-chat">
            <div className="ai-teacher-chat-messages">
              {chatMessages.length === 0 && (
                <p className="ai-teacher-chat-empty">
                  {practiceCount === 0
                    ? `${persona?.name ?? 'AI先生'}です。今日のプログラムについて、変えたいことはありますか？`
                    : `${persona?.name ?? 'AI先生'}です。これまでの好みも参考にしながら調整します。今日はどんな実践にしますか？`}
                </p>
              )}
              {(() => {
                const mem = teacherContext?.memorySummary;
                if (!mem || mem.activeConcerns.length === 0) return null;
                return (
                  <div className="ai-teacher-memory-hint">
                    <span>AI先生が覚えていること:</span>
                    <ul>
                      {mem.activeConcerns.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                );
              })()}
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`chat-message ${msg.role} ${msg.isSafety ? 'safety' : ''}`}>
                  <span className="chat-role">{msg.role === 'teacher' ? (persona?.name ?? 'AI先生') : 'あなた'}</span>
                  <p>{msg.text}</p>
                  {msg.knowledgeUsed && <span className="chat-knowledge-badge">Yoga Knowledgeを参考にしています</span>}
                </div>
              ))}
              {chatTyping && (
                <div className="chat-message teacher chat-typing">
                  <span className="chat-role">{persona?.name ?? 'AI先生'}</span>
                  <p className="chat-typing-dots"><span /><span /><span /></p>
                </div>
              )}
            </div>
            <div className="ai-teacher-chat-input-row">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat(); }}
                placeholder="メッセージを入力…"
              />
              <button className="primary-button" onClick={handleSendChat} disabled={chatTyping}>{chatTyping ? '…' : '送信'}</button>
            </div>
            <p className="ai-teacher-safety-note">
              痛み・怪我・妊娠・既往症などについては個別提案を行いません。専門家にご相談ください。
            </p>
          </div>
        </section>
      )}

      {/* STEP 6: Safety Gate — exclusive when safetyBlocked or practiceEntryBlocked (pain) */}
      {step === 'step6' && (safetyBlocked || practiceEntryBlocked) && (
        <section className="panel ai-teacher-step-panel">
          <div className="ai-teacher-practice-gate-block">
            {(safetyBlocked || todayCheckResult === 'pain') ? (
              <p>今日は痛みがあるとのことなので、AI先生から個別のポーズ提案は行いません。無理に実践せず、必要に応じて医療専門家や信頼できる指導者に相談してください。</p>
            ) : (
              <p>以前教えてもらった身体の不安があります。今日の状態を確認してから始めましょう。</p>
            )}
            {(safetyBlocked || todayCheckResult === 'pain') ? (
              <div className="ai-teacher-today-check-options">
                <button className="secondary-button" onClick={() => { setTodayCheckResult(null); setStep('step5'); }}>一般的な呼吸・瞑想について見る</button>
                <button className="ghost-button" onClick={() => { setTodayCheckResult(null); setStep('home'); }}>今日は実践しない</button>
              </div>
            ) : (
              <button className="primary-button" onClick={handleShowTodayCheck}>
                今日の状態を確認する
              </button>
            )}
          </div>
        </section>
      )}
      {/* STEP 6: Normal practice — only when not safetyBlocked and not practiceEntryBlocked */}
      {step === 'step6' && !safetyBlocked && !practiceEntryBlocked && (
        <section className="panel ai-teacher-step-panel">
          <h3>STEP 6 — 実践AI先生</h3>
          <p className="ai-teacher-step-intro">お手本画像を見てから、順番に実践します。全部終わったら記録しましょう。</p>
          {planIsStale && program && (
            <div className="ai-teacher-practice-gate-block">
              <p>今日の状態が変わりました。今日のヨガを再生成してから実践してください。</p>
              <button className="primary-button" onClick={() => void handleGenerateProgram()}>
                今日のヨガを再生成する
              </button>
            </div>
          )}

          {/* Camera disclaimer */}
          <div className="ai-teacher-camera-disclaimer">
            <p>
              ※カメラは自分の動きを確認するための鏡機能です。AI先生は姿勢の診断・採点・安全判定は行いません。
            </p>
          </div>

          {/* Phase: List — show all concrete poses */}
          {posePhase === 'list' && (
            <div className="today-plan-inline-display">
              <div className="today-plan-inline-header">
                <h4>今日のプログラム</h4>
                {concretePoses.length > 0 && (
                  <span className="pose-progress-text">{concretePoses.length}つの実践</span>
                )}
              </div>

              {concretePoses.length === 0 ? (
                <div className="today-plan-empty">
                  <p>プログラムがまだありません。</p>
                  <button className="primary-button" onClick={() => void handleGenerateProgram()} disabled={safetyBlocked}>
                    プログラムを生成する
                  </button>
                </div>
              ) : (
                <>
                  <ol className="today-plan-pose-list">
                    {concretePoses.map((pose, idx) => (
                      <li key={idx} className="today-plan-pose-card">
                        <div className="today-plan-pose-card-header">
                          <span className="today-plan-pose-number">{idx + 1}</span>
                          <span className={`type-pill ${pose.type}`}>
                            {pose.type === 'asana' ? 'アーサナ' : pose.type === 'pranayama' ? '呼吸法' : '瞑想'}
                          </span>
                        </div>
                        <div className="today-plan-pose-visual">
                          <img src={pose.image} alt={pose.name} className="today-plan-pose-thumb" loading="lazy" />
                          <div className="today-plan-pose-info">
                            <strong className="today-plan-pose-name">{pose.name}</strong>
                            {pose.sanskrit && (
                              <span className="today-plan-pose-sanskrit">{pose.sanskrit}</span>
                            )}
                            <span className="today-plan-pose-duration">目安：{pose.defaultMinutes}分</span>
                          </div>
                        </div>
                        <button
                          className="primary-button today-plan-pose-start-btn"
                          onClick={() => {
                            setCurrentPoseIdx(idx);
                            setPosePhase('guide');
                            setTimeout(() => {
                              poseGuideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 50);
                          }}
                        >
                          このポーズのお手本画像を見る
                        </button>
                      </li>
                    ))}
                  </ol>

                  <button
                    className="primary-button today-plan-start-all-btn"
                    onClick={() => {
                      setCurrentPoseIdx(0);
                      setPosePhase('guide');
                      setTimeout(() => {
                        poseGuideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 50);
                    }}
                  >
                    最初から順番に実践する
                  </button>

                  {/* Program basis */}
                  {todayPlan && todayPlan.sourceSignals.length > 0 && (
                    <div className="ai-teacher-program-basis">
                      <button
                        className="ai-teacher-collapse-toggle"
                        onClick={() => setShowContextSignals((v) => !v)}
                      >
                        このプログラムについて {showContextSignals ? '▲' : '▼'}
                      </button>
                      {showContextSignals && (
                        <>
                          <ul className="ai-teacher-signal-list">
                            {todayPlan.sourceSignals.map((s, idx) => <li key={idx}>{s}</li>)}
                          </ul>
                          {todayPlan.adaptationNotes.length > 0 && (
                            <div className="ai-teacher-plan-reasons">
                              <h5>なぜこのプログラム？</h5>
                              <ul>
                                {todayPlan.adaptationNotes.map((note, idx) => <li key={idx}>{note}</li>)}
                              </ul>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Phase: Guide — show visual guide for current pose */}
          {posePhase === 'guide' && practicePhase !== 'done' && concretePoses[currentPoseIdx] && (
            <div ref={poseGuideRef} className="pose-guide-section">
              {/* Progress indicator */}
              <div className="pose-progress-bar">
                <span className="pose-progress-current">{currentPoseIdx + 1} / {concretePoses.length}</span>
                <div className="pose-progress-dots">
                  {concretePoses.map((_, idx) => (
                    <span
                      key={idx}
                      className={`pose-progress-dot ${idx === currentPoseIdx ? 'active' : ''} ${idx < currentPoseIdx ? 'done' : ''}`}
                    />
                  ))}
                </div>
              </div>

              <div className="pose-guide-card">
                <div className="pose-guide-header">
                  <h4>{concretePoses[currentPoseIdx].name}</h4>
                  {concretePoses[currentPoseIdx].sanskrit && (
                    <span className="pose-guide-sanskrit">{concretePoses[currentPoseIdx].sanskrit}</span>
                  )}
                </div>

                <div className="pose-guide-image-wrap">
                  <img
                    src={concretePoses[currentPoseIdx].image}
                    alt={concretePoses[currentPoseIdx].name}
                    className={`pose-guide-image${concretePoses[currentPoseIdx].id === 'tadasana' ? ' pose-guide-image--portrait' : ''}`}
                  />
                </div>

                {/* Multi-stage images if available */}
                {concretePoses[currentPoseIdx].stages && concretePoses[currentPoseIdx].stages!.length > 0 && (
                  <div className="pose-stages">
                    {concretePoses[currentPoseIdx].stages!.map((stage: PoseStage, sIdx: number) => (
                      <div key={sIdx} className="pose-stage-item">
                        <img src={stage.image} alt={stage.label} className="pose-stage-image" loading="lazy" />
                        <div className="pose-stage-info">
                          <strong>{stage.label}</strong>
                          <p>{stage.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pose-guide-details">
                  <div className="pose-guide-detail-row">
                    <strong>開始姿勢</strong>
                    <p>{concretePoses[currentPoseIdx].startPose}</p>
                  </div>
                  <div className="pose-guide-detail-row">
                    <strong>動き方</strong>
                    <p>{concretePoses[currentPoseIdx].movement}</p>
                  </div>
                  <div className="pose-guide-detail-row">
                    <strong>呼吸</strong>
                    <p>{concretePoses[currentPoseIdx].breathing}</p>
                  </div>
                  <div className="pose-guide-detail-row">
                    <strong>目安時間</strong>
                    <p>{concretePoses[currentPoseIdx].defaultMinutes}分</p>
                  </div>
                  <div className="pose-guide-detail-row pose-caution-row">
                    <strong>注意</strong>
                    <p>{concretePoses[currentPoseIdx].caution}</p>
                  </div>
                </div>

                {/* Knowledge link — only when verified and link exists */}
                {(() => {
                  const pose = concretePoses[currentPoseIdx];
                  const link = getPoseKnowledgeLink(pose.id);
                  if (!link.available || !link.verified) return null;
                  if (!auth.user) return null;
                  const masterId = link.knowledgeMasterId;
                  if (!masterId) return null;
                  return (
                    <button
                      className="knowledge-link-button"
                      onClick={async () => {
                        setKnowledgeLoading(true);
                        setKnowledgeExplanation(null);
                        const entry = await fetchKnowledgeExplanation(masterId);
                        setKnowledgeExplanation(entry);
                        setKnowledgeLoading(false);
                      }}
                    >
                      詳しく知る
                    </button>
                  );
                })()}

                {/* Voice guide toggle */}
                <div className="ai-teacher-voice-toggle">
                  <span className="ai-teacher-voice-toggle-label">音声ガイド</span>
                  <button
                    className={voiceGuideOn ? 'secondary-button' : 'ghost-button'}
                    onClick={() => setVoiceGuideOn((v) => !v)}
                  >
                    {voiceGuideOn ? 'ON' : 'OFF'}
                  </button>
                  {voiceEngine.available && (
                    <button
                      className="ghost-button ai-teacher-voice-test-btn"
                      onClick={handleTestVoice}
                    >
                      音声をテスト
                    </button>
                  )}
                  {!voiceEngine.available && voiceGuideOn && (
                    <span className="ai-teacher-voice-unavailable">この端末では音声ガイドを利用できません。字幕で案内します。</span>
                  )}
                </div>
                {voiceEngine.available && (
                  <div className="ai-teacher-voice-status">
                    <span className="ai-teacher-voice-status-dot" data-status={voiceStatus} />
                    <span className="ai-teacher-voice-status-text">
                      {voiceStatus === 'playing' ? '再生中' : voiceStatus === 'stopped' ? '停止中' : voiceStatus === 'available' ? '利用可能' : '利用不可'}
                    </span>
                    {voiceName && <span className="ai-teacher-voice-status-name">音声: {voiceName}</span>}
                    {voiceError && <span className="ai-teacher-voice-status-error">音声ガイドを再生できませんでした。字幕を見ながら実践できます。</span>}
                  </div>
                )}
                <div className="ai-teacher-voice-diag">
                  <span>engine: {engineType === 'browser-tts' ? 'Browser TTS' : engineType === 'audio-file' ? 'Audio fallback' : 'none'}</span>
                  <span>speechSynthesis: {ttsAvailable ? 'available' : 'unavailable'}</span>
                  {ttsAvailable && <span>voices: {voiceDiag.voicesCount}件</span>}
                  {ttsAvailable && <span>JA voices: {voiceDiag.jaCount}件</span>}
                  {ttsAvailable && <span>speaking: {voiceDiag.speaking ? 'true' : 'false'}</span>}
                  {ttsAvailable && <span>pending: {voiceDiag.pending ? 'true' : 'false'}</span>}
                  {ttsAvailable && <span>paused: {voiceDiag.paused ? 'true' : 'false'}</span>}
                  {voiceDiag.lastEvent && <span>last event: {voiceDiag.lastEvent}</span>}
                  {voiceDiag.errorCode && <span className="ai-teacher-voice-diag-error">error: {voiceDiag.errorCode}</span>}
                </div>

                {/* Camera mirror — available before and during practice */}
                <div className="ai-teacher-camera-section ai-teacher-camera-section--guide">
                  <button
                    className={cameraOn ? 'secondary-button' : 'primary-button'}
                    onClick={() => setCameraOn((v) => !v)}
                  >
                    {cameraOn ? 'カメラを閉じる' : 'カメラを鏡として使う'}
                  </button>
                  <p className="ai-teacher-camera-hint">お手本画像を見ながら、自分の動きを画面で確認できます。</p>
                  {cameraOn && (
                    <div className="ai-teacher-video-wrap">
                      <div className="ai-teacher-video-container">
                        <video ref={guideVideoRef} autoPlay muted playsInline className="ai-teacher-video ai-teacher-video-mirror" />
                        <div className="ai-teacher-camera-overlay">
                          <span className="ai-teacher-overlay-text">自分の動きを確認中</span>
                          <button
                            className="ghost-button ai-teacher-camera-switch-btn"
                            onClick={() => setCameraFacingMode((m) => m === 'user' ? 'environment' : 'user')}
                          >
                            {cameraFacingMode === 'user' ? '背面へ切替' : '前面へ切替'}
                          </button>
                        </div>
                      </div>
                      <p className="ai-teacher-demo-note">{CAMERA_DISCLAIMER.ja}</p>
                    </div>
                  )}
                </div>

                <div className="pose-guide-actions">
                  <button
                    className="ghost-button pose-guide-back-btn"
                    onClick={() => setPosePhase('list')}
                  >
                    一覧に戻る
                  </button>
                  <button
                    className="primary-button pose-guide-start-btn"
                    onClick={() => {
                      if (practiceEntryBlocked) return;
                      const pose = concretePoses[currentPoseIdx];
                      setPracticeType(pose.type);
                      setPracticeDuration(pose.defaultMinutes);
                      setPracticePhase('active');
                      setPracticeActive(true);
                      setSessionStartedAt(Date.now());
                      setPracticeAborted(false);
                      setPracticeSessionId(crypto.randomUUID());
                      setTimerRunning(true);
                      setPracticePaused(false);
                      if (pose.id === 'box-breathing') {
                        const guide = PRACTICE_GUIDES.pranayama.find((g) => g.id === 'box-breathing');
                        if (guide) {
                          setSelectedGuide(guide);
                          setTimerPhaseIdx(0);
                          setTimerRound(1);
                        } else {
                          setSimpleTimerRemaining(pose.defaultMinutes * 60);
                        }
                      } else {
                        setSelectedGuide(null);
                        setSimpleTimerRemaining(pose.defaultMinutes * 60);
                      }
                      startVoiceGuide(pose);
                    }}
                  >
                    実践スタート
                  </button>
                </div>
              </div>

              {knowledgeLoading && (
                <div className="knowledge-explanation-box">
                  <p className="knowledge-loading">読み込み中…</p>
                </div>
              )}
              {knowledgeExplanation && (
                <div className="knowledge-explanation-box">
                  <h4 className="knowledge-explanation-title">{knowledgeExplanation.title}</h4>
                  <p className="knowledge-explanation-text">{knowledgeExplanation.publicContent}</p>
                  <span className="chat-knowledge-badge">Yoga Knowledgeを参考にしています</span>
                  <button className="ghost-button knowledge-close-button" onClick={() => setKnowledgeExplanation(null)}>閉じる</button>
                </div>
              )}
            </div>
          )}

          {/* Phase: Active — practice with timer */}
          {practicePhase === 'active' && posePhase !== 'done' && (
            <div className="practice-active-section">
              <div className="practice-active-header">
                <h4>{concretePoses[currentPoseIdx]?.name ?? selectedGuide?.name ?? '実践中'}</h4>
                <span className="practice-active-round">
                  {currentPoseIdx + 1} / {concretePoses.length}
                </span>
              </div>

              {/* Progress indicator during practice */}
              <div className="pose-progress-bar">
                <div className="pose-progress-dots">
                  {concretePoses.map((_, idx) => (
                    <span
                      key={idx}
                      className={`pose-progress-dot ${idx === currentPoseIdx ? 'active' : ''} ${idx < currentPoseIdx ? 'done' : ''}`}
                    />
                  ))}
                </div>
              </div>

              {/* Sticky camera + mini guide during practice */}
              {cameraOn && (
                <div className="practice-sticky-camera">
                  <div className="ai-teacher-video-container">
                    <video ref={practiceVideoRef} autoPlay muted playsInline className="ai-teacher-video ai-teacher-video-mirror" />
                    <div className="ai-teacher-camera-overlay">
                      <span className="ai-teacher-overlay-text">自分の動きを確認中</span>
                      <button
                        className="ghost-button ai-teacher-camera-switch-btn"
                        onClick={() => setCameraFacingMode((m) => m === 'user' ? 'environment' : 'user')}
                      >
                        {cameraFacingMode === 'user' ? '背面へ切替' : '前面へ切替'}
                      </button>
                    </div>
                    {concretePoses[currentPoseIdx] && (
                      <div className="practice-mini-guide-overlay">
                        <img src={concretePoses[currentPoseIdx].image} alt="" />
                        <span>{concretePoses[currentPoseIdx].name}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timer */}
              {selectedGuide?.hasTimer && timerRunning && (
                <div className="practice-timer">
                  <div className="breathing-orb-stage">
                    <div className="breathing-orb-halo" />
                    <div className="breathing-circle is-running" aria-live="polite">
                      <div className="breathing-circle-content">
                        <strong>{selectedGuide.timerPhases![timerPhaseIdx]?.label ?? ''}</strong>
                        <span>{timerRemaining}</span>
                      </div>
                    </div>
                  </div>
                  <p className="practice-timer-body">
                    {selectedGuide.timerPhases![timerPhaseIdx]?.body ?? ''}
                  </p>
                </div>
              )}

              {(!selectedGuide || !selectedGuide.hasTimer) && timerRunning && (
                <div className="practice-timer">
                  <div className="breathing-orb-stage">
                    <div className="breathing-orb-halo" />
                    <div className="breathing-circle is-running" aria-live="polite">
                      <div className="breathing-circle-content">
                        <strong>実践中</strong>
                        <span>{Math.floor(simpleTimerRemaining / 60)}:{String(simpleTimerRemaining % 60).padStart(2, '0')}</span>
                      </div>
                    </div>
                  </div>
                  <p className="practice-timer-body">お手本画像を見ながら、ゆっくり実践してください。</p>
                </div>
              )}

              {/* Subtitle */}
              {currentSubtitle && (
                <div className="practice-subtitle" aria-live="polite">
                  {currentSubtitle}
                </div>
              )}

              {/* Camera toggle (if not already on) */}
              {!cameraOn && (
                <div className="ai-teacher-camera-section">
                  <button
                    className="primary-button"
                    onClick={() => setCameraOn(true)}
                  >
                    カメラを鏡として使う
                  </button>
                  <p className="ai-teacher-demo-note">{CAMERA_DISCLAIMER.ja}</p>
                </div>
              )}

              <div className="practice-active-actions">
                {practicePaused ? (
                  <button
                    className="primary-button"
                    onClick={handleResumePractice}
                  >
                    再開する
                  </button>
                ) : (
                  <button
                    className="secondary-button"
                    onClick={handlePausePractice}
                  >
                    一時停止
                  </button>
                )}
                <button
                  className="secondary-button practice-abort-btn"
                  onClick={handleAbortPractice}
                >
                  中止する
                </button>
              </div>
              <p className="practice-active-hint">
                タイマー完了後に自動的に次のポーズへ進みます。
              </p>
            </div>
          )}

          {/* Phase: Done — after pose practice, show next pose or final recording */}
          {practicePhase === 'done' && !practiceAborted && (
            <div className="practice-done-section">
              <div className="pose-progress-bar">
                <span className="pose-progress-current">
                  {currentPoseIdx + 1 < concretePoses.length
                    ? `${currentPoseIdx + 1} / ${concretePoses.length} 完了`
                    : `${concretePoses.length} / ${concretePoses.length} 全完了`}
                </span>
                <div className="pose-progress-dots">
                  {concretePoses.map((_, idx) => (
                    <span
                      key={idx}
                      className={`pose-progress-dot ${idx <= currentPoseIdx ? 'done' : ''} ${idx === currentPoseIdx ? 'active' : ''}`}
                    />
                  ))}
                </div>
              </div>

              {currentPoseIdx < concretePoses.length - 1 ? (
                <div className="pose-next-section">
                  <h4>おつかれさまでした</h4>
                  <p>{concretePoses[currentPoseIdx].name} 完了！次のポーズのお手本画像を見ましょう。</p>
                  <div className="pose-next-preview">
                    <img src={concretePoses[currentPoseIdx + 1].image} alt="" className="pose-next-thumb" />
                    <div>
                      <strong>次：{concretePoses[currentPoseIdx + 1].name}</strong>
                      {concretePoses[currentPoseIdx + 1].sanskrit && (
                        <span className="pose-next-sanskrit">{concretePoses[currentPoseIdx + 1].sanskrit}</span>
                      )}
                      <span className="pose-next-duration">{concretePoses[currentPoseIdx + 1].defaultMinutes}分</span>
                    </div>
                  </div>
                  <div className="pose-next-actions">
                    <button
                      className="primary-button"
                      onClick={() => {
                        setCurrentPoseIdx(currentPoseIdx + 1);
                        setPracticePhase('guide');
                        setPosePhase('guide');
                        setTimeout(() => {
                          poseGuideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 50);
                      }}
                    >
                      次のポーズのお手本画像を見る
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => setPosePhase('list')}
                    >
                      一覧に戻る
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pose-final-section">
                  <h4>全プログラム完了！</h4>
                  <p>今日の実践を記録しましょう。</p>
                  <div className="pose-total-time">
                    合計実践時間：約{Math.max(1, Math.round(poseElapsedTotal / 60))}分
                  </div>
                  <div className="field-grid">
                    <div className="field">
                      <label>実践後の気分</label>
                      <select value={moodAfter} onChange={(e) => setMoodAfter(e.target.value)}>
                        <option value="">選択してください</option>
                        {MOOD_AFTER_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>実践時間（分）</label>
                      <input type="number" min={1} max={120} value={Math.max(1, Math.round(poseElapsedTotal / 60))}
                        onChange={(e) => setPracticeDuration(Number(e.target.value))} />
                    </div>
                  </div>
                  <div className="field">
                    <label>自由メモ（任意）</label>
                    <input value={practiceNote} onChange={(e) => setPracticeNote(e.target.value)} placeholder="今日の気づきやメモ" />
                  </div>
                  <button className="primary-button practice-save-btn" onClick={handleCompletePractice} disabled={isSavingPractice}>
                    {isSavingPractice ? '保存中…' : '記録して完了する'}
                  </button>
                  <div className="pose-final-continue">
                    <p className="pose-final-line-benefit">今日のヨガやAI先生を、イベントのあともLINEから続けられます。</p>
                    <a className="primary-button pose-final-line-cta" href="https://line.me/R/" target="_blank" rel="noopener noreferrer">LINEでYoga AIを続ける</a>
                    <div className="pose-final-nav">
                      <button className="ghost-button" onClick={onOpenDiagnosis}>AI診断を受ける</button>
                      <button className="ghost-button" onClick={onOpenMyPage}>{auth.user ? 'myYOGAカルテを見る' : 'ログインしてカルテに残す'}</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {saveStatus && <p className="ai-teacher-save-status">{saveStatus}</p>}
        </section>
      )}

      {/* STEP 7: Records */}
      {step === 'step7' && (
        <section className="panel ai-teacher-step-panel">
          <h3>STEP 7 — 今日の記録</h3>
          {saveStatus && <p className="ai-teacher-save-status">{saveStatus}</p>}
          {auth.user ? (
            <p className="ai-teacher-record-source">実践記録はクラウドに保存されています。</p>
          ) : (
            <p className="ai-teacher-record-source">実践記録はこの端末のローカルに保存されています。ログインするとクラウド保存が可能です。</p>
          )}

          {practiceCount > 0 ? (
            <div className="ai-teacher-record-list">
              <h4>最近の実践記録</h4>
              {(auth.user ? cloudLogs : localLogs).slice(0, 10).map((log) => {
                const type = log.practice_type;
                const typeLabel = type === 'asana' ? 'アーサナ' : type === 'pranayama' ? '呼吸法' : '瞑想';
                const date = new Date(log.created_at).toLocaleDateString('ja-JP');
                return (
                  <div key={log.id} className="ai-teacher-record-card">
                    <div className="ai-teacher-record-header">
                      <span className={`type-pill ${type}`}>{typeLabel}</span>
                      <strong>{log.practice_name}</strong>
                      {log.ai_teacher_used && <span className="ai-teacher-badge">AI Teacher</span>}
                    </div>
                    <div className="ai-teacher-record-meta">
                      <span>📅 {date}</span>
                      <span>⏱ {log.duration_min ?? '-'}分</span>
                      {log.mood_before && <span>前: {log.mood_before}</span>}
                      {log.mood_after && <span>後: {log.mood_after}</span>}
                    </div>
                    {log.note && <p className="ai-teacher-record-note">{log.note}</p>}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="ai-teacher-no-records">まだ実践記録がありません。STEP 6で実践を始めましょう。</p>
          )}

          {nextSuggestion && (
            <div className="ai-teacher-next-suggestion">
              <h4>次回の提案</h4>
              <p>{nextSuggestion.text}</p>
              {nextSuggestion.suggestedType && (
                <button className="secondary-button" disabled={safetyBlocked || practiceEntryBlocked || (memoryConcerns.length > 0 && (planIsStale || !program))} onClick={() => {
                  if (safetyBlocked || practiceEntryBlocked || (memoryConcerns.length > 0 && (planIsStale || !program))) return;
                  setPracticeType(nextSuggestion.suggestedType as 'asana' | 'pranayama' | 'dhyana');
                  if (nextSuggestion.suggestedDuration) setPracticeDuration(nextSuggestion.suggestedDuration);
                  setSelectedGuide(null); setPracticePhase('guide');
                  setStep('step6');
                  clearNextSuggestion();
                  setNextSuggestion(null);
                }}>
                  {safetyBlocked ? '安全確認が必要です' : practiceEntryBlocked ? '今日の状態を確認してください' : (memoryConcerns.length > 0 && (planIsStale || !program)) ? 'プログラムを再生成してください' : 'この提案で始める'}
                </button>
              )}
            </div>
          )}
          <div className="ai-teacher-step7-cta">
            <button className="primary-button" onClick={onOpenMyPage}>myYOGAカルテで実践履歴を見る</button>
          </div>
          <p className="ai-teacher-safety-note">気分は感じ方のメモであり、医療診断ではありません。</p>
        </section>
      )}

      {/* STEP 8: Growth */}
      {step === 'step8' && (
        <section className="panel ai-teacher-step-panel">
          <h3>STEP 8 — 先生が育つ</h3>
          <div className="ai-teacher-growth-grid">
            <div className="ai-teacher-growth-stat">
              <strong>{practiceCount}</strong>
              <span>累計実践回数</span>
            </div>
            <div className="ai-teacher-growth-stat">
              <strong>{growth.streakDays}</strong>
              <span>継続日数</span>
            </div>
            <div className="ai-teacher-growth-stat">
              <strong>{growth.relationshipLevel.toFixed(1)}</strong>
              <span>関係性レベル</span>
            </div>
            <div className="ai-teacher-growth-stat">
              <strong>{growth.understandingLevel.toFixed(1)}</strong>
              <span>理解度レベル</span>
            </div>
          </div>

          {/* RELATIONSHIP */}
          <div className="ai-teacher-relationship-section">
            <h4>RELATIONSHIP</h4>
            {(() => {
              const stage = getRelationshipStage(practiceCount);
              const pct = Math.min(100, ((practiceCount - stage.min) / (stage.max - stage.min)) * 100);
              return (
                <>
                  <div className="ai-teacher-relationship-stage">
                    <span className="ai-teacher-relationship-label">{stage.label}</span>
                    <span className="ai-teacher-relationship-count">{practiceCount} / {stage.max} sessions</span>
                  </div>
                  <div className="ai-teacher-progress-bar">
                    <div className="ai-teacher-progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="ai-teacher-relationship-note">
                    これはAI先生との利用・実践履歴に基づく関係性の演出です。医学的に理解していることを意味するものではありません。
                  </p>
                </>
              );
            })()}
          </div>

          {/* UNDERSTANDING */}
          <div className="ai-teacher-understanding-section">
            <h4>UNDERSTANDING</h4>
            {(() => {
              const axis = calcUnderstandingAxis(growth, !!persona);
              const axes = [
                { label: '実践', value: axis.practice, icon: '🧘' },
                { label: '好み', value: axis.preference, icon: '⚙️' },
                { label: '継続', value: axis.continuity, icon: '🌱' },
              ];
              return (
                <div className="ai-teacher-understanding-grid">
                  {axes.map((a) => (
                    <div key={a.label} className="ai-teacher-axis-card">
                      <span className="ai-teacher-axis-icon">{a.icon}</span>
                      <strong>{a.label}</strong>
                      <div className="ai-teacher-axis-bar">
                        <div className="ai-teacher-axis-fill" style={{ width: `${a.value}%` }} />
                      </div>
                      <span className="ai-teacher-axis-value">{a.value}%</span>
                    </div>
                  ))}
                </div>
              );
            })()}
            <p className="ai-teacher-understanding-note">
              この表示は実践履歴や設定情報に基づく目安です。
            </p>
          </div>

          {/* AI先生が覚えていること */}
          <div className="ai-teacher-memory-section">
            <button className="ai-teacher-collapse-toggle" onClick={() => setShowMemorySummary((v) => !v)}>
              AI先生が覚えていること {showMemorySummary ? '▲' : '▼'}
            </button>
            {showMemorySummary && (
              <ul className="ai-teacher-memory-list">
                {buildMemorySummary(growth, localLogs, cloudLogs, auth.user != null).map((m, idx) => <li key={idx}>{m}</li>)}
              </ul>
            )}
          </div>

          {/* 先生が知っていること */}
          {growth.facts.length > 0 && (
            <div className="ai-teacher-growth-section">
              <h4>先生が知っていること</h4>
              <ul className="ai-teacher-facts-list">
                {growth.facts.map((f, idx) => <li key={idx}>{f}</li>)}
              </ul>
            </div>
          )}

          {/* Prefs UI */}
          <div className="ai-teacher-prefs-section">
            <h4>好みの設定</h4>
            <p className="ai-teacher-prefs-desc">先生の説明や声かけの好みを設定できます。医療・身体情報は保存しません。</p>
            <div className="ai-teacher-prefs-grid">
              <div className="ai-teacher-pref-item">
                <label>説明量</label>
                <div className="chip-grid">
                  {PREF_EXPLANATION_OPTIONS.map((o) => (
                    <button key={o.v} className={`select-chip ${growth.prefs.explanation === o.v ? 'active' : ''}`}
                      onClick={() => {
                        const ng = { ...growth, prefs: { ...growth.prefs, explanation: o.v } };
                        saveGrowth(ng); setGrowth(ng);
                      }}>{o.label}</button>
                  ))}
                </div>
              </div>
              <div className="ai-teacher-pref-item">
                <label>声かけ</label>
                <div className="chip-grid">
                  {PREF_CUE_OPTIONS.map((o) => (
                    <button key={o.v} className={`select-chip ${growth.prefs.cue === o.v ? 'active' : ''}`}
                      onClick={() => {
                        const ng = { ...growth, prefs: { ...growth.prefs, cue: o.v } };
                        saveGrowth(ng); setGrowth(ng);
                      }}>{o.label}</button>
                  ))}
                </div>
              </div>
              <div className="ai-teacher-pref-item">
                <label>励まし</label>
                <div className="chip-grid">
                  {PREF_PRAISE_OPTIONS.map((o) => (
                    <button key={o.v} className={`select-chip ${growth.prefs.praise === o.v ? 'active' : ''}`}
                      onClick={() => {
                        const ng = { ...growth, prefs: { ...growth.prefs, praise: o.v } };
                        saveGrowth(ng); setGrowth(ng);
                      }}>{o.label}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Adapt */}
          <div className="ai-teacher-adapt-section">
            <h4>先生の指導の変化</h4>
            {getAdaptMessages(growth.prefs).length > 0 ? (
              <ul className="ai-teacher-adapt-list">
                {getAdaptMessages(growth.prefs).map((m, idx) => <li key={idx}>{m}</li>)}
              </ul>
            ) : (
              <p className="ai-teacher-adapt-default">標準的な指導で進めています。好みの設定を変更すると、先生の指導が変わります。</p>
            )}
          </div>

          {/* 最近の実践履歴 */}
          <div className="ai-teacher-history-section">
            <h4>最近の実践履歴</h4>
            {practiceCount > 0 ? (
              <div className="ai-teacher-history-list">
                {(auth.user ? cloudLogs : localLogs).slice(0, 20).map((log) => {
                  const type = log.practice_type;
                  const typeLabel = type === 'asana' ? 'アーサナ' : type === 'pranayama' ? '呼吸法' : '瞑想';
                  const date = new Date(log.created_at).toLocaleDateString('ja-JP');
                  return (
                    <div key={log.id} className="ai-teacher-history-row">
                      <span className={`type-pill ${type}`}>{typeLabel}</span>
                      <strong>{log.practice_name}</strong>
                      <span className="ai-teacher-history-duration">{log.duration_min ?? '-'}分</span>
                      {log.mood_after && <span className="ai-teacher-history-mood">後: {log.mood_after}</span>}
                      <small>{date}</small>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="ai-teacher-no-records">まだ実践履歴がありません。</p>
            )}
          </div>

          <div className="ai-teacher-step8-cta">
            <button className="secondary-button" onClick={onOpenMyPage}>myYOGAカルテで実践履歴を見る</button>
          </div>
          <p className="ai-teacher-safety-note">
            成長データに医療・身体情報は保存されません。
          </p>
        </section>
      )}

      {dryRunMode && (
        <section className="panel ai-teacher-step-panel">
          <h3>LLM Request Dry Run（LLM未送信）</h3>
          <p className="ai-teacher-safety-note">この画面は開発・受入テスト用です。LLM APIへの通信は行いません。Guard通過後のpayloadだけを表示します。</p>
          <div className="ai-teacher-chat-input-row">
            <input
              value={dryRunInput}
              onChange={(e) => setDryRunInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleDryRun(); }}
              placeholder="質問を入力（例: タダーサナとは？）"
            />
            <button className="primary-button" onClick={handleDryRun} disabled={dryRunLoading}>{dryRunLoading ? '…' : 'Dry Run実行'}</button>
          </div>
          {dryRunResult && (
            <div className="knowledge-explanation-box">
              <p><strong>結果:</strong> {dryRunResult.reasonLabel}</p>
              <p><strong>採用件数:</strong> {dryRunResult.adoptedCount}</p>
              {dryRunResult.adoptedMasterIds.length > 0 && (
                <p><strong>採用master_id:</strong> {dryRunResult.adoptedMasterIds.join(', ')}</p>
              )}
              <p><strong>LLM送信:</strong> なし（Dry Run）</p>
              {dryRunResult.payloadJson && (
                <pre className="dry-run-payload-json">{dryRunResult.payloadJson}</pre>
              )}
            </div>
          )}
        </section>
      )

      }
      {/* Quick links */}
      <section className="panel ai-teacher-quick-links">
        <div className="section-inline-header tight">
          <h3>関連する機能</h3>
        </div>
        <div className="quick-link-grid">
          <button className="quick-link-card" onClick={onOpenMyPage}><strong>myYOGAカルテ</strong><span>実践記録と診断履歴を見る</span></button>
          <button className="quick-link-card" onClick={onOpenProYoga}><strong>Pro Yoga</strong><span>資格・検定の学習を始める</span></button>
        </div>
      </section>
    </div>
  );
}

// ── Helpers ──

function updateFavoriteTypes(current: string[], type: string): string[] {
  const counts: Record<string, number> = {};
  for (const t of current) counts[t] = (counts[t] ?? 0) + 1;
  counts[type] = (counts[type] ?? 0) + 1;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);
}

function updateFacts(current: string[], type: string, duration: number): string[] {
  const facts = [...current];
  if (duration <= 5) facts.push('短い練習を好む');
  if (type === 'pranayama') facts.push('呼吸法をよく選ぶ');
  if (type === 'dhyana') facts.push('瞑想をよく実践する');
  if (type === 'asana') facts.push('アーサナをよく実践する');
  // Deduplicate, keep last 10
  return [...new Set(facts)].slice(-10);
}

function updateStreak(currentStreak: number, lastDate: string | null): number {
  const today = new Date().toISOString().slice(0, 10);
  if (!lastDate) return 1;
  if (lastDate === today) return currentStreak;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = yesterday.toISOString().slice(0, 10);
  if (lastDate === yKey) return currentStreak + 1;
  return 1;
}

function buildMemorySummary(growth: AITeacherGrowth, localLogs: LocalPracticeLog[], cloudLogs: PracticeLog[], isLoggedIn: boolean): string[] {
  const summary: string[] = [];
  const logs = isLoggedIn ? cloudLogs : localLogs;
  const durations = logs.map((l) => l.duration_min).filter((d): d is number => d != null);
  if (durations.length > 0) {
    const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    summary.push(`${avg}分前後の実践をよく選ぶ`);
  }
  if (growth.favoriteTypes.length > 0) {
    const labels = growth.favoriteTypes.map((t) => t === 'asana' ? 'アーサナ' : t === 'pranayama' ? '呼吸法' : '瞑想');
    summary.push(`${labels[0]}をよく選ぶ`);
  }
  if (growth.prefs.explanation === 'short') summary.push('説明は短めが好み');
  else if (growth.prefs.explanation === 'detailed') summary.push('説明は詳しいのが好み');
  if (growth.prefs.cue === 'minimal') summary.push('声かけは最低限が好み');
  else if (growth.prefs.cue === 'more') summary.push('声かけは多めが好み');
  if (growth.prefs.praise === 'less') summary.push('励ましは控えめが好み');
  else if (growth.prefs.praise === 'more') summary.push('励ましは多めが好み');
  if (growth.streakDays >= 2) summary.push(`${growth.streakDays}回継続している`);
  if (logs.length > 0) summary.push(`累計${logs.length}回の実践`);
  return summary.slice(0, 5);
}
