import { POSE_CATALOG, type PoseCatalogEntry } from './poseCatalog';
import { BREATHWORK_CATALOG, type BreathworkCatalogEntry } from './breathworkCatalog';
import { getPlannerMeditations, type MeditationCatalogEntry } from './meditationCatalog';

export type KnowledgeStatus = 'exact' | 'high_confidence' | 'review_required' | 'not_found';
export type KnowledgeType = 'asana' | 'pranayama' | 'dhyana';

export interface KnowledgeResolution {
  status: KnowledgeStatus;
  knowledgeMasterId?: string;
  canonicalId?: string;
  matchedName?: string;
  type?: KnowledgeType;
  catalogId?: string | null;
  confidence: number;
  reason: string;
}

export interface ResolveInput {
  nameJa?: string;
  nameSanskrit?: string;
  nameEn?: string;
  aliases?: string[];
  catalogId?: string | null;
  typeHint?: KnowledgeType;
}

interface KnowledgeIndexEntry {
  masterId: string;
  canonicalId: string;
  titleJa: string;
  category: string;
  type: KnowledgeType;
  catalogId: string | null;
  aliases: string[];
}

const VERIFIED_ALIASES: Record<string, string[]> = {
  'YK-0267': ['トリコーナーサナ', '三角のポーズ', 'trikonasana', 'trikoṇāsana', 'triangle pose'],
  'YK-0311': ['ヴァジラーサナ', 'ヴァジュラーサナ', 'vajrasana', 'vajrāsana', '金剛座', '正座', '正座のポーズ', 'thunderbolt pose'],
  'YK-0285': ['アヌローマ・ヴィローマ', 'ナーディー・ショーダナ', 'ナディ・ショーダナ', '片鼻呼吸', 'anuloma viloma', 'nadi shodhana', 'alternate nostril breathing'],
  'YK-0269': ['バッダ・パドマーサナ', 'baddha padmasana', '固定の蓮華座'],
  'YK-0264': ['タダーサナ', '山のポーズ', 'tadasana', 'mountain pose'],
  'YK-0277': ['ヴリクシャーサナ', '立ち木のポーズ', 'vrksasana', 'tree pose'],
};

const SIMILAR_PAIRS: Array<{ pattern: RegExp; warnMasterId: string; reason: string }> = [
  { pattern: /バッダ.*コナ|baddha.*kona|合せき|合蹠/i, warnMasterId: 'YK-0269', reason: '類似名だが別アーサナの可能性が高い（バッダ・パドマーサナは別のポーズ）' },
];

function normalizeString(s: string): string {
  return s
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/・/g, '')
    .replace(/ー/g, '')
    .replace(/ゥ/g, '')
    .replace(/ッ/g, '')
    .replace(/ァ/g, '')
    .replace(/[\s\u3000]/g, '')
    .toLowerCase()
    .replace(/ā/g, 'a')
    .replace(/ī/g, 'i')
    .replace(/ū/g, 'u')
    .replace(/ṛ/g, 'r')
    .replace(/ṝ/g, 'r')
    .replace(/ḷ/g, 'l')
    .replace(/ṅ/g, 'n')
    .replace(/ñ/g, 'n')
    .replace(/ṭ/g, 't')
    .replace(/ḍ/g, 'd')
    .replace(/ś/g, 's')
    .replace(/ṣ/g, 's')
    .replace(/ḥ/g, 'h')
    .replace(/[（）\[\]{}]/g, '')
    .trim();
}

function extractBaseName(s: string): string {
  const match = s.match(/^([^(]+)/);
  return match ? match[1].trim() : s.trim();
}

const DEV_LOG = typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__KNOWLEDGE_RESOLVER_DEBUG === true;

function devLog(entry: Record<string, unknown>): void {
  if (DEV_LOG) console.log('[KnowledgeResolver]', entry);
}

function buildKnowledgeIndex(): KnowledgeIndexEntry[] {
  const index: KnowledgeIndexEntry[] = [];
  const seen = new Set<string>();

  for (const pose of POSE_CATALOG) {
    const mid = pose.knowledge.knowledgeMasterId;
    if (!mid || seen.has(mid)) continue;
    seen.add(mid);
    index.push({
      masterId: mid,
      canonicalId: mid,
      titleJa: pose.nameJa,
      category: 'asana',
      type: 'asana',
      catalogId: pose.id,
      aliases: VERIFIED_ALIASES[mid] ?? [pose.nameJa, pose.nameSanskrit, pose.nameEn].filter(Boolean) as string[],
    });
  }

  for (const bw of BREATHWORK_CATALOG) {
    const mid = bw.knowledge?.knowledgeMasterId;
    if (!mid || seen.has(mid)) continue;
    seen.add(mid);
    index.push({
      masterId: mid,
      canonicalId: mid,
      titleJa: bw.nameJa,
      category: 'pranayama',
      type: 'pranayama',
      catalogId: bw.id,
      aliases: VERIFIED_ALIASES[mid] ?? [bw.nameJa, bw.nameSanskrit, bw.nameEn, ...(bw.aliases ?? [])].filter(Boolean) as string[],
    });
  }

  for (const m of getPlannerMeditations()) {
    const mid = (m.knowledge as unknown as Record<string, unknown>)?.knowledgeMasterId as string | undefined;
    if (!mid || seen.has(mid)) continue;
    seen.add(mid);
    index.push({
      masterId: mid,
      canonicalId: mid,
      titleJa: m.nameJa,
      category: 'dhyana',
      type: 'dhyana',
      catalogId: m.id,
      aliases: VERIFIED_ALIASES[mid] ?? [m.nameJa, m.nameEn].filter(Boolean) as string[],
    });
  }

  const extraEntries: Array<[string, string, KnowledgeType, string[]]> = [
    ['YK-0269', 'バッダ・パドマーサナ', 'asana', ['バッダ・パドマーサナ', 'baddha padmasana', '固定の蓮華座']],
  ];
  for (const [mid, title, type, aliases] of extraEntries) {
    if (seen.has(mid)) continue;
    seen.add(mid);
    index.push({ masterId: mid, canonicalId: mid, titleJa: title, category: type, type, catalogId: null, aliases });
  }

  return index;
}

const KNOWLEDGE_INDEX = buildKnowledgeIndex();

function normalizeAll(s: string): string {
  return normalizeString(extractBaseName(s));
}

function matchExact(input: ResolveInput, index: KnowledgeIndexEntry[]): KnowledgeIndexEntry | null {
  const names = [input.nameJa, input.nameSanskrit, input.nameEn, ...(input.aliases ?? [])].filter(Boolean) as string[];

  for (const name of names) {
    const norm = normalizeAll(name);
    for (const entry of index) {
      if (normalizeAll(entry.titleJa) === norm) return entry;
      for (const alias of entry.aliases) {
        if (normalizeAll(alias) === norm) return entry;
      }
    }
  }

  if (input.catalogId) {
    for (const entry of index) {
      if (entry.catalogId === input.catalogId) return entry;
    }
  }

  return null;
}

function matchHighConfidence(input: ResolveInput, index: KnowledgeIndexEntry[], typeHint?: KnowledgeType): KnowledgeIndexEntry | null {
  const names = [input.nameJa, input.nameSanskrit, input.nameEn, ...(input.aliases ?? [])].filter(Boolean) as string[];

  for (const name of names) {
    const norm = normalizeAll(name);
    for (const entry of index) {
      if (typeHint && entry.type !== typeHint) continue;
      for (const alias of entry.aliases) {
        const aliasNorm = normalizeAll(alias);
        if (aliasNorm === norm) return entry;
        if (aliasNorm.length > 3 && norm.length > 3 && (aliasNorm.includes(norm) || norm.includes(aliasNorm))) {
          return entry;
        }
      }
    }
  }

  return null;
}

function checkSimilarPairs(input: ResolveInput): { warnMasterId: string; reason: string } | null {
  const names = [input.nameJa, input.nameSanskrit, input.nameEn, ...(input.aliases ?? [])].filter(Boolean) as string[];
  const combined = names.join(' ');
  for (const pair of SIMILAR_PAIRS) {
    if (pair.pattern.test(combined)) return pair;
  }
  return null;
}

export function resolveYogaKnowledge(input: ResolveInput): KnowledgeResolution {
  const query = input.nameJa ?? input.nameSanskrit ?? input.nameEn ?? input.catalogId ?? '';
  const normalizedQuery = normalizeAll(query);
  devLog({ query, normalizedQuery });

  const exact = matchExact(input, KNOWLEDGE_INDEX);
  if (exact) {
    const confidence = 1.0;
    devLog({ matchedKnowledgeId: exact.masterId, status: 'exact', confidence, reason: 'exact name match' });
    return {
      status: 'exact',
      knowledgeMasterId: exact.masterId,
      canonicalId: exact.canonicalId,
      matchedName: exact.titleJa,
      type: exact.type,
      catalogId: exact.catalogId,
      confidence,
      reason: 'exact name match',
    };
  }

  const similar = checkSimilarPairs(input);
  if (similar) {
    const confidence = 0.3;
    devLog({ matchedKnowledgeId: similar.warnMasterId, status: 'review_required', confidence, reason: similar.reason });
    return {
      status: 'review_required',
      knowledgeMasterId: similar.warnMasterId,
      confidence,
      reason: similar.reason,
    };
  }

  const highConf = matchHighConfidence(input, KNOWLEDGE_INDEX, input.typeHint);
  if (highConf) {
    const confidence = 0.85;
    devLog({ matchedKnowledgeId: highConf.masterId, status: 'high_confidence', confidence, reason: 'normalized alias match' });
    return {
      status: 'high_confidence',
      knowledgeMasterId: highConf.masterId,
      canonicalId: highConf.canonicalId,
      matchedName: highConf.titleJa,
      type: highConf.type,
      catalogId: highConf.catalogId,
      confidence,
      reason: 'normalized alias match',
    };
  }

  devLog({ status: 'not_found', confidence: 0, reason: 'no matching knowledge entry found' });
  return {
    status: 'not_found',
    confidence: 0,
    reason: 'no matching knowledge entry found',
  };
}

export function resolveFromCatalogId(catalogId: string): KnowledgeResolution | null {
  const pose = POSE_CATALOG.find((e) => e.id === catalogId);
  if (pose?.knowledge?.knowledgeMasterId) {
    return {
      status: 'exact',
      knowledgeMasterId: pose.knowledge.knowledgeMasterId,
      canonicalId: pose.knowledge.knowledgeMasterId,
      matchedName: pose.nameJa,
      type: 'asana',
      catalogId: pose.id,
      confidence: 1.0,
      reason: 'catalog link exact match',
    };
  }

  const bw = BREATHWORK_CATALOG.find((e) => e.id === catalogId);
  if (bw?.knowledge?.knowledgeMasterId) {
    return {
      status: 'exact',
      knowledgeMasterId: bw.knowledge.knowledgeMasterId,
      canonicalId: bw.knowledge.knowledgeMasterId,
      matchedName: bw.nameJa,
      type: 'pranayama',
      catalogId: bw.id,
      confidence: 1.0,
      reason: 'catalog link exact match',
    };
  }

  const med = getPlannerMeditations().find((e) => e.id === catalogId);
  const mid = (med?.knowledge as unknown as Record<string, unknown>)?.knowledgeMasterId as string | undefined;
  if (mid) {
    return {
      status: 'exact',
      knowledgeMasterId: mid,
      canonicalId: mid,
      matchedName: med!.nameJa,
      type: 'dhyana',
      catalogId: med!.id,
      confidence: 1.0,
      reason: 'catalog link exact match',
    };
  }

  return null;
}

export type { PoseCatalogEntry, BreathworkCatalogEntry, MeditationCatalogEntry };
