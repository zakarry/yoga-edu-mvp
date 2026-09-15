import type { TeacherContext } from './teacherContextService';
import { getKnowledgeRanking, type KnowledgeExplanation, type RankedCandidate } from './teacherKnowledgeService';
import { sanitizeKnowledgePayload, MAX_KNOWLEDGE_ITEMS } from './knowledgeGuardService';
import { detectSafetyKeyword, isExplanationIntent, isPracticeRequest, isLikelyKnowledgeQuery, extractExplanationKeyword, classifyIntent, type ConversationIntent } from './safetyAndIntent';
import { fetchLLMExplanation } from './llmExplanationService';
import type { AITeacherLLMRequest, LLMKnowledgeItem, LLMPersona, LLMSessionContext } from '../types/aiTeacherLLM';

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

function buildUserStateResponse(
  userMessage: string,
  context: TeacherContext,
  prevContext?: ConversationContext,
): TeacherResponse {
  const name = context.persona?.name ?? 'AI先生';
  const isStiffness = /固い|硬い|柔軟性/.test(userMessage);
  const isTired = /疲れ|だるい|疲労/.test(userMessage);
  const isStress = /ストレス/.test(userMessage);
  const isSedentary = /運動不足|久しぶり|久しぶり|動かしてない|動かしていない|運動してない|運動していない/.test(userMessage);

  let empathy: string;
  let suggestion: string;
  let followUp: string;

  if (isStiffness) {
    empathy = '教えてくれてありがとうございます。からだが硬いと感じているんですね。';
    suggestion = '無理に深く伸ばす必要はありません。今日は呼吸に合わせながら、ゆっくり動く練習にしてみますか？';
    followUp = '特に硬さを感じるところはありますか？肩まわり、股関節、脚の裏など、気になるところがあれば教えてください。';
  } else if (isTired) {
    empathy = '教えてくれてありがとうございます。疲れを感じているんですね。';
    suggestion = '今日は無理をせず、やさしいストレッチと深呼吸で体を休める時間にしましょうか。';
    followUp = '特にお疲れを感じるところがあれば教えてください。';
  } else if (isStress) {
    empathy = '教えてくれてありがとうございます。ストレスを感じているんですね。';
    suggestion = '呼吸を整えることから始めてみましょう。ゆっくり吸って、ゆっくり吐くだけでも、気持ちが落ち着きやすくなります。';
    followUp = 'よろしければ、数分の呼吸法をご案内します。';
  } else if (isSedentary) {
    empathy = '教えてくれてありがとうございます。久しぶりに体を動かすのは、はじめの一歩が大事ですね。';
    suggestion = '無理のない範囲で、ゆっくり体を動かすところから始めましょう。';
    followUp = '今日は5分程度のやさしいストレッチからいかがですか？';
  } else {
    empathy = '教えてくれてありがとうございます。今の自分の状態を伝えてくれるのは、とても助かります。';
    suggestion = '今日は無理のない範囲で、呼吸に合わせてゆっくり動くことから始めてみましょうか。';
    followUp = '他に気になることがあれば、いつでも教えてください。';
  }

  return {
    text: `${name}です。${empathy} ${suggestion}\n${followUp}`,
    updatedContext: { ...prevContext, lastUserMessage: userMessage },
  };
}

function buildCasualResponse(
  userMessage: string,
  context: TeacherContext,
  prevContext?: ConversationContext,
): TeacherResponse {
  const name = context.persona?.name ?? 'AI先生';
  const greeting = userMessage.trim();

  if (greeting.includes('ありがとう')) {
    return {
      text: `${name}です。こちらこそ、いつもありがとうございます。何か気になることがあれば、いつでも聞いてくださいね。`,
      updatedContext: { ...prevContext, lastUserMessage: userMessage },
    };
  }

  if (greeting.includes('はじめまして')) {
    return {
      text: `${name}です。はじめまして。ヨガの実践や知識について、何でも聞いてください。`,
      updatedContext: { ...prevContext, lastUserMessage: userMessage },
    };
  }

  return {
    text: `${name}です。こんにちは。今日の実践を始めましょうか？それとも、何か知りたいことがありますか？`,
    updatedContext: { ...prevContext, lastUserMessage: userMessage },
  };
}

function buildPreferenceResponse(
  userMessage: string,
  context: TeacherContext,
  prevContext?: ConversationContext,
): TeacherResponse {
  const name = context.persona?.name ?? 'AI先生';

  if (/詳しく|もっと詳しく/.test(userMessage)) {
    return {
      text: `${name}です。わかりました。今後の説明はもう少し詳しくしますね。`,
      updatedContext: { ...prevContext, lastUserMessage: userMessage },
    };
  }

  if (/短く|短め|簡潔/.test(userMessage)) {
    return {
      text: `${name}です。わかりました。今後の説明は短く簡潔にしますね。`,
      updatedContext: { ...prevContext, lastUserMessage: userMessage },
    };
  }

  if (/褒めて|ほめて|もっと褒めて/.test(userMessage)) {
    return {
      text: `${name}です。わかりました。これからはもう少し励ましの言葉を増やしますね。`,
      updatedContext: { ...prevContext, lastUserMessage: userMessage },
    };
  }

  if (/褒めすぎ|ほめすぎ|励ましは控えて/.test(userMessage)) {
    return {
      text: `${name}です。わかりました。励ましは控えめにしますね。`,
      updatedContext: { ...prevContext, lastUserMessage: userMessage },
    };
  }

  return {
    text: `${name}です。ご要望を覚えておきます。他にも調整したいことがあれば教えてください。`,
    updatedContext: { ...prevContext, lastUserMessage: userMessage },
  };
}

export async function generateTeacherResponse(
  context: TeacherContext,
  userMessage: string,
  prevContext?: ConversationContext,
): Promise<TeacherResponse> {
  const safetyHit = detectSafetyKeyword(userMessage);
  if (safetyHit) {
    const name = context.persona?.name ?? 'AI先生';
    const painWord = /腰|肩|膝|首|背中|股関節|脚|腕|手/.test(userMessage) ? userMessage.match(/(腰|肩|膝|首|背中|股関節|脚|腕|手)/)?.[0] : null;
    const bodyPart = painWord ? `${painWord}に痛みがある` : '痛みや不調がある';
    return {
      text: `${name}です。${bodyPart}のですね。今日は通常のヨガ実践を無理に進めないようにしましょう。AI先生は痛みの原因を診断したり、痛みに対する個別のポーズ処方はできません。今は無理に動かさず、必要に応じて専門家へ相談してください。`,
      isSafety: true,
      updatedContext: { ...prevContext, lastUserMessage: undefined, lastTeacherSuggestion: undefined },
    };
  }

  const intent = classifyIntent(userMessage);

  if (intent === 'user_state') {
    return buildUserStateResponse(userMessage, context, prevContext);
  }

  if (intent === 'casual_conversation') {
    return buildCasualResponse(userMessage, context, prevContext);
  }

  if (intent === 'preference') {
    return buildPreferenceResponse(userMessage, context, prevContext);
  }

  // Knowledge explanation route — only for knowledge_question intent
  if (intent === 'knowledge_question' && !isPracticeRequest(userMessage) && isLikelyKnowledgeQuery(userMessage)) {
    const keyword = isExplanationIntent(userMessage)
      ? (extractExplanationKeyword(userMessage) || userMessage)
      : userMessage.replace(/[「」？?。、，,]/g, '').trim();
    const ranked = await getKnowledgeRanking(keyword);
    const top = ranked[0];
    const sameStrength = top
      ? ranked.filter((candidate) => candidate.score === top.score && candidate.matchType === top.matchType)
      : [];

    if (top && top.score >= 75 && !(top.matchType === 'title_prefix' && sameStrength.length > 1)) {
      const candidates: KnowledgeExplanation[] = ranked
        .filter((c: RankedCandidate) => c.score >= 75)
        .slice(0, MAX_KNOWLEDGE_ITEMS)
        .map((c: RankedCandidate) => c.entry);

      const knowledgeItems: LLMKnowledgeItem[] = candidates.map(sanitizeKnowledgePayload);
      const masterIds = candidates.map((c: KnowledgeExplanation) => c.masterId);
      const primaryEntry = top.entry;
      const name = context.persona?.name ?? 'AI先生';

      const persona: LLMPersona = {
        name: context.persona?.name ?? '',
        personality: context.persona?.personality ?? '',
        specialty: context.persona?.specialty ?? '',
        teachingLanguage: context.persona?.teachingLanguage ?? 'ja',
      };

      const sessionContext: LLMSessionContext = {
        requestedMinutes: prevContext?.requestedMinutes ?? null,
        requestedType: prevContext?.requestedType ?? null,
        requestedStyle: prevContext?.requestedStyle ?? null,
        explanationPreference: context.preferences.explanation,
        cuePreference: context.preferences.cue,
        praisePreference: context.preferences.praise,
        practiceSummary: {
          totalSessions: context.practiceSummary.totalSessions,
          favoriteTypes: context.practiceSummary.favoriteTypes,
          preferredStyle: null,
        },
      };

      const llmPayload: AITeacherLLMRequest = {
        userMessage,
        persona,
        sessionContext,
        knowledge: knowledgeItems,
      };

      const llmResult = await fetchLLMExplanation(llmPayload, context.userId ?? null);

      if (llmResult.text && !llmResult.fallback) {
        return {
          text: `${llmResult.text}\n\nこの説明はYoga Knowledgeを参考にしています。`,
          knowledgeUsed: true,
          knowledgeMasterId: primaryEntry.masterId,
          knowledgeTitle: primaryEntry.title,
          updatedContext: {
            ...prevContext,
            lastUserMessage: userMessage,
            lastKnowledgeMasterId: primaryEntry.masterId,
            lastKnowledgeTitle: primaryEntry.title,
          },
        };
      }

      const fallbackText = formatExplanation(primaryEntry, context.preferences.explanation, name);
      return {
        text: fallbackText,
        knowledgeUsed: true,
        knowledgeMasterId: primaryEntry.masterId,
        knowledgeTitle: primaryEntry.title,
        updatedContext: {
          ...prevContext,
          lastUserMessage: userMessage,
          lastKnowledgeMasterId: primaryEntry.masterId,
          lastKnowledgeTitle: primaryEntry.title,
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

  if (intent === 'safety_sensitive') {
    const name = context.persona?.name ?? 'AI先生';
    return {
      text: `${name}です。痛みや不調があるのですね。今日は無理に実践を進めないようにしましょう。必要に応じて医療専門家やヨガの先生にご相談ください。`,
      isSafety: true,
      updatedContext: { ...prevContext, lastUserMessage: undefined, lastTeacherSuggestion: undefined },
    };
  }

  // Fallback: treat as practice request if intent was practice_request

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
