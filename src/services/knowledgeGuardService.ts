import { getExplanationByMasterId, getSafeExplanationCandidates, type KnowledgeExplanation } from './teacherKnowledgeService';
import type { LLMKnowledgeItem } from '../types/aiTeacherLLM';

export const MAX_KNOWLEDGE_ITEMS = 3;

export function isKnowledgeLLMSafe(
  entry: KnowledgeExplanation,
  safetySensitive: boolean,
  safetyReviewStatus: string,
): boolean {
  if (safetySensitive && safetyReviewStatus !== 'reviewed_safe') return false;
  return true;
}

export function sanitizeKnowledgePayload(
  entry: KnowledgeExplanation,
): LLMKnowledgeItem {
  return {
    title: entry.title,
    category: entry.category,
    content: entry.publicContent,
  };
}

export function filterLLMReadyKnowledge(
  entries: KnowledgeExplanation[],
  safetyMap: Map<string, { safetySensitive: boolean; safetyReviewStatus: string }>,
): LLMKnowledgeItem[] {
  return entries
    .filter((entry) => {
      const meta = safetyMap.get(entry.masterId);
      if (!meta) return false;
      return isKnowledgeLLMSafe(entry, meta.safetySensitive, meta.safetyReviewStatus);
    })
    .slice(0, MAX_KNOWLEDGE_ITEMS)
    .map(sanitizeKnowledgePayload);
}

export async function getLLMReadyKnowledge(
  masterId: string,
): Promise<LLMKnowledgeItem | null> {
  const entry = await getExplanationByMasterId(masterId);
  if (!entry) return null;
  return sanitizeKnowledgePayload(entry);
}

export async function getLLMReadyKnowledgeBatch(
  masterIds: string[],
): Promise<LLMKnowledgeItem[]> {
  const results = await Promise.all(masterIds.map(getLLMReadyKnowledge));
  return results.filter((item): item is LLMKnowledgeItem => item !== null).slice(0, MAX_KNOWLEDGE_ITEMS);
}

export async function getSafeKnowledgeCount(): Promise<number> {
  return (await getSafeExplanationCandidates()).length;
}
