export const SAFETY_KEYWORDS = [
  '痛い', '痛み', '疼痛', '怪我', '妊娠', '既往症', '病気', '腰痛', '膝が', '肩が痛',
  '高血圧', '低血圧', '診断', '治療', '薬', 'めまい', 'しびれ', '手術',
  '効く', 'に効く', '合うポーズ', '合う呼吸',
  '喘息', '偏頭痛', 'ヘルニア', '関節炎', '糖尿病',
  '安全', '腰に安全', '膝に安全',
];

const SAFETY_SENSITIVE_KEYWORDS = [
  '痛い', '強い痛み', '痛み', 'しびれ', 'めまい', '息苦しい',
  '医師', '運動制限', '制限', '手術', '怪我', '怪我を',
  '妊娠', '既往症', '病気', '診断', '治療', '薬',
  '高血圧', '低血圧', 'ヘルニア', '関節炎', '糖尿病', '喘息',
];

const HIRAGANA_TO_KANJI: Array<[RegExp, string]> = [
  [/いたい/g, '痛い'],
  [/いたみ/g, '痛み'],
  [/いたむ/g, '痛む'],
  [/しびれ/g, 'しびれ'],
  [/痺れ/g, 'しびれ'],
  [/めまい/g, 'めまい'],
  [/息苦しい/g, '息苦しい'],
  [/きず/g, '怪我'],
  [/けが/g, '怪我'],
];

function normalizeForSafety(text: string): string {
  let result = text;
  for (const [pattern, replacement] of HIRAGANA_TO_KANJI) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

const USER_STATE_PATTERNS = [
  'からだが固い', '体が固い', 'からだが硬い', '体が硬い',
  '固いです', '硬いです', '固い気がする', '硬い気がする',
  '柔軟性がない', '柔軟性が気になる', '柔軟性が足りない',
  '股関節が固い', '股関節が硬い', '肩が固い', '肩が硬い',
  '脚が固い', '脚が硬い', '腰が固い', '腰が硬い',
  '運動不足', '久しぶり', '久しぶり', '体を動かしてない',
  '体を動かしていない', '運動してない', '運動していない',
  '疲れやすい', '疲れが溜ま', '疲れがたま',
  '肩こりがひどい', '腰が重い', 'だるい',
  'ストレスが溜ま', 'ストレスがたま',
];

const CASUAL_PATTERNS = [
  'こんにちは', 'こんばんは', 'おはよう', 'おはようございます',
  'ありがとう', 'ありがとうございます', 'よろしく', 'よろしくお願いします',
  'はじめまして', 'こんちわ', 'やあ',
];

const PREFERENCE_PATTERNS = [
  '詳しく教えて', '詳しく説明', 'もっと詳しく',
  '短くして', '短めで', '簡潔に',
  '褒めて', 'ほめて', 'もっと褒めて',
  '褒めすぎ', 'ほめすぎ',
  'もっと励まして', '励ましは控えて',
  'クイズを増やして', 'クイズを減らして',
  '声のトーン', 'ゆっくり話して', '早く話して',
];

export type ConversationIntent =
  | 'knowledge_question'
  | 'user_state'
  | 'preference'
  | 'practice_request'
  | 'casual_conversation'
  | 'safety_sensitive'
  | 'safety_prescription_request'
  | 'safety_general_information'
  | 'safety_red_flag'
  | 'conversational_clarification'
  | 'contextual_followup';

const GREETINGS = ['こんにちは', 'こんばんは', 'おはよう', 'ありがとう', 'よろしく'];

const CLARIFICATION_PATTERNS = [
  'どういうこと', 'どういう意味', 'どういう意味ですか',
  'どういうことですか', 'どういうこと？',
  'なぜ', 'なぜですか', 'なんで',
  'それって何', 'それってなに',
  'さっきの意味', 'さっきの意味は',
  '意味がわからない',
  '話さないって', '話さないってどういう',
  '言わないって', '言わないってどういう',
  'しないって', 'しないってどういう',
  'できないって', 'できないってどういう',
];

const CONTEXTUAL_FOLLOWUP_PATTERNS = [
  '一般的な話して', '一般的な話', '一般論として',
  'それ教えて', 'それについて', 'それって安全',
  '詳しく', 'もっと詳しく',
  '続けて', 'さっきの話', 'さっきの',
  'それについて教えて', 'それについて話して',
  '一般的な説明して', '一般論話して',
  'もっと話して', 'もう少し聞かせて',
  '深掘り', 'もう少し詳しく',
  'それで？', 'それから', 'で？',
];

export function isContextualFollowup(text: string): boolean {
  return CONTEXTUAL_FOLLOWUP_PATTERNS.some((pat) => text.includes(pat));
}

const PRESCRIPTION_REQUEST_PATTERNS = [
  '効くポーズ', '効く呼吸', '効くアーサナ',
  '効くポーズある', '効く呼吸ある',
  '治る', '治します', '改善',
  'おすすめのポーズ', 'おすすめの呼吸',
  '合うポーズ', '合う呼吸',
  '安全なポーズ', '安全な呼吸',
  'これなら安全', 'これなら大丈夫',
  '腰痛に効く', '腰痛向け',
  '痛みに効く', '痛みに合う',
  '私の', '今の私', '私に', '私には',
  'このポーズは私', 'このポーズは今',
];

const RED_FLAG_PATTERNS = [
  '激しく痛い', '激痛', '強い痛み', 'すごく痛い',
  '動けない', '歩けない', '立てない',
  'しびれが', 'めまいが', '息苦しい',
  '手術', '骨折', '脱臼',
  '血', '腫れ', '熱がある',
  '麻痺', '感覚がない', '動かない',
];

const GENERAL_INFO_PATTERNS = [
  'について教えて', 'について説明', '一般的に教えて',
  '一般的に説明', '一般論として教えて',
  '向いているヨガ', '向いているポーズ',
  '人はどんな', 'ひとはどんな',
  '腰痛いひと', '腰痛い人', '腰痛の人',
  '腰が気になる人', '肩こりの人',
  '膝が気になる人',
  'について知りたい', 'について知りたい',
];

export function isRedFlag(text: string): boolean {
  return RED_FLAG_PATTERNS.some((pat) => text.includes(pat));
}

export function isGeneralInfoRequest(text: string): boolean {
  return GENERAL_INFO_PATTERNS.some((pat) => text.includes(pat));
}

export function isClarificationIntent(text: string): boolean {
  return CLARIFICATION_PATTERNS.some((pat) => text.includes(pat));
}

export function isPrescriptionRequest(text: string): boolean {
  return PRESCRIPTION_REQUEST_PATTERNS.some((pat) => text.includes(pat));
}

export function classifyIntent(text: string): ConversationIntent {
  const normalized = normalizeForSafety(text.trim());

  if (isContextualFollowup(normalized)) return 'contextual_followup';

  if (isClarificationIntent(normalized)) return 'conversational_clarification';

  for (const kw of SAFETY_SENSITIVE_KEYWORDS) {
    if (normalized.includes(kw)) {
      if (isRedFlag(normalized)) return 'safety_red_flag';
      if (isPrescriptionRequest(normalized)) return 'safety_prescription_request';
      if (isGeneralInfoRequest(normalized)) return 'safety_general_information';
      return 'safety_sensitive';
    }
  }

  if (isRedFlag(normalized)) return 'safety_red_flag';
  if (isPrescriptionRequest(normalized)) return 'safety_prescription_request';
  if (isGeneralInfoRequest(normalized)) return 'safety_general_information';

  for (const pat of PREFERENCE_PATTERNS) {
    if (normalized.includes(pat)) return 'preference';
  }

  for (const pat of USER_STATE_PATTERNS) {
    if (normalized.includes(pat)) return 'user_state';
  }

  if (isExplanationIntent(normalized)) return 'knowledge_question';

  if (isPracticeRequest(normalized)) return 'practice_request';

  if (GREETINGS.some((g) => normalized === g || normalized.startsWith(g))) {
    return 'casual_conversation';
  }

  if (normalized.length <= 30 && !normalized.includes('。')) {
    const looksLikeKeyword = !normalized.includes('です') && !normalized.includes('ます')
      && !normalized.includes('たい') && !normalized.includes('のですが');
    if (looksLikeKeyword && !isPracticeRequest(normalized)) {
      return 'knowledge_question';
    }
  }

  if (normalized.length <= 15) return 'casual_conversation';

  return 'casual_conversation';
}

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
  const normalized = normalizeForSafety(text);
  for (const kw of SAFETY_KEYWORDS) {
    if (normalized.includes(kw)) return kw;
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
