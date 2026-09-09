export const SAFETY_KEYWORDS = [
  '痛い', '痛み', '疼痛', '怪我', '妊娠', '既往症', '病気', '腰痛', '膝が', '肩が痛',
  '高血圧', '低血圧', '診断', '治療', '薬', 'めまい', 'しびれ', '手術',
  '効く', 'に効く', '合うポーズ', '合う呼吸',
  '喘息', '偏頭痛', 'ヘルニア', '関節炎', '糖尿病',
];

export const PRACTICE_REQUEST_KEYWORDS = [
  '合う', 'おすすめ', 'やれば', 'やったほうが', 'すべき',
  '今日何を', '今日やる', 'プラン', 'メニュー',
];

export const EXPLANATION_PATTERNS = [
  'とは', 'とは何', 'って何', 'とはどういう', 'どういう意味',
  '教えて', '説明して', 'について', 'とは？',
  'どういう', 'どんなもの', 'どんな意味',
];

export function detectSafetyKeyword(text: string): string | null {
  for (const kw of SAFETY_KEYWORDS) {
    if (text.includes(kw)) return kw;
  }
  return null;
}

export function isExplanationIntent(text: string): boolean {
  if (PRACTICE_REQUEST_KEYWORDS.some((kw) => text.includes(kw))) return false;
  return EXPLANATION_PATTERNS.some((pat) => text.includes(pat));
}

const PRACTICE_INTENT_KEYWORDS = [
  '合う', 'おすすめ', 'やれば', 'やったほうが', 'すべき',
  '今日何を', '今日やる', 'プラン', 'メニュー',
  'メニュー', '中心に', '中心で', '多め', '増やして', '減らして',
  '入れて', '入れたい', '組み合わせ',
  '短く', '短め', '長め', '時間がない',
];

export function isPracticeRequest(text: string): boolean {
  if (/\d+\s*分/.test(text)) return true;
  if (text.includes('呼吸') && (text.includes('中心') || text.includes('多め') || text.includes('増や') || text.includes('したい') || text.includes('て') && (text.includes('制限') || text.includes('絞')))) return true;
  if (text.includes('アーサナ') && (text.includes('中心') || text.includes('多め') || text.includes('増や') || text.includes('したい'))) return true;
  if (text.includes('瞑想') && (text.includes('中心') || text.includes('多め') || text.includes('増や') || text.includes('したい'))) return true;
  if (text.includes('リラックス') || text.includes('やさしい') || text.includes('フロウ') || text.includes('動かしたい') || text.includes('動かす')) return true;
  if (text.includes('疲れ') || text.includes('つかれた')) return true;
  if (text.includes('落ち着')) return true;
  return PRACTICE_INTENT_KEYWORDS.some((kw) => text.includes(kw));
}

export function isLikelyKnowledgeQuery(text: string): boolean {
  if (isExplanationIntent(text)) return true;
  const normalized = text.trim();
  if (normalized.length > 30) return false;
  return !['こんにちは', 'こんばんは', 'おはよう', 'ありがとう', 'よろしく'].includes(normalized);
}

export function extractExplanationKeyword(text: string): string {
  return text
    .replace(/とはどういう意味ですか?|とは何ですか?|とは？|とは\?|って何ですか?|って何？|って何\?|について教えてください?|について説明してください?|を説明してください?|説明してください?|教えてください?/g, '')
    .replace(/[「」？?。、，,]/g, '')
    .replace(/^(この|その)\s*/, '')
    .replace(/簡単に|詳しく|わかりやすく/g, '')
    .trim();
}
