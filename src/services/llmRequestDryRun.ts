import { getKnowledgeRanking, type KnowledgeExplanation, type RankedCandidate } from './teacherKnowledgeService';
import { sanitizeKnowledgePayload, MAX_KNOWLEDGE_ITEMS } from './knowledgeGuardService';
import type { LLMKnowledgeItem } from '../types/aiTeacherLLM';

const SAFETY_KEYWORDS = [
  '痛い', '痛み', '疼痛', '怪我', '妊娠', '既往症', '病気', '腰痛', '膝が', '肩が痛',
  '高血圧', '低血圧', '診断', '治療', '薬', 'めまい', 'しびれ', '手術',
  '効く', 'に効く', '合うポーズ', '合う呼吸',
  '喘息', '偏頭痛', 'ヘルニア', '関節炎', '糖尿病',
];

const PRACTICE_REQUEST_KEYWORDS = [
  '合う', 'おすすめ', 'やれば', 'やったほうが', 'すべき',
  '今日何を', '今日やる', 'プラン', 'メニュー',
];

const EXPLANATION_PATTERNS = [
  'とは', 'とは何', 'って何', 'とはどういう', 'どういう意味',
  '教えて', '説明して', 'について', 'とは？',
  'どういう', 'どんなもの', 'どんな意味',
];

function detectSafetyKeyword(text: string): string | null {
  for (const kw of SAFETY_KEYWORDS) {
    if (text.includes(kw)) return kw;
  }
  return null;
}

function isExplanationIntent(text: string): boolean {
  if (PRACTICE_REQUEST_KEYWORDS.some((kw) => text.includes(kw))) return false;
  return EXPLANATION_PATTERNS.some((pat) => text.includes(pat));
}

function isPracticeRequest(text: string): boolean {
  return PRACTICE_REQUEST_KEYWORDS.some((kw) => text.includes(kw));
}

function isLikelyKnowledgeQuery(text: string): boolean {
  if (isExplanationIntent(text)) return true;
  const normalized = text.trim();
  if (normalized.length > 30) return false;
  return !['こんにちは', 'こんばんは', 'おはよう', 'ありがとう', 'よろしく'].includes(normalized);
}

function extractExplanationKeyword(text: string): string {
  return text
    .replace(/とはどういう意味ですか?|とは何ですか?|とは？|とは\?|って何ですか?|って何？|って何\?|について教えてください?|について説明してください?|を説明してください?|説明してください?|教えてください?/g, '')
    .replace(/[「」？?。、，,]/g, '')
    .replace(/^(この|その)\s*/, '')
    .replace(/簡単に|詳しく|わかりやすく/g, '')
    .trim();
}

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
