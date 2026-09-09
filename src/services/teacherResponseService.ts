import type { TeacherContext } from './teacherContextService';
import { getKnowledgeRanking, type KnowledgeExplanation } from './teacherKnowledgeService';

export interface ConversationContext {
  requestedMinutes?: number;
  requestedType?: string;
  requestedStyle?: string;
  lastUserMessage?: string;
  lastTeacherSuggestion?: string;
  lastKnowledgeMasterId?: string;
  lastKnowledgeTitle?: string;
}

export interface TeacherResponse {
  text: string;
  isSafety?: boolean;
  knowledgeUsed?: boolean;
  knowledgeMasterId?: string;
  knowledgeTitle?: string;
  updatedContext?: ConversationContext;
}

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

function isExplanationIntent(text: string): boolean {
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

function isPracticeRequest(text: string): boolean {
  if (/\d+\s*分/.test(text)) return true;
  if (text.includes('呼吸') && (text.includes('中心') || text.includes('多め') || text.includes('増や') || text.includes('したい') || text.includes('て') && (text.includes('制限') || text.includes('絞')))) return true;
  if (text.includes('アーサナ') && (text.includes('中心') || text.includes('多め') || text.includes('増や') || text.includes('したい'))) return true;
  if (text.includes('瞑想') && (text.includes('中心') || text.includes('多め') || text.includes('増や') || text.includes('したい'))) return true;
  if (text.includes('リラックス') || text.includes('やさしい') || text.includes('フロウ') || text.includes('動かしたい') || text.includes('動かす')) return true;
  if (text.includes('疲れ') || text.includes('つかれた')) return true;
  if (text.includes('落ち着')) return true;
  return PRACTICE_INTENT_KEYWORDS.some((kw) => text.includes(kw));
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

function formatExplanation(
  entry: KnowledgeExplanation,
  explanationPref: 'short' | 'standard' | 'detailed',
  teacherName: string,
): string {
  const content = entry.publicContent;
  let body: string;
  if (explanationPref === 'short') {
    const sentences = content.split(/。/).filter((s) => s.trim().length > 0);
    body = sentences.slice(0, 2).join('。') + '。';
  } else if (explanationPref === 'detailed') {
    body = content;
  } else {
    const sentences = content.split(/。/).filter((s) => s.trim().length > 0);
    body = sentences.slice(0, Math.min(5, sentences.length)).join('。') + '。';
  }
  return `${teacherName}です。${body}\n\nこの説明はYoga Knowledgeを参考にしています。`;
}

function detectSafetyKeyword(text: string): string | null {
  for (const kw of SAFETY_KEYWORDS) {
    if (text.includes(kw)) return kw;
  }
  return null;
}

function parseMinutes(text: string): number | null {
  const m = text.match(/(\d+)\s*分/);
  if (m) return parseInt(m[1], 10);
  if (text.includes('短く') || text.includes('短め')) return 5;
  if (text.includes('長め') || text.includes('しっかり')) return 20;
  return null;
}

function parseType(text: string): string | null {
  if (text.includes('呼吸') || text.includes('プラナヤマ')) return 'pranayama';
  if (text.includes('瞑想') || text.includes('ディアナ')) return 'dhyana';
  if (text.includes('アーサナ') || text.includes('ポーズ') || text.includes('体を動か')) return 'asana';
  return null;
}

function parseStyle(text: string): string | null {
  if (text.includes('リラックス') || text.includes('やさしい')) return 'relax';
  if (text.includes('フロウ') || text.includes('動かす')) return 'flow';
  return null;
}

export async function generateTeacherResponse(
  context: TeacherContext,
  userMessage: string,
  prevContext?: ConversationContext,
): Promise<TeacherResponse> {
  const safetyHit = detectSafetyKeyword(userMessage);
  if (safetyHit) {
    return {
      text: 'ありがとうございます。ただし、痛みや怪我、妊娠や既往症などについては、私から個別の判断や実践提案を行うことはできません。まずは医療専門家やヨガの先生にご相談ください。一般的なリラックス法として、深い呼吸を数回行うことならできます。よろしければご案内しますか？',
      isSafety: true,
      updatedContext: { ...prevContext, lastUserMessage: undefined, lastTeacherSuggestion: undefined },
    };
  }

  // Knowledge explanation route (after safety, before rule-based)
  // Attempt Knowledge lookup for any non-practice input — bare keywords or explanation phrases
  if (!isPracticeRequest(userMessage) && isLikelyKnowledgeQuery(userMessage)) {
    const keyword = isExplanationIntent(userMessage)
      ? (extractExplanationKeyword(userMessage) || userMessage)
      : userMessage.replace(/[「」？?。、，,]/g, '').trim();
    const ranked = await getKnowledgeRanking(keyword);
    const top = ranked[0];
    const sameStrength = top
      ? ranked.filter((candidate) => candidate.score === top.score && candidate.matchType === top.matchType)
      : [];

    if (top && top.score >= 75 && !(top.matchType === 'title_prefix' && sameStrength.length > 1)) {
      const entry = top.entry;
      const name = context.persona?.name ?? 'AI先生';
      const text = formatExplanation(entry, context.preferences.explanation, name);
      return {
        text,
        knowledgeUsed: true,
        knowledgeMasterId: entry.masterId,
        knowledgeTitle: entry.title,
        updatedContext: {
          ...prevContext,
          lastUserMessage: userMessage,
          lastKnowledgeMasterId: entry.masterId,
          lastKnowledgeTitle: entry.title,
        },
      };
    }

    if (top && top.matchType === 'title_prefix' && sameStrength.length > 1) {
      const name = context.persona?.name ?? 'AI先生';
      const choices = sameStrength.slice(0, 4).map((candidate) => `「${candidate.entry.title}」`).join('、');
      return {
        text: `${name}です。${choices}のどの内容を知りたいですか？`,
        knowledgeUsed: false,
        updatedContext: { ...prevContext, lastUserMessage: userMessage },
      };
    }

    if (top && top.score >= 40) {
      const name = context.persona?.name ?? 'AI先生';
      return {
        text: `${name}です。「${top.entry.title}」についてですか？`,
        knowledgeUsed: false,
        updatedContext: { ...prevContext, lastUserMessage: userMessage },
      };
    }

    if (isLikelyKnowledgeQuery(userMessage)) {
      const name = context.persona?.name ?? 'AI先生';
      return {
        text: `${name}です。その言葉については、今のKnowledgeから直接的な説明が見つかりませんでした。別の言葉で言い換えていただけると、お調べできるかもしれません。`,
        knowledgeUsed: false,
        updatedContext: { ...prevContext, lastUserMessage: userMessage },
      };
    }
  }

  const name = context.persona?.name ?? 'AI先生';
  const minutes = parseMinutes(userMessage);
  const type = parseType(userMessage);
  const style = parseStyle(userMessage);

  const merged: ConversationContext = {
    ...prevContext,
    requestedMinutes: minutes ?? prevContext?.requestedMinutes,
    requestedType: type ?? prevContext?.requestedType,
    requestedStyle: style ?? prevContext?.requestedStyle,
    lastUserMessage: userMessage,
  };

  const effectiveMinutes = merged.requestedMinutes;
  const effectiveType = merged.requestedType;

  const parts: string[] = [];

  if (minutes && type) {
    parts.push(`${minutes}分の${effectiveType === 'asana' ? 'アーサナ' : effectiveType === 'pranayama' ? '呼吸法' : '瞑想'}中心にまとめます。`);
  } else if (minutes) {
    parts.push(`${minutes}分にまとめます。`);
    if (effectiveType) {
      parts.push(`${effectiveType === 'asana' ? 'アーサナ' : effectiveType === 'pranayama' ? '呼吸法' : '瞑想'}を多めにします。`);
    }
  } else if (type) {
    parts.push(`${type === 'asana' ? 'アーサナ' : type === 'pranayama' ? '呼吸法' : '瞑想'}を中心にしましょう。`);
  }

  if (!minutes && !type) {
    if (userMessage.includes('瞑想を入れて') || userMessage.includes('瞑想も')) {
      parts.push('瞑想を少し入れましょう。');
      merged.requestedType = merged.requestedType ?? 'dhyana';
    } else if (userMessage.includes('呼吸を増やして') || userMessage.includes('呼吸多め')) {
      parts.push('呼吸法を多めにします。');
      merged.requestedType = merged.requestedType ?? 'pranayama';
    } else if (userMessage.includes('アーサナを増やして') || userMessage.includes('体を動かしたい')) {
      parts.push('アーサナを多めにしましょう。');
      merged.requestedType = merged.requestedType ?? 'asana';
    } else if (userMessage.includes('疲れ') || userMessage.includes('つかれた')) {
      parts.push('お疲れ様です。今日は無理をせず、やさしいストレッチと深呼吸で体を休めましょう。');
    } else if (userMessage.includes('リラックス') || userMessage.includes('落ち着')) {
      parts.push('リラックス重視でいきましょう。ゆっくり呼吸を整えます。');
    } else if (userMessage.includes('短く') || userMessage.includes('時間がない')) {
      parts.push('短めにしましょう。5分の呼吸と3分の瞑想にします。');
      merged.requestedMinutes = 5;
    } else {
      parts.push('今日の実践を始めましょう。アーサナ・呼吸法・瞑想のどれから始めても大丈夫です。');
    }
  }

  if (effectiveMinutes && !minutes && type) {
    parts.push(`先ほどご希望の${effectiveMinutes}分は維持します。`);
  }

  const praiseLevel = context.preferences.praise;
  if (praiseLevel === 'more') {
    parts.push('いつも続けていて素晴らしいです。');
  } else if (praiseLevel === 'less') {
    // minimal praise
  } else if (context.practiceSummary.totalSessions > 0 && !minutes && !type) {
    parts.push('これまでの実践を参考にしています。');
  }

  if (context.practiceSummary.streakDays >= 3 && !minutes && !type) {
    parts.push(`${context.practiceSummary.streakDays}日続いています。今日も無理のない範囲で。`);
  }

  const text = `${name}です。${parts.join(' ')}`;
  merged.lastTeacherSuggestion = text;

  return {
    text,
    updatedContext: merged,
  };
}

export function generateNextSuggestion(
  context: TeacherContext,
  completedType: PracticeTypeLike,
  completedDuration: number,
): { text: string; suggestedType?: PracticeTypeLike; suggestedDuration?: number } {
  const recentTypes = context.practiceSummary.recentTypes;
  const favTypes = context.practiceSummary.favoriteTypes;
  const name = context.persona?.name ?? 'AI先生';

  const typeLabel = (t: string) =>
    t === 'asana' ? 'アーサナ' : t === 'pranayama' ? '呼吸法' : '瞑想';

  const asanaCount = recentTypes.filter((t) => t === 'asana').length;
  const pranayamaCount = recentTypes.filter((t) => t === 'pranayama').length;

  if (completedType === 'pranayama') {
    if (completedDuration <= 10) {
      return {
        text: `${name}です。今日は呼吸法を中心に実践しました。次回も短時間なら、呼吸＋短い瞑想にしますか？`,
        suggestedType: 'dhyana',
        suggestedDuration: completedDuration,
      };
    }
    return {
      text: `${name}です。呼吸法が中心でした。次回はアーサナを少し入れてみるのも良いかもしれません。`,
      suggestedType: 'asana',
      suggestedDuration: completedDuration,
    };
  }

  if (completedType === 'asana' && asanaCount >= 2) {
    return {
      text: `${name}です。最近アーサナが続いています。次回は呼吸や瞑想を選ぶこともできます。`,
      suggestedType: pranayamaCount === 0 ? 'pranayama' : 'dhyana',
      suggestedDuration: completedDuration,
    };
  }

  if (completedType === 'dhyana' && recentTypes.filter((t) => t === 'dhyana').length >= 2) {
    return {
      text: `${name}です。瞑想が続いています。次回は体を動かすアーサナもいかがでしょうか。`,
      suggestedType: 'asana',
      suggestedDuration: completedDuration,
    };
  }

  if (favTypes.length > 0 && favTypes[0] !== completedType) {
    return {
      text: `${name}です。今日は${typeLabel(completedType)}を実践しました。次回はよく選ぶ${typeLabel(favTypes[0])}もおすすめです。`,
      suggestedType: favTypes[0] as PracticeTypeLike,
      suggestedDuration: completedDuration,
    };
  }

  return {
    text: `${name}です。今日もありがとうございました。次回もご自身のペースで。`,
    suggestedDuration: completedDuration,
  };
}

type PracticeTypeLike = 'asana' | 'pranayama' | 'dhyana';
