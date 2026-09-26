import { getSafeExplanationCandidates, normalizeQuery, rankKnowledgeCandidates, type KnowledgeExplanation } from './teacherKnowledgeService';
import type { ConversationTurn } from './conversationHistory';

export interface RetrievalCandidate { masterId: string; title: string; score: number; reason: string; selected: boolean }
export interface RetrievalTrace { query: string; contextQuery: string; candidates: RetrievalCandidate[]; sources: string[]; error?: string }
let lastTrace: RetrievalTrace | null = null;
export function getRetrievalTrace() { return lastTrace ? structuredClone(lastTrace) : null; }
export function clearRetrievalTrace() { lastTrace = null; }

/** Dictionary comes from permitted Knowledge titles, never an assumed list of poses. */
export function rankConversationKnowledge(query: string, contextQuery: string, entries: KnowledgeExplanation[]) {
  const normalized = normalizeQuery(query);
  const context = normalizeQuery(contextQuery);
  const segmenter = new (Intl as any).Segmenter('ja', { granularity: 'word' });
  const terms = [...segmenter.segment(normalized)].filter((x: any) => x.isWordLike)
    .map((x: any) => x.segment).filter((x: string) => x.length >= 2 && !/^(です|ます|たい|ください|について|教え|ポーズ|ヨガ|アーサナ|よい|お願い|please|pose|poses)$/.test(x));
  return entries.map(entry => {
    const exact = rankKnowledgeCandidates(query, [entry])[0];
    let score = exact?.score ?? 0, reason = exact?.matchType as string ?? 'no_relevant_match';
    const aliases = entry.title.split(/[（()）／、,\s]+/).map(normalizeQuery).filter(x => x.length >= 3);
    if (aliases.some(a => normalized.includes(a))) { score = Math.max(score, 95); reason = 'knowledge_title_or_alias_in_current_turn'; }
    if (!score && aliases.some(a => context.includes(a))) { score = 60; reason = 'knowledge_title_in_previous_exchange'; }
    const content = normalizeQuery(entry.publicContent);
    const hits = terms.filter((t: string) => content.includes(t));
    const distinctiveHit = hits.some((t: string) => /^[\p{Script=Han}]{2,}$/u.test(t) && entries.filter(e=>normalizeQuery(e.publicContent).includes(t)).length <= 2);
    if (((hits.length === 1 && distinctiveHit) || hits.length >= 2) && (distinctiveHit || hits.length / Math.max(terms.length, 1) >= 0.4) && score < 65) {
      score = 65 + Math.min(hits.length, 10); reason = `content_terms:${hits.join(',')}`;
    }
    return {entry, score, reason};
  }).sort((a,b) => b.score-a.score || a.entry.masterId.localeCompare(b.entry.masterId));
}

export async function retrieveConversationKnowledge(query: string, turns: ConversationTurn[]) {
  const previous = turns.slice(-2);
  // Carry the actual prior proposal into short follow-ups; a new explicit subject must not inherit it.
  const followup = /^(はい|ぜひ|それ|もう|他|別|違う|話が|\d+\s*分|yes|no|that|another|日本語|英語)/i.test(query.trim());
  const contextQuery = followup ? previous.map(t=>t.text).join('\n') : '';
  lastTrace = {query, contextQuery, candidates:[], sources:[]};
  try {
    const entries = await getSafeExplanationCandidates();
    const ranked = rankConversationKnowledge(query, contextQuery, entries);
    const threshold = ranked.some(r=>r.score>=90) ? 90 : 40;
    const selected = ranked.filter(r=>r.score>=threshold).slice(0,3);
    lastTrace.candidates = ranked.map(r=>({masterId:r.entry.masterId,title:r.entry.title,score:r.score,selected:selected.includes(r),reason:r.score<threshold?'rejected:below_query_threshold:'+r.reason:selected.includes(r)?'adopted:'+r.reason:'rejected:rank_below_top_3:'+r.reason}));
    lastTrace.sources = selected.map(r=>r.entry.masterId);
    return selected.map(r=>r.entry);
  } catch {
    lastTrace.error='knowledge_retrieval_failed'; return [];
  }
}
