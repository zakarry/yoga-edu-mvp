import { supabase } from '../lib/supabase';

export interface KnowledgeExplanation {
  masterId: string;
  title: string;
  category: string;
  publicContent: string;
}

export interface RankedCandidate {
  entry: KnowledgeExplanation;
  score: number;
  matchType: 'title_exact' | 'alias_exact' | 'title_prefix' | 'title_contains' | 'alias_contains' | 'content_contains';
}

function getSupabase() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

const RELEVANCE_THRESHOLD = 40;

const DIACRITIC_MAP: Record<string, string> = {
  'ā': 'a', 'ī': 'i', 'ū': 'u', 'ṛ': 'r', 'ḷ': 'l',
  'ṃ': 'm', 'ḥ': 'h', 'ś': 's', 'ṣ': 's', 'ṭ': 't',
  'ḍ': 'd', 'ṇ': 'n', 'ṅ': 'n', 'ñ': 'n',
};

export function normalizeQuery(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/　/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/・/g, '')
    .replace(/[āīūṛḷṃḥśṣṭḍṇṅñ]/g, (ch) => DIACRITIC_MAP[ch] ?? ch)
    .toLowerCase()
    .trim();
}

function extractTitleParts(title: string): { main: string; supplementary: string } {
  const parenIndex = title.search(/[（(]/);
  if (parenIndex >= 0) {
    const main = title.slice(0, parenIndex).trim();
    const rest = title.slice(parenIndex + 1);
    const closeIndex = rest.search(/[）)]/);
    const supplementary = closeIndex >= 0 ? rest.slice(0, closeIndex) : rest;
    return { main, supplementary: supplementary.trim() };
  }
  return { main: title.trim(), supplementary: '' };
}

function extractAliases(supplementary: string): string[] {
  if (!supplementary) return [];
  return supplementary
    .split(/[\s・、,，]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function scoreCandidate(query: string, candidate: KnowledgeExplanation): RankedCandidate | null {
  const nq = normalizeQuery(query);
  if (!nq) return null;

  const { main, supplementary } = extractTitleParts(candidate.title);
  const nm = normalizeQuery(main);
  const nc = candidate.publicContent.toLowerCase();

  if (nq === nm) return { entry: candidate, score: 100, matchType: 'title_exact' };

  const aliases = extractAliases(supplementary);
  for (const alias of aliases) {
    const na = normalizeQuery(alias);
    if (nq === na) return { entry: candidate, score: 95, matchType: 'alias_exact' };
  }

  if (nm && nq.startsWith(nm)) return { entry: candidate, score: 90, matchType: 'title_prefix' };
  if (nm.startsWith(nq)) return { entry: candidate, score: 85, matchType: 'title_prefix' };
  if (nm.includes(nq)) return { entry: candidate, score: 75, matchType: 'title_contains' };

  for (const alias of aliases) {
    const na = normalizeQuery(alias);
    if (na.includes(nq)) return { entry: candidate, score: 70, matchType: 'alias_contains' };
  }

  if (nc.includes(nq)) return { entry: candidate, score: 40, matchType: 'content_contains' };
  return null;
}

export function rankKnowledgeCandidates(
  query: string,
  candidates: KnowledgeExplanation[],
): RankedCandidate[] {
  return candidates
    .map((entry) => scoreCandidate(query, entry))
    .filter((item): item is RankedCandidate => item !== null)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.entry.title.length - b.entry.title.length;
    });
}

export async function getKnowledgeRanking(
  query: string,
): Promise<RankedCandidate[]> {
  const client = getSupabase();
  const { data: sessionData } = await client.auth.getSession();
  if (!sessionData.session) return [];

  const { data, error } = await client.rpc('lookup_teacher_explanation', { p_search: null });
  if (error) {
    console.error('lookup_teacher_explanation error:', {
      message: error.message,
      code: (error as { code?: string }).code,
      details: (error as { details?: string }).details,
      hint: (error as { hint?: string }).hint,
    });
    return [];
  }
  const candidates = (data ?? []) as KnowledgeExplanation[];
  return rankKnowledgeCandidates(query, candidates);
}

export async function getBestExplanation(query: string): Promise<KnowledgeExplanation | null> {
  const ranked = await getKnowledgeRanking(query);
  if (ranked.length === 0 || ranked[0].score < RELEVANCE_THRESHOLD) {
    return null;
  }
  return ranked[0].entry;
}

async function fetchAllCandidates(): Promise<KnowledgeExplanation[]> {
  const client = getSupabase();
  const { data: sessionData } = await client.auth.getSession();
  if (!sessionData.session) return [];

  const { data, error } = await client.rpc('lookup_teacher_explanation', { p_search: null });
  if (error) {
    console.error('lookup_teacher_explanation error:', {
      message: error.message,
      code: (error as { code?: string }).code,
      details: (error as { details?: string }).details,
      hint: (error as { hint?: string }).hint,
    });
    return [];
  }
  return (data ?? []) as KnowledgeExplanation[];
}

export async function getSafeExplanationCandidates(): Promise<KnowledgeExplanation[]> {
  return fetchAllCandidates();
}

export async function getExplanationByMasterId(masterId: string): Promise<KnowledgeExplanation | null> {
  const all = await fetchAllCandidates();
  return all.find((e) => e.masterId === masterId) ?? null;
}

export async function findExplanationByTitle(title: string): Promise<KnowledgeExplanation | null> {
  return getBestExplanation(title);
}

export async function findExplanationByKeyword(keyword: string): Promise<KnowledgeExplanation | null> {
  return getBestExplanation(keyword);
}
