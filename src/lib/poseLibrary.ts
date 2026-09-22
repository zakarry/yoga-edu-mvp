import {
  POSE_CATALOG,
  getCatalogEntry,
  getCatalogEntryByName,
  getActivePosesByType,
  getPlannerPoses,
  getDefaultPlanPoseIds,
  type PoseType,
  type PoseCatalogEntry,
} from './poseCatalog';

export interface PoseStage {
  image: string;
  label: string;
  description: string;
}

export interface ConcretePose {
  id: string;
  name: string;
  sanskrit?: string;
  type: 'asana' | 'pranayama' | 'dhyana';
  image: string;
  stages?: PoseStage[];
  startPose: string;
  movement: string;
  breathing: string;
  durationLabel: string;
  caution: string;
  defaultMinutes: number;
  knowledgeEntryId?: string | null;
  knowledgeMasterId?: string | null;
  zukanSlug?: string | null;
  zukanUrl?: string | null;
  professionalYogaRelated?: boolean | null;
  professionalYogaSourceLabel?: string | null;
  knowledgeVerified?: boolean;
  bilateral?: { sides: ['right', 'left']; switchAtRemainingSec: number };
}

function entryToConcrete(entry: PoseCatalogEntry): ConcretePose {
  const minutes = entry.defaultDurationMin;
  const durationLabel = minutes >= 3 ? `${minutes}分` : `${minutes}分`;
  return {
    id: entry.id,
    name: entry.nameJa,
    sanskrit: entry.nameSanskrit,
    type: entry.type,
    image: entry.image ?? '',
    stages: entry.stages,
    startPose: entry.beginnerInstructions[0] ?? '',
    movement: entry.beginnerInstructions[1] ?? entry.beginnerInstructions[0] ?? '',
    breathing: entry.breathingInstructions[0] ?? '',
    durationLabel,
    caution: entry.generalCautions.join('。'),
    defaultMinutes: minutes,
    knowledgeEntryId: entry.knowledge.knowledgeEntryId ?? null,
    knowledgeMasterId: entry.knowledge.knowledgeMasterId ?? null,
    zukanSlug: entry.knowledge.zukanSlug ?? null,
    zukanUrl: entry.knowledge.zukanUrl ?? null,
    professionalYogaRelated: entry.knowledge.professionalYogaRelated,
    professionalYogaSourceLabel: null,
    knowledgeVerified: entry.knowledge.verified,
    bilateral: entry.bilateral,
  };
}

export const CONCRETE_POSES: ConcretePose[] = POSE_CATALOG.map(entryToConcrete);

const ALL_CATALOG_ENTRIES: PoseCatalogEntry[] = [
  ...POSE_CATALOG,
  ...getActivePosesByType('pranayama'),
  ...getActivePosesByType('dhyana'),
];

const POSE_BY_NAME: Record<string, ConcretePose> = {};
const POSE_BY_ID: Record<string, ConcretePose> = {};
for (const entry of ALL_CATALOG_ENTRIES) {
  const concrete = entryToConcrete(entry);
  if (!POSE_BY_ID[concrete.id]) {
    POSE_BY_ID[concrete.id] = concrete;
    POSE_BY_NAME[concrete.name] = concrete;
  }
}
for (const p of CONCRETE_POSES) {
  if (!POSE_BY_ID[p.id]) POSE_BY_ID[p.id] = p;
  if (!POSE_BY_NAME[p.name]) POSE_BY_NAME[p.name] = p;
}

const ABSTRACT_TO_CONCRETE: Record<string, string[]> = {
  'やさしいストレッチ': ['tadasana', 'catcow', 'uttanasana'],
  'サンフロウ': ['tadasana', 'vrksasana', 'uttanasana'],
  '山のポーズから立ち木のポーズ': ['tadasana', 'vrksasana'],
  '初心者向けアーサナ': ['tadasana', 'catcow', 'balasana'],
  'ボックスブリージング': ['box-breathing'],
  '腹式呼吸': ['abdominal-breathing'],
  '交替鼻呼吸': ['abdominal-breathing'],
  '1分間マインドフルネス': ['mindfulness-1min'],
  'ボディスキャン瞑想': ['mindfulness-1min', 'savasana'],
  '呼吸の観察': ['mindfulness-1min'],
};

export function resolveConcretePoses(name: string): ConcretePose[] {
  const ids = ABSTRACT_TO_CONCRETE[name];
  if (ids && ids.length > 0) {
    return ids.map((id) => POSE_BY_ID[id]).filter(Boolean);
  }
  const direct = POSE_BY_NAME[name];
  if (direct) return [direct];
  return [];
}

export function getPoseById(id: string): ConcretePose | undefined {
  return POSE_BY_ID[id];
}

export const PRACTICE_IDS_BY_TYPE: Record<string, string[]> = {
  asana: getActivePosesByType('asana').map((e) => e.id),
  pranayama: getActivePosesByType('pranayama').map((e) => e.id),
  dhyana: getActivePosesByType('dhyana').map((e) => e.id),
};

export const GENTLE_PRACTICE_IDS_BY_TYPE: Record<string, string[]> = {
  asana: getPlannerPoses('asana', true).map((e) => e.id),
  pranayama: getPlannerPoses('pranayama', true).map((e) => e.id),
  dhyana: getPlannerPoses('dhyana', true).map((e) => e.id),
};

export function getDefaultPlanPoses(): ConcretePose[] {
  return getDefaultPlanPoseIds()
    .map((id) => POSE_BY_ID[id])
    .filter(Boolean);
}

export function getDefaultPosesByType(type: 'asana' | 'pranayama' | 'dhyana'): ConcretePose[] {
  return getActivePosesByType(type).map(entryToConcrete);
}

const EVENT_DEMO_POSE_IDS = ['tadasana', 'catcow', 'balasana'];

export function getEventDemoPoses(): ConcretePose[] {
  return EVENT_DEMO_POSE_IDS
    .map((id) => POSE_BY_ID[id])
    .filter(Boolean);
}

export interface PoseKnowledgeLink {
  available: boolean;
  knowledgeEntryId?: string;
  knowledgeMasterId?: string;
  zukanSlug?: string;
  zukanUrl?: string;
  professionalYogaRelated?: boolean | null;
  professionalYogaSourceLabel?: string;
  verified: boolean;
}

export function getPoseKnowledgeLink(poseId: string): PoseKnowledgeLink {
  const entry = getCatalogEntry(poseId);
  if (!entry || !entry.knowledge.verified) {
    return { available: false, verified: false };
  }
  const hasLink = !!(
    entry.knowledge.knowledgeEntryId ||
    entry.knowledge.knowledgeMasterId ||
    entry.knowledge.zukanSlug ||
    entry.knowledge.zukanUrl
  );
  if (!hasLink) {
    return { available: false, verified: false };
  }
  return {
    available: true,
    knowledgeEntryId: entry.knowledge.knowledgeEntryId ?? undefined,
    knowledgeMasterId: entry.knowledge.knowledgeMasterId ?? undefined,
    zukanSlug: entry.knowledge.zukanSlug ?? undefined,
    zukanUrl: entry.knowledge.zukanUrl ?? undefined,
    professionalYogaRelated: entry.knowledge.professionalYogaRelated,
    professionalYogaSourceLabel: undefined,
    verified: true,
  };
}
