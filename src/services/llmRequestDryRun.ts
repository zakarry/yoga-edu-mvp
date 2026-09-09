import { getKnowledgeRanking, type KnowledgeExplanation, type RankedCandidate } from './teacherKnowledgeService';
import { sanitizeKnowledgePayload, MAX_KNOWLEDGE_ITEMS } from './knowledgeGuardService';
import type { AITeacherLLMRequest, LLMKnowledgeItem, LLMPersona, LLMSessionContext } from '../types/aiTeacherLLM';
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
  fullPayload: AITeacherLLMRequest | null;
  payloadJson: string;
  llmSent: false;
}

export interface DryRunInput {
  userMessage: string;
  isLoggedIn: boolean;
  persona: LLMPersona | null;
  sessionContext: LLMSessionContext;
}

function buildNonSuccess(
  reason: DryRunReason,
  reasonLabel: string,
): DryRunResult {
  return {
    reason,
    reasonLabel,
    adoptedCount: 0,
    adoptedMasterIds: [],
    fullPayload: null,
    payloadJson: '',
    llmSent: false,
  };
}

export async function runLLMRequestDryRun(
  input: DryRunInput,
): Promise<DryRunResult> {
  const { userMessage, isLoggedIn, persona, sessionContext } = input;

  if (detectSafetyKeyword(userMessage)) {
    return buildNonSuccess('safety_blocked', 'Safety該当: Knowledge payload生成をスキップ');
  }

  if (!isLoggedIn) {
    return buildNonSuccess('not_logged_in', '未ログイン: RPCを呼ばずpayload生成なし');
  }

  if (!isLikelyKnowledgeQuery(userMessage) || isPracticeRequest(userMessage)) {
    return buildNonSuccess('not_knowledge_query', 'Knowledge質問ではない: payload生成なし');
  }

  const keyword = isExplanationIntent(userMessage)
    ? (extractExplanationKeyword(userMessage) || userMessage)
    : userMessage.replace(/[「」？?。、，,]/g, '').trim();

  const ranked: RankedCandidate[] = await getKnowledgeRanking(keyword);

  if (ranked.length === 0 || ranked[0].score < 40) {
    return buildNonSuccess('no_match', '該当なし: payload生成なし');
  }

  const top = ranked[0];
  const sameStrength = ranked.filter(
    (c) => c.score === top.score && c.matchType === top.matchType,
  );

  if (top.matchType === 'title_prefix' && sameStrength.length > 1) {
    return buildNonSuccess('ambiguous_match', '複数候補同点: 確定できずpayload生成なし');
  }

  if (top.score < 75) {
    return buildNonSuccess('no_match', '信頼度不足: payload生成なし');
  }

  const candidates: KnowledgeExplanation[] = ranked
    .filter((c) => c.score >= 75)
    .slice(0, MAX_KNOWLEDGE_ITEMS)
    .map((c) => c.entry);

  const knowledge: LLMKnowledgeItem[] = candidates.map(sanitizeKnowledgePayload);
  const masterIds = candidates.map((c) => c.masterId);

  if (knowledge.length === 0) {
    return buildNonSuccess('all_filtered_by_guard', 'Guardにより全件除外: payload生成なし');
  }

  const fullPayload: AITeacherLLMRequest = {
    userMessage,
    persona: persona ?? { name: '', personality: '', specialty: '', teachingLanguage: 'ja' },
    sessionContext,
    knowledge,
  };

  return {
    reason: 'success',
    reasonLabel: `LLM-ready payload生成成功（${knowledge.length}件）`,
    adoptedCount: knowledge.length,
    adoptedMasterIds: masterIds,
    fullPayload,
    payloadJson: JSON.stringify(fullPayload, null, 2),
    llmSent: false,
  };
}
