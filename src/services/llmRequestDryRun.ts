import { getKnowledgeRanking, type KnowledgeExplanation, type RankedCandidate } from './teacherKnowledgeService';
import { sanitizeKnowledgePayload, MAX_KNOWLEDGE_ITEMS } from './knowledgeGuardService';
import type { LLMKnowledgeItem } from '../types/aiTeacherLLM';
import { detectSafetyKeyword, isExplanationIntent, isPracticeRequest, isLikelyKnowledgeQuery, extractExplanationKeyword } from './safetyAndIntent';

export type DryRunReason =
  | 'safety_blocked'
  | 'not_logged_in'
  | 'not_knowledge_query'
  | 'no_match'
  | 'ambiguous_match'
  | 'all_filtered_by_guard'
  | 'success';

export interface DryRunResult {
  reason: DryRunReason;
  reasonLabel: string;
  adoptedCount: number;
  adoptedMasterIds: string[];
  payload: LLMKnowledgeItem[];
  payloadJson: string;
  llmSent: false;
}

function buildResult(
  reason: DryRunReason,
  reasonLabel: string,
  payload: LLMKnowledgeItem[] = [],
  adoptedMasterIds: string[] = [],
): DryRunResult {
  return {
    reason,
    reasonLabel,
    adoptedCount: payload.length,
    adoptedMasterIds,
    payload,
    payloadJson: payload.length > 0 ? JSON.stringify({ knowledge: payload }, null, 2) : '',
    llmSent: false,
  };
}

export async function runLLMRequestDryRun(
  userMessage: string,
  isLoggedIn: boolean,
): Promise<DryRunResult> {
  if (detectSafetyKeyword(userMessage)) {
    return buildResult('safety_blocked', 'Safety該当: Knowledge payload生成をスキップ');
  }

  if (!isLoggedIn) {
    return buildResult('not_logged_in', '未ログイン: RPCを呼ばずpayload生成なし');
  }

  if (!isLikelyKnowledgeQuery(userMessage) || isPracticeRequest(userMessage)) {
    return buildResult('not_knowledge_query', 'Knowledge質問ではない: payload生成なし');
  }

  const keyword = isExplanationIntent(userMessage)
    ? (extractExplanationKeyword(userMessage) || userMessage)
    : userMessage.replace(/[「」？?。、，,]/g, '').trim();

  const ranked: RankedCandidate[] = await getKnowledgeRanking(keyword);

  if (ranked.length === 0 || ranked[0].score < 40) {
    return buildResult('no_match', '該当なし: payload生成なし');
  }

  const top = ranked[0];
  const sameStrength = ranked.filter(
    (c) => c.score === top.score && c.matchType === top.matchType,
  );

  if (top.matchType === 'title_prefix' && sameStrength.length > 1) {
    return buildResult('ambiguous_match', '複数候補同点: 確定できずpayload生成なし');
  }

  if (top.score < 75) {
    return buildResult('no_match', '信頼度不足: payload生成なし');
  }

  const candidates: KnowledgeExplanation[] = ranked
    .filter((c) => c.score >= 75)
    .slice(0, MAX_KNOWLEDGE_ITEMS)
    .map((c) => c.entry);

  const payload: LLMKnowledgeItem[] = candidates.map(sanitizeKnowledgePayload);
  const masterIds = candidates.map((c) => c.masterId);

  if (payload.length === 0) {
    return buildResult('all_filtered_by_guard', 'Guardにより全件除外: payload生成なし');
  }

  return buildResult('success', `LLM-ready payload生成成功（${payload.length}件）`, payload, masterIds);
}
