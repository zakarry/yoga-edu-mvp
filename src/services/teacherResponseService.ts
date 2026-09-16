import type { TeacherContext } from './teacherContextService';
import { getKnowledgeRanking, type KnowledgeExplanation, type RankedCandidate } from './teacherKnowledgeService';
import { sanitizeKnowledgePayload, MAX_KNOWLEDGE_ITEMS } from './knowledgeGuardService';
import { detectSafetyKeyword, isExplanationIntent, isPracticeRequest, isLikelyKnowledgeQuery, extractExplanationKeyword, classifyIntent, isClarificationIntent, isPrescriptionRequest, isContextualFollowup, isGeneralInfoRequest, isRedFlag, classifyQuestionType, extractPoseId, extractBreathworkId, extractMeditationId, extractSequenceId, detectPracticeDomain, resolveEntity, normalizeInput, type ConversationIntent, type QuestionType, type PracticeDomain } from './safetyAndIntent';
import { getCatalogEntry, getCatalogEntryByName, type PoseCatalogEntry } from '../lib/poseCatalog';
import { getBreathworkEntry, type BreathworkCatalogEntry } from '../lib/breathworkCatalog';
import { getMeditationEntry, type MeditationCatalogEntry } from '../lib/meditationCatalog';
import { getSequenceEntry, type SequenceCatalogEntry } from '../lib/sequenceCatalog';
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
  lastSafetyMessage?: string;
  lastTeacherText?: string;
  lastAssistantMode?: 'safety_restriction' | 'general_explanation' | 'knowledge_lookup' | 'conversational_clarification' | 'contextual_followup' | 'practice_request' | 'casual' | 'safety_general_info' | 'safety_red_flag';
  lastTopic?: string;
  lastOfferedAction?: string;
  safetyContextActive?: boolean;
  lastPoseId?: string;
  lastBreathworkId?: string;
  lastMeditationId?: string;
  lastSequenceId?: string;
  lastPracticeDomain?: PracticeDomain;
  lastQuestionType?: QuestionType;
}

export type TeacherResponseActionType =
  | 'start_pose'
  | 'start_breathwork'
  | 'start_meditation'
  | 'start_sequence'
  | 'open_today_plan'
  | 'none';

export interface TeacherResponseAction {
  type: TeacherResponseActionType;
  targetId?: string;
  label?: string;
}

export interface TeacherResponse {
  text: string;
  isSafety?: boolean;
  knowledgeUsed?: boolean;
  knowledgeMasterId?: string;
  knowledgeTitle?: string;
  updatedContext?: ConversationContext;
  action?: TeacherResponseAction;
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
    action: { type: 'open_today_plan', label: '今日のヨガを作る' },
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

function buildSafetySensitiveResponse(
  userMessage: string,
  context: TeacherContext,
  prevContext?: ConversationContext,
): TeacherResponse {
  const name = context.persona?.name ?? 'AI先生';
  const painWord = /腰|肩|膝|首|背中|股関節|脚|腕|手/.test(userMessage) ? userMessage.match(/(腰|肩|膝|首|背中|股関節|脚|腕|手)/)?.[0] : null;
  const bodyPart = painWord ? `${painWord}に痛みがある` : '痛みや不調がある';
  const text = `${name}です。${bodyPart}のですね。今日は通常のヨガ実践を無理に進めないようにしましょう。AI先生は痛みの原因を診断したり、痛みに対する個別のポーズ処方はできません。今は無理に動かさず、必要に応じて専門家へ相談してください。`;
  return {
    text,
    isSafety: true,
    updatedContext: { ...prevContext, lastUserMessage: userMessage, lastTeacherText: text, lastSafetyMessage: text, lastTeacherSuggestion: undefined, lastAssistantMode: 'safety_restriction', safetyContextActive: true, lastTopic: bodyPart, lastOfferedAction: 'safety_referral' },
  };
}

function buildSafetyGeneralInfoResponse(
  userMessage: string,
  context: TeacherContext,
  prevContext?: ConversationContext,
): TeacherResponse {
  const name = context.persona?.name ?? 'AI先生';
  const bodyPart = /腰|肩|膝|首|背中|股関節|脚|腕|手/.test(userMessage)
    ? (userMessage.match(/(腰|肩|膝|首|背中|股関節|脚|腕|手)/)?.[0] ?? '')
    : '';
  const topic = bodyPart ? `${bodyPart}まわり` : 'からだの気になる部分';
  const text = `${name}です。一般論として、${topic}に不安がある人向けのヨガでは、強く反ったり深くねじったりするより、呼吸に合わせて背骨をゆっくり動かすものや、無理のない範囲で股関節まわりを動かすものが選ばれることがあります。
例として：
- 猫と牛のポーズ（背骨を丸めたり反らしたりするやさしい動き）
- チャイルドポーズ（休息のポーズ）
- やさしい呼吸法
などがあります。
ただし、これは一般的な説明であり、今の痛みに対してあなた向けに処方しているわけではありません。痛みが強い場合や動かすと悪化する場合は無理に実践せず、専門家に相談してください。`;
  return {
    text,
    isSafety: false,
    updatedContext: { ...prevContext, lastUserMessage: userMessage, lastTeacherText: text, lastAssistantMode: 'safety_general_info', lastTopic: topic, lastOfferedAction: 'general_pose_explanation' },
  };
}

function buildSafetyRedFlagResponse(
  userMessage: string,
  context: TeacherContext,
  prevContext?: ConversationContext,
): TeacherResponse {
  const name = context.persona?.name ?? 'AI先生';
  const text = `${name}です。それは大変ですね。強い痛みや激しい症状がある場合は、ヨガを続けずにすぐに医療機関を受診してください。オンラインや電話相談も活用できます。無理に動かさず、まずは専門家の診察を優先してください。`;
  return {
    text,
    isSafety: true,
    updatedContext: { ...prevContext, lastUserMessage: userMessage, lastTeacherText: text, lastSafetyMessage: text, lastTeacherSuggestion: undefined, lastAssistantMode: 'safety_red_flag', safetyContextActive: true, lastOfferedAction: 'red_flag_referral' },
  };
}

function buildSafetyPrescriptionResponse(
  userMessage: string,
  context: TeacherContext,
  prevContext?: ConversationContext,
): TeacherResponse {
  const name = context.persona?.name ?? 'AI先生';
  const text = `${name}です。痛みや症状に対して、あなた向けに特定のポーズや呼吸法を処方することはできません。「このポーズなら安全」「これで腰痛が改善する」といった個別の治療提案は控えます。
ただし、一般論としては、呼吸に合わせて背骨をゆっくり動かすもの、股関節まわりを無理なく動かすもの、呼吸に合わせて身体をゆるめるものなどがあります。例として、猫と牛のポーズ、チャイルドポーズ、やさしい呼吸法などがあります。
これらは一般的な説明であり、あなた向けの処方ではありません。痛みが強い場合は専門家に相談してください。`;
  return {
    text,
    isSafety: true,
    updatedContext: { ...prevContext, lastUserMessage: userMessage, lastTeacherText: text, lastSafetyMessage: text, lastTeacherSuggestion: undefined, lastAssistantMode: 'general_explanation', safetyContextActive: true, lastOfferedAction: 'general_pose_explanation' },
  };
}

function buildClarificationResponse(
  userMessage: string,
  context: TeacherContext,
  prevContext?: ConversationContext,
): TeacherResponse {
  const name = context.persona?.name ?? 'AI先生';
  const lastTeacher = prevContext?.lastTeacherText ?? prevContext?.lastSafetyMessage ?? '';
  const isAboutSafetyPolicy = /効用話さない|効く.*話さない|処方.*しない|提案.*しない|個別.*できない|安全.*できない|処方できない|ポーズ.*効用.*話さ/.test(userMessage)
    || (prevContext?.lastSafetyMessage && /どういうこと|なぜ|それって|どういう意味|さっき/.test(userMessage));

  if (isAboutSafetyPolicy || (prevContext?.lastSafetyMessage && /どういうこと|なぜ|それって|どういう意味|さっき|どういう/.test(userMessage))) {
    const text = `${name}です。「効くポーズ」という表現を避けているのは、痛みや症状に対して治療効果を断定しないためです。ただし、ポーズの一般的な目的や特徴、どのような動きなのか、どこを意識しやすいか、といった説明はできます。痛みがある場合にあなた向けに特定のポーズを処方しない、という意味です。一般的なヨガの知識やポーズの特徴については、お答えできます。`;
    return {
      text,
      updatedContext: { ...prevContext, lastUserMessage: userMessage, lastTeacherText: text, lastAssistantMode: 'conversational_clarification' },
    };
  }

  if (lastTeacher) {
    const text = `${name}です。先ほどの説明についてですね。${lastTeacher}もう一度、別の角度からお話しすると、ヨガの実践は個人の状態に合わせて行うものです。一般的な知識やポーズの特徴は説明できますが、あなたの痛みや症状に合わせた個別の提案はできない、という方針です。他に知りたいことがあれば、お気軽に聞いてください。`;
    return {
      text,
      updatedContext: { ...prevContext, lastUserMessage: userMessage, lastTeacherText: text, lastAssistantMode: 'conversational_clarification' },
    };
  }

  const text = `${name}です。もう少し詳しくお話ししますね。ヨガの知識やポーズの一般的な特徴については説明できます。具体的な痛みへの対応は、医療専門家やヨガの先生にご相談ください。`;
  return {
    text,
    updatedContext: { ...prevContext, lastUserMessage: userMessage, lastTeacherText: text, lastAssistantMode: 'conversational_clarification' },
  };
}

function buildContextualFollowupResponse(
  userMessage: string,
  context: TeacherContext,
  prevContext?: ConversationContext,
): TeacherResponse {
  const name = context.persona?.name ?? 'AI先生';
  const isSafetyActive = prevContext?.safetyContextActive ?? false;
  const lastTopic = prevContext?.lastTopic ?? '';
  const wantsDetail = /詳しく|もっと詳しく|深掘り|もう少し詳しく/.test(userMessage);
  const wantsGeneral = /一般的な話して|一般的な話|一般論として|一般的な説明して|一般論話して/.test(userMessage);
  const wantsSafetyCheck = /それって安全|安全/.test(userMessage);
  const wantsContinue = /続けて|さっきの話|さっきの|もっと話して|もう少し聞かせて/.test(userMessage);
  const wantsSoWhat = /で？|それで？/.test(userMessage);

  if (wantsSafetyCheck) {
    const text = `${name}です。個別に「これなら安全」と保証することはできません。一般論として、ヨガのポーズはそれぞれ目的と動きがあり、無理なく行うことが基本です。痛みがある場合は、医療専門家やヨガの先生に直接ご相談いただくのが確実です。`;
    return {
      text,
      isSafety: isSafetyActive,
      updatedContext: { ...prevContext, lastUserMessage: userMessage, lastTeacherText: text, lastAssistantMode: 'contextual_followup', lastOfferedAction: 'safety_explanation' },
    };
  }

  if (isSafetyActive) {
    if (wantsSoWhat) {
      const text = `${name}です。つまり、一般論としては「強く伸ばすこと」よりも、呼吸に合わせてやさしく動くことが中心になります。たとえば、猫と牛のポーズでは背骨を呼吸に合わせてゆっくり丸めたり反らしたりします。チャイルドポーズでは、身体を休ませる目的で使われます。やさしい呼吸法では、鼻から吸って口からゆっくり吐くような呼吸を整えます。これらは一般的な説明であり、あなた向けの処方ではありません。`;
      return {
        text,
        isSafety: true,
        updatedContext: { ...prevContext, lastUserMessage: userMessage, lastTeacherText: text, lastAssistantMode: 'contextual_followup', lastOfferedAction: 'general_pose_explanation' },
      };
    }

    if (wantsDetail || wantsContinue) {
      const text = `${name}です。先ほどの一般説明をもう少し深掘りしますね。ヨガでは、背骨をゆっくり動かすこと、呼吸に合わせて姿勢を整えること、股関節まわりを無理なく動かすことなどがよく行われます。
例として：
- 猫と牛のポーズ：背骨を丸めたり反らしたりする動きを呼吸に合わせて行う
- チャイルドポーズ：身体を休ませる目的で使われる
- やさしい呼吸法：鼻から吸ってゆっくり吐く
ただし、今あなたは痛みがあると教えてくれているので、これらを「あなたにおすすめ」とは言いません。ここでは一般的な説明として紹介しています。`;
      return {
        text,
        isSafety: true,
        updatedContext: { ...prevContext, lastUserMessage: userMessage, lastTeacherText: text, lastAssistantMode: 'contextual_followup', lastOfferedAction: 'general_pose_explanation' },
      };
    }

    if (wantsGeneral) {
      const text = `${name}です。一般論として、${lastTopic || '腰まわり'}に不安がある人向けのヨガでは、背骨をゆっくり動かす動き、股関節まわりを無理なく動かすもの、呼吸に合わせて姿勢を整えるものなどがあります。
例として：
- 猫と牛のポーズ：背骨を丸めたり反らしたりする動きを呼吸に合わせて行う
- チャイルドポーズ：身体を休ませる目的で使われる
- やさしい呼吸法
ただし、今あなたは痛みがあると教えてくれているので、これらを「あなたにおすすめ」とは言いません。ここでは一般的な説明として紹介しています。`;
      return {
        text,
        isSafety: true,
        updatedContext: { ...prevContext, lastUserMessage: userMessage, lastTeacherText: text, lastAssistantMode: 'contextual_followup', lastOfferedAction: 'general_pose_explanation' },
      };
    }

    const text = `${name}です。一般論として、ヨガでは呼吸に合わせて背骨をゆっくり動かすもの、股関節まわりを無理なく動かすもの、呼吸法などがあります。例として、猫と牛のポーズ、チャイルドポーズ、やさしい呼吸法などがあります。これらは一般的な説明であり、あなた向けの処方ではありません。`;
    return {
      text,
      isSafety: true,
      updatedContext: { ...prevContext, lastUserMessage: userMessage, lastTeacherText: text, lastAssistantMode: 'contextual_followup', lastOfferedAction: 'general_pose_explanation' },
    };
  }

  if (wantsSoWhat || wantsDetail || wantsContinue) {
    const text = `${name}です。つまり、一般論としては「強く伸ばすこと」よりも、呼吸に合わせてやさしく動くことが中心になります。たとえば、猫と牛のポーズでは背骨を呼吸に合わせてゆっくり丸めたり反らしたりします。チャイルドポーズでは、身体を休ませる目的で使われます。やさしい呼吸法では、鼻から吸ってゆっくり吐くような呼吸を整えます。これらは一般的な説明です。`;
    return {
      text,
      updatedContext: { ...prevContext, lastUserMessage: userMessage, lastTeacherText: text, lastAssistantMode: 'contextual_followup' },
    };
  }

  if (wantsGeneral) {
    const text = `${name}です。一般論として、ヨガでは呼吸に合わせて背骨をゆっくり動かすもの、股関節まわりを無理なく動かすもの、呼吸法などがあります。例として、猫と牛のポーズ、チャイルドポーズ、やさしい呼吸法などがあります。これらは一般的な説明です。`;
    return {
      text,
      updatedContext: { ...prevContext, lastUserMessage: userMessage, lastTeacherText: text, lastAssistantMode: 'contextual_followup' },
    };
  }

  const text = `${name}です。一般論として、ヨガでは呼吸に合わせて背骨をゆっくり動かすもの、股関節まわりを無理なく動かすもの、呼吸法などがあります。例として、猫と牛のポーズ、チャイルドポーズ、やさしい呼吸法などがあります。これらは一般的な説明です。`;
  return {
    text,
    updatedContext: { ...prevContext, lastUserMessage: userMessage, lastTeacherText: text, lastAssistantMode: 'contextual_followup' },
  };
}

async function tryKnowledgeLookup(
  userMessage: string,
  context: TeacherContext,
  prevContext: ConversationContext | undefined,
): Promise<TeacherResponse | null> {
  if (isPracticeRequest(userMessage) || !isLikelyKnowledgeQuery(userMessage)) return null;

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
      const text = `${llmResult.text}\n\nこの説明はYoga Knowledgeを参考にしています。`;
      return {
        text,
        knowledgeUsed: true,
        knowledgeMasterId: primaryEntry.masterId,
        knowledgeTitle: primaryEntry.title,
        updatedContext: {
          ...prevContext,
          lastUserMessage: userMessage,
          lastTeacherText: text,
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
        lastTeacherText: fallbackText,
        lastKnowledgeMasterId: primaryEntry.masterId,
        lastKnowledgeTitle: primaryEntry.title,
      },
    };
  }

  if (top && top.matchType === 'title_prefix' && sameStrength.length > 1) {
    const name = context.persona?.name ?? 'AI先生';
    const choices = sameStrength.slice(0, 4).map((candidate) => `「${candidate.entry.title}」`).join('、');
    const text = `${name}です。${choices}のどの内容を知りたいですか？`;
    return {
      text,
      knowledgeUsed: false,
      updatedContext: { ...prevContext, lastUserMessage: userMessage, lastTeacherText: text },
    };
  }

  if (top && top.score >= 40) {
    const name = context.persona?.name ?? 'AI先生';
    const text = `${name}です。「${top.entry.title}」についてですか？`;
    return {
      text,
      knowledgeUsed: false,
      updatedContext: { ...prevContext, lastUserMessage: userMessage, lastTeacherText: text },
    };
  }

  return null;
}

function buildPoseAnswer(
  pose: PoseCatalogEntry,
  questionType: QuestionType,
  isFollowup: boolean,
): string {
  const poseName = pose.nameJa;
  const breath = pose.breathingInstructions;
  const cautions = pose.generalCautions;
  const instructions = pose.beginnerInstructions;
  const cue = pose.voiceGuide.breathingCue;
  const intro = pose.voiceGuide.intro;

  switch (questionType) {
    case 'how_to': {
      const steps = instructions.map((s, i) => `${i + 1}. ${s}`).join('\n');
      const breathLine = breath.length > 0 ? `\n呼吸は${breath[0]}` : '';
      return `${poseName}は、以下のように行います。\n${steps}${breathLine}\n無理のない範囲で行ってください。`;
    }

    case 'teaching_points': {
      const points: string[] = [];
      if (cautions.length > 0) {
        for (const c of cautions) points.push(`- ${c}`);
      }
      points.push('- 呼吸を止めさせない');
      points.push('- 痛みがある場合は無理に続けさせない');
      if (pose.planner.beginnerFriendly) points.push('- 必要ならクッションやブランケットを使う');
      return `教えるときは、形を完成させることより、楽に呼吸できることを優先します。\n\n指導では例えば：\n${points.join('\n')}\n\n「この形が正解」と固定せず、本人が無理なくできる姿勢を選べるようにします。`;
    }

    case 'precautions': {
      const items: string[] = [];
      if (cautions.length > 0) {
        for (const c of cautions) items.push(`- ${c}`);
      }
      items.push('- 痛みを我慢しない');
      items.push('- 呼吸を止めない');
      items.push('- 無理に可動域を広げない');
      items.push('- 違和感が強い場合は中止する');
      return `注意点は以下の通りです。\n${items.join('\n')}`;
    }

    case 'breathing': {
      const breathText = breath.length > 0 ? breath.join('。') : '苦しくなければ鼻からゆっくり吸って、鼻からゆっくり吐きます。';
      const cueText = cue ? `\n${cue}` : '';
      return `呼吸については、${breathText}。${cueText}\n吸うときと吐くときの身体の変化を感じてみましょう。`;
    }

    case 'beginner_adaptation': {
      const tips: string[] = [];
      tips.push('- 深く入りすぎなくてよい');
      tips.push('- 時間は短めから始める');
      if (pose.defaultDurationMin <= 2) tips.push(`- 目安は${pose.defaultDurationMin}分程度から`);
      tips.push('- 呼吸を優先し、形にこだわらない');
      if (cautions.length > 0) tips.push(`- ${cautions[0]}`);
      return `初心者なら、以下のように調整します。\n${tips.join('\n')}\n自分のペースで無理なく進めて大丈夫です。`;
    }

    case 'body_awareness': {
      const sensations: string[] = [];
      if (pose.type === 'asana') {
        if (/背|背骨|脊柱/.test(instructions.join(''))) sensations.push('背中がやさしく動く感覚');
        if (/肩|首/.test(instructions.join(''))) sensations.push('肩や首の力が抜けている感覚');
        if (/股関節|足|脚|膝/.test(instructions.join(''))) sensations.push('脚や股関節まわりの伸び具合');
        if (sensations.length === 0) sensations.push('からだの重みと床の感触');
      }
      sensations.push('呼吸が無理なく続いているか');
      return `意識するポイントは、\n${sensations.map((s) => `- ${s}`).join('\n')}\n正誤判定ではなく、自分の感覚に耳を傾けてみましょう。`;
    }

    case 'purpose':
    case 'benefits_general': {
      const features: string[] = [];
      if (pose.planner.intensity === 'low') features.push('からだを休ませる目的で使われることがあります');
      if (pose.planner.gentleAllowed) features.push('やさしい動きで呼吸を感じやすい');
      if (pose.planner.advancedBalance) features.push('バランスを練習する');
      if (pose.planner.deepRange) features.push('無理のない範囲で可動域を広げる');
      if (features.length === 0) features.push('呼吸に合わせてからだを動かす');
      return `${poseName}は、${features.join('、')}といった特徴があります。一般的な目的として紹介しており、治療効果を断定するものではありません。`;
    }

    case 'definition': {
      const sanskrit = pose.nameSanskrit ?? pose.nameEn ?? '';
      const desc = instructions.join('。');
      const breathShort = breath.length > 0 ? `呼吸は${breath[0]}。` : '';
      return `${poseName}${sanskrit ? `（${sanskrit}）` : ''}は、${desc}。${breathShort}`;
    }

    case 'duration': {
      return `目安として${pose.defaultDurationMin}分程度行うことが多いです。個人差があるので、自分のペースに合わせて調整してください。`;
    }

    case 'comparison': {
      return `${poseName}は、${instructions.join('。')}。他のポーズと比べる場合は、姿勢・動き・呼吸・特徴の違いに注目するとよいです。優劣はありません。`;
    }

    default: {
      const steps = instructions.map((s, i) => `${i + 1}. ${s}`).join('\n');
      const breathLine = breath.length > 0 ? `\n呼吸：${breath.join('。')}` : '';
      const cautionLine = cautions.length > 0 ? `\n注意：${cautions.join('。')}` : '';
      return `${poseName}についてお話しします。\n${steps}${breathLine}${cautionLine}`;
    }
  }
}

function buildPoseSpecificResponse(
  pose: PoseCatalogEntry,
  questionType: QuestionType,
  context: TeacherContext,
  prevContext?: ConversationContext,
): TeacherResponse {
  const name = context.persona?.name ?? 'AI先生';
  const isFollowup = prevContext?.lastPoseId === pose.id;
  const body = buildPoseAnswer(pose, questionType, isFollowup);
  const text = isFollowup ? body : `${name}です。${body}`;
  return {
    text,
    knowledgeUsed: false,
    action: { type: 'start_pose', targetId: pose.id, label: `${pose.nameJa}を実践する` },
    updatedContext: { ...prevContext, lastTeacherText: text, lastAssistantMode: 'knowledge_lookup', lastPoseId: pose.id, lastTopic: pose.nameJa, lastQuestionType: questionType },
  };
}

function buildBreathworkAnswer(
  bw: BreathworkCatalogEntry,
  questionType: QuestionType,
): string {
  const name = bw.nameJa;
  const instr = bw.instructions;
  const nasal = bw.breathing.nasalCue ?? '苦しくなければ、鼻からゆっくり吸って、鼻から吐きます。';
  const pattern = bw.pattern;

  switch (questionType) {
    case 'definition': {
      const sanskrit = bw.nameSanskrit ?? bw.nameEn ?? '';
      let patternDesc = '';
      if (pattern) {
        const phases: string[] = [];
        if (pattern.inhaleSec) phases.push(`${pattern.inhaleSec}秒吸う`);
        if (pattern.holdAfterInhaleSec) phases.push(`${pattern.holdAfterInhaleSec}秒止める`);
        if (pattern.exhaleSec) phases.push(`${pattern.exhaleSec}秒吐く`);
        if (pattern.holdAfterExhaleSec) phases.push(`${pattern.holdAfterExhaleSec}秒止める`);
        patternDesc = phases.join(' → ') + 'を繰り返す呼吸法です。';
      }
      return `${name}${sanskrit ? `（${sanskrit}）` : ''}は、${patternDesc || instr.intro.join('。')}目安として${bw.defaultDurationMin}分程度行います。`;
    }

    case 'how_to': {
      const steps = instr.intro.map((s, i) => `${i + 1}. ${s}`).join('\n');
      return `${name}は、以下のように行います。\n${steps}\n${nasal}\n無理に大きく吸おうとせず、楽に続けられる範囲で繰り返します。`;
    }

    case 'teaching_points': {
      const points: string[] = [
        '- 無理に大きく吸わせない',
        '- 肩や首に力を入れさせない',
        '- 呼吸を止めさせない',
        '- 「正しい呼吸」を押しつけない',
        '- 苦しくなったら自然呼吸へ戻す',
      ];
      return `教えるときは、以下に気を付けます。\n${points.join('\n')}\n形より、楽に呼吸できることを優先します。`;
    }

    case 'precautions': {
      const items: string[] = [
        '- 息を止める時間を無理に延ばさない',
        '- 苦しくなったらすぐ自然な呼吸へ戻る',
        '- めまいや息苦しさがある場合は中止する',
      ];
      return `注意点は以下の通りです。\n${items.join('\n')}`;
    }

    case 'beginner_adaptation': {
      const tips: string[] = [
        '- 短い時間から始める',
        `- 目安は${bw.defaultDurationMin}分程度から`,
        '- 秒数を守ることより、苦しくならないことを優先する',
        '- 楽な姿勢で行う',
      ];
      return `初心者なら、以下のように調整します。\n${tips.join('\n')}\n自分のペースで無理なく進めて大丈夫です。`;
    }

    case 'breathing_pattern': {
      if (pattern) {
        const phases: string[] = [];
        if (pattern.inhaleSec) phases.push('吸う');
        if (pattern.holdAfterInhaleSec) phases.push('止める');
        if (pattern.exhaleSec) phases.push('吐く');
        if (pattern.holdAfterExhaleSec) phases.push('止める');
        return `${name}の呼吸の順番は、${phases.join(' → ')}です。`;
      }
      return `${name}では、${nasal}`;
    }

    case 'breathing': {
      return `${name}では、${nasal}無理のない範囲で続けます。`;
    }

    case 'body_awareness': {
      const focus = bw.visual.bodyFocus;
      if (focus === 'belly') return 'お腹がやさしく広がり、吐くと自然に戻る感覚を意識します。';
      if (focus === 'chest') return '胸郭が前後左右にやさしく広がり、吐くと戻る感覚を意識します。';
      if (bw.visual.layers) return '呼吸が下から上へ広がっていく感覚を段階的に感じます。';
      return '呼吸の動きと身体の感覚に意識を向けます。';
    }

    case 'purpose':
    case 'benefits_general': {
      const features: string[] = [];
      if (bw.safety.beginnerFriendly) features.push('初心者にも取り組みやすい');
      if (bw.safety.gentleAllowed) features.push('やさしい呼吸でリラックスしやすい');
      features.push('呼吸に意識を向ける練習になる');
      return `${name}は、${features.join('、')}といった特徴があります。一般的な実践として紹介しており、治療効果を断定するものではありません。`;
    }

    case 'duration': {
      return `目安として${bw.defaultDurationMin}分程度行うことが多いです。個人差があるので、自分のペースに合わせて調整してください。`;
    }

    case 'comparison': {
      return `${name}は、${instr.intro.join('。')}。他の呼吸法と比べる場合は、呼吸パターンと特徴の違いに注目するとよいです。優劣はありません。`;
    }

    default: {
      const steps = instr.intro.map((s, i) => `${i + 1}. ${s}`).join('\n');
      return `${name}についてお話しします。\n${steps}\n${nasal}`;
    }
  }
}

function buildBreathworkSpecificResponse(
  bw: BreathworkCatalogEntry,
  questionType: QuestionType,
  context: TeacherContext,
  prevContext?: ConversationContext,
): TeacherResponse {
  const name = context.persona?.name ?? 'AI先生';
  const isFollowup = prevContext?.lastBreathworkId === bw.id;
  const body = buildBreathworkAnswer(bw, questionType);
  const text = isFollowup ? body : `${name}です。${body}`;
  return {
    text,
    knowledgeUsed: false,
    action: { type: 'start_breathwork', targetId: bw.id, label: `${bw.nameJa}を実践する` },
    updatedContext: { ...prevContext, lastTeacherText: text, lastAssistantMode: 'knowledge_lookup', lastBreathworkId: bw.id, lastPracticeDomain: 'pranayama', lastTopic: bw.nameJa, lastQuestionType: questionType, lastPoseId: undefined, lastMeditationId: undefined },
  };
}

function buildMeditationGeneralDefinition(med: MeditationCatalogEntry, cat: string): string {
  const name = med.nameJa;
  if (med.category === 'concentration') {
    return `${name}は、自分の呼吸を一つ、二つと数えながら、呼吸に意識を集中していく${cat}です。一般的には、十まで数えたら一に戻り、途中で雑念に気づいたら、また一から数え直します。`;
  }
  if (med.category === 'mindfulness') {
    return `${name}は、今ここにある呼吸や身体感覚に、評価を加えず意識を向ける${cat}です。浮かんだ考えや感覚を追いかけず、気づいたらまた呼吸や身体の感覚へ戻ることを繰り返します。`;
  }
  if (med.category === 'yoga_nidra') {
    return `${name}は、仰向けで行う導引式のリラクゼーション${cat}です。体の各部位への意識移動、呼吸の観察、イメージなどを通じて、深い休息へ導きます。`;
  }
  return `${name}は、${cat}です。${med.description}`;
}

function buildSequenceSpecificResponse(
  seq: SequenceCatalogEntry,
  questionType: QuestionType,
  context: TeacherContext,
  prevContext?: ConversationContext,
): TeacherResponse {
  const name = context.persona?.name ?? 'AI先生';
  const updated: ConversationContext = {
    ...prevContext,
    lastPracticeDomain: 'sequence',
    lastSequenceId: seq.id,
    lastUserMessage: '',
    lastTeacherText: '',
  };

  if (questionType === 'definition') {
    const text = `${name}です。${seq.nameJa}は、12のステップを呼吸とともに流れるようにつなぐ代表的なヨガシークエンスです。インド政府AYUSH省の公式テキストに基づく体系です。各ステップで吸う・吐くを合わせながら、体を動かしていきます。`;
    updated.lastTeacherText = text;
    return { text, updatedContext: updated, action: { type: 'start_sequence', targetId: seq.id, label: `${seq.nameJa}を実践する` } };
  }

  if (questionType === 'duration') {
    const text = `${name}です。${seq.nameJa}は12ステップを片側行い、反対側も行うことで1ラウンドになります。時間に決まりはありませんが、AI先生では1ラウンドを目安に案内しています。`;
    updated.lastTeacherText = text;
    return { text, updatedContext: updated, action: { type: 'start_sequence', targetId: seq.id, label: `${seq.nameJa}を実践する` } };
  }

  if (questionType === 'breathing' || questionType === 'breathing_pattern') {
    const text = `${name}です。各ステップの呼吸は：ステップ1は自然呼吸、2は吸う、3は吐く、4は吸う、5は吐く、6は保持、7は吸う、8は吐く、9は吸う、10は吐く、11は吸う、12は自然呼吸です。呼吸と動きを同期させることが大切です。`;
    updated.lastTeacherText = text;
    return { text, updatedContext: updated, action: { type: 'start_sequence', targetId: seq.id, label: `${seq.nameJa}を実践する` } };
  }

  if (questionType === 'how_to') {
    const stepNames = seq.steps.map((s, i) => `${i + 1}. ${s.nameJa}`).join('、');
    const text = `${name}です。${seq.nameJa}の12ステップは：${stepNames}。吸う・吐くを合わせながら流れるようにつなぎます。`;
    updated.lastTeacherText = text;
    return { text, updatedContext: updated, action: { type: 'start_sequence', targetId: seq.id, label: `${seq.nameJa}を実践する` } };
  }

  if (questionType === 'precautions') {
    const text = `${name}です。急な動きをしない、呼吸を無理に強くしない、不快感がある場合は中止してください。痛みがある場合は無理に進めないでください。`;
    updated.lastTeacherText = text;
    return { text, updatedContext: updated, action: { type: 'start_sequence', targetId: seq.id, label: `${seq.nameJa}を実践する` } };
  }

  const text = `${name}です。${seq.nameJa}は12ステップを呼吸とともにつなぐシークエンスです。やり方や呼吸について聞いてください。`;
  updated.lastTeacherText = text;
  return { text, updatedContext: updated, action: { type: 'start_sequence', targetId: seq.id, label: `${seq.nameJa}を実践する` } };
}

function buildMeditationAnswer(
  med: MeditationCatalogEntry,
  questionType: QuestionType,
  userMessage?: string,
): string {
  const name = med.nameJa;
  const durationMin = Math.round(med.durationSec / 60);
  const voiceEvents = med.timeline.filter((e) => e.type === 'voice' && e.text);
  const isBreathingTechQuestion = userMessage ? /呼吸法でしょ|呼吸法.*よね|呼吸法.*ですよね|呼吸法.*じゃない/.test(normalizeInput(userMessage)) : false;

  switch (questionType) {
    case 'definition': {
      const cat = med.category === 'concentration' ? '集中瞑想' : med.category === 'mindfulness' ? 'マインドフルネス瞑想' : med.category === 'yoga_nidra' ? 'Yoga Nidra' : '瞑想';
      if (med.category === 'concentration' && isBreathingTechQuestion) {
        return `${name}は、呼吸を無理にコントロールする呼吸法ではなく、自然な呼吸を数えることに意識を向ける${cat}です。AI先生では、初めてでも実践しやすい${durationMin}分版を用意しています。`;
      }
      const generalDef = buildMeditationGeneralDefinition(med, cat);
      return `${generalDef} AI先生では、初めてでも実践しやすい${durationMin}分版を用意しています。`;
    }

    case 'how_to': {
      const steps = voiceEvents.slice(0, 5).map((e, i) => `${i + 1}. ${e.text}`).join('\n');
      return `${name}は、以下のように行います。\n${steps}\n無理のない範囲で行ってください。`;
    }

    case 'teaching_points': {
      const points: string[] = [
        '- 数えることや集中を強制しない',
        '- 間違えても責めない',
        '- 雑念が出ることを失敗扱いしない',
        '- 静寂を邪魔しない',
        '- 途中で頻繁に声をかけない',
      ];
      return `教えるときは、以下に気を付けます。\n${points.join('\n')}\n本人のペースを尊重します。`;
    }

    case 'precautions': {
      const items: string[] = [
        '- 無理に集中しようとしない',
        '- 眠くなっても無理に目を開け続けなくてよい',
        '- 不快感が強い場合は中止する',
      ];
      return `注意点は以下の通りです。\n${items.join('\n')}`;
    }

    case 'beginner_adaptation': {
      const tips: string[] = [
        `- ${durationMin}分から始める`,
        '- 姿勢を完璧にしない',
        '- 目を閉じにくければ伏し目でもよい',
        '- 雑念が出ても失敗と考えない',
      ];
      return `初心者なら、以下のように調整します。\n${tips.join('\n')}\n自分のペースで無理なく進めて大丈夫です。`;
    }

    case 'focus_point': {
      if (med.category === 'concentration') return '呼吸を数えることに意識を集中します。数がそれたら、また一から数え直します。';
      if (med.category === 'mindfulness') return '今ここにある呼吸や身体感覚に、評価を加えず意識を向けます。';
      if (med.category === 'yoga_nidra') return '体の各部位への意識移動や、呼吸の観察に焦点を当てます。';
      return '呼吸や身体感覚に意識を向けます。';
    }

    case 'distraction_handling': {
      if (med.category === 'concentration') return '雑念が出たことに気づいたら、それを追いかけず、また一から呼吸を数え直します。雑念をなくそうと頑張るのではなく、気づいたら呼吸へ戻ることを繰り返します。';
      if (med.category === 'mindfulness') return '浮かんだ考えを無理に消そうとせず、いったん気づいて受け流し、また呼吸の感覚へ戻ります。善い悪いと判断しません。';
      return '気がそれたら、そっと呼吸や身体感覚へ意識を戻します。';
    }

    case 'purpose':
    case 'benefits_general': {
      const features: string[] = [];
      if (med.category === 'concentration') features.push('集中力を養う');
      if (med.category === 'mindfulness') features.push('今ここに気づく練習になる');
      if (med.category === 'yoga_nidra') features.push('深いリラクゼーションへ導く');
      features.push('呼吸や身体感覚に意識を向ける');
      return `${name}は、${features.join('、')}といった特徴があります。一般的な実践として紹介しており、治療効果を断定するものではありません。`;
    }

    case 'duration': {
      return `${name}そのものに必ず${durationMin}分という決まりがあるわけではありません。AI先生では、まず${durationMin}分版を用意しています。自分のペースに合わせて調整してください。`;
    }

    case 'comparison': {
      return `${name}は、${med.description}他の瞑想と比べる場合は、集中の対象や方法の違いに注目するとよいです。優劣はありません。`;
    }

    default: {
      const steps = voiceEvents.slice(0, 4).map((e, i) => `${i + 1}. ${e.text}`).join('\n');
      return `${name}についてお話しします。\n${steps}`;
    }
  }
}

function buildMeditationSpecificResponse(
  med: MeditationCatalogEntry,
  questionType: QuestionType,
  context: TeacherContext,
  prevContext?: ConversationContext,
  userMessage?: string,
): TeacherResponse {
  const name = context.persona?.name ?? 'AI先生';
  const isFollowup = prevContext?.lastMeditationId === med.id;
  const body = buildMeditationAnswer(med, questionType, userMessage);
  const text = isFollowup ? body : `${name}です。${body}`;
  return {
    text,
    knowledgeUsed: false,
    action: { type: 'start_meditation', targetId: med.id, label: `${med.nameJa}を実践する` },
    updatedContext: { ...prevContext, lastTeacherText: text, lastAssistantMode: 'knowledge_lookup', lastMeditationId: med.id, lastPracticeDomain: 'dhyana', lastTopic: med.nameJa, lastQuestionType: questionType, lastPoseId: undefined, lastBreathworkId: undefined },
  };
}

function buildTopicFollowupResponse(
  userMessage: string,
  context: TeacherContext,
  prevContext?: ConversationContext,
): TeacherResponse | null {
  const resolution = resolveEntity(
    userMessage,
    prevContext?.lastPracticeDomain,
    prevContext?.lastPoseId,
    prevContext?.lastBreathworkId,
    prevContext?.lastMeditationId,
  );

  if (resolution.breathworkId) {
    const bw = getBreathworkEntry(resolution.breathworkId);
    if (bw) return buildBreathworkSpecificResponse(bw, resolution.questionType, context, prevContext);
  }
  if (resolution.meditationId) {
    const med = getMeditationEntry(resolution.meditationId);
    if (med) return buildMeditationSpecificResponse(med, resolution.questionType, context, prevContext, userMessage);
  }
  if (resolution.poseId) {
    const pose = getCatalogEntry(resolution.poseId);
    if (pose) return buildPoseSpecificResponse(pose, resolution.questionType, context, prevContext);
  }
  return null;
}

function buildGeneralKnowledgeFallback(
  userMessage: string,
  context: TeacherContext,
  prevContext?: ConversationContext,
): TeacherResponse {
  const name = context.persona?.name ?? 'AI先生';
  const activeTopic = prevContext?.lastTopic;
  let text: string;
  if (activeTopic) {
    text = `${name}です。「${activeTopic}」について知りたいことか、別のポーズや呼吸法、瞑想について知りたいことか、もう少し教えていただけますか？例えば「やり方は？」「注意点は？」「初心者には？」のように聞いてもらえると、お答えしやすいです。`;
  } else {
    text = `${name}です。もう少し具体的に教えていただけますか？例えば「チャイルドポーズのやり方は？」「腹式呼吸って何？」「数息観って何？」のように聞いてもらえると、お答えしやすいです。`;
  }
  return {
    text,
    knowledgeUsed: false,
    updatedContext: { ...prevContext, lastUserMessage: userMessage, lastTeacherText: text, lastAssistantMode: 'general_explanation' },
  };
}

function buildPracticeRequestResponse(
  userMessage: string,
  context: TeacherContext,
  prevContext?: ConversationContext,
): TeacherResponse {
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
  merged.lastTeacherText = text;

  return {
    text,
    updatedContext: merged,
  };
}

export async function generateTeacherResponse(
  context: TeacherContext,
  userMessage: string,
  prevContext?: ConversationContext,
): Promise<TeacherResponse> {
  const result = await generateTeacherResponseInner(context, userMessage, prevContext);
  return stripActionIfSafety(result, prevContext);
}

async function generateTeacherResponseInner(
  context: TeacherContext,
  userMessage: string,
  prevContext?: ConversationContext,
): Promise<TeacherResponse> {
  const safetyHit = detectSafetyKeyword(userMessage);
  const intent = classifyIntent(userMessage);
  const name = context.persona?.name ?? 'AI先生';

  if (intent === 'contextual_followup') {
    const followup = buildTopicFollowupResponse(userMessage, context, prevContext);
    if (followup) return followup;
    return buildContextualFollowupResponse(userMessage, context, prevContext);
  }

  if (intent === 'conversational_clarification') {
    return buildClarificationResponse(userMessage, context, prevContext);
  }

  if (intent === 'safety_red_flag') {
    return buildSafetyRedFlagResponse(userMessage, context, prevContext);
  }

  if (intent === 'safety_general_information') {
    return buildSafetyGeneralInfoResponse(userMessage, context, prevContext);
  }

  if (safetyHit || intent === 'safety_sensitive') {
    if (isRedFlag(userMessage)) {
      return buildSafetyRedFlagResponse(userMessage, context, prevContext);
    }
    if (isPrescriptionRequest(userMessage) || intent === 'safety_prescription_request') {
      return buildSafetyPrescriptionResponse(userMessage, context, prevContext);
    }
    if (isGeneralInfoRequest(userMessage)) {
      return buildSafetyGeneralInfoResponse(userMessage, context, prevContext);
    }
    return buildSafetySensitiveResponse(userMessage, context, prevContext);
  }

  if (intent === 'safety_prescription_request') {
    return buildSafetyPrescriptionResponse(userMessage, context, prevContext);
  }

  if (intent === 'user_state') {
    return buildUserStateResponse(userMessage, context, prevContext);
  }

  if (intent === 'casual_conversation') {
    return buildCasualResponse(userMessage, context, prevContext);
  }

  if (intent === 'preference') {
    return buildPreferenceResponse(userMessage, context, prevContext);
  }

  if (intent === 'knowledge_question') {
    const resolution = resolveEntity(
      userMessage,
      prevContext?.lastPracticeDomain,
      prevContext?.lastPoseId,
      prevContext?.lastBreathworkId,
      prevContext?.lastMeditationId,
    );

    if (resolution.sequenceId) {
      const seq = getSequenceEntry(resolution.sequenceId);
      if (seq) return buildSequenceSpecificResponse(seq, resolution.questionType, context, prevContext);
    }
    if (resolution.breathworkId) {
      const bw = getBreathworkEntry(resolution.breathworkId);
      if (bw) return buildBreathworkSpecificResponse(bw, resolution.questionType, context, prevContext);
    }
    if (resolution.meditationId) {
      const med = getMeditationEntry(resolution.meditationId);
      if (med) return buildMeditationSpecificResponse(med, resolution.questionType, context, prevContext, userMessage);
    }
    if (resolution.poseId) {
      const pose = getCatalogEntry(resolution.poseId);
      if (pose) return buildPoseSpecificResponse(pose, resolution.questionType, context, prevContext);
    }

    const knowledgeResult = await tryKnowledgeLookup(userMessage, context, prevContext);
    if (knowledgeResult) return knowledgeResult;
    return buildGeneralKnowledgeFallback(userMessage, context, prevContext);
  }

  if (intent === 'practice_request') {
    const resolution = resolveEntity(
      userMessage,
      prevContext?.lastPracticeDomain,
      prevContext?.lastPoseId,
      prevContext?.lastBreathworkId,
      prevContext?.lastMeditationId,
    );
    if (resolution.sequenceId) {
      const seq = getSequenceEntry(resolution.sequenceId);
      if (seq) return buildSequenceSpecificResponse(seq, resolution.questionType, context, prevContext);
    }
    if (resolution.breathworkId) {
      const bw = getBreathworkEntry(resolution.breathworkId);
      if (bw) return buildBreathworkSpecificResponse(bw, resolution.questionType, context, prevContext);
    }
    if (resolution.meditationId) {
      const med = getMeditationEntry(resolution.meditationId);
      if (med) return buildMeditationSpecificResponse(med, resolution.questionType, context, prevContext, userMessage);
    }
    if (resolution.poseId) {
      const pose = getCatalogEntry(resolution.poseId);
      if (pose) return buildPoseSpecificResponse(pose, resolution.questionType, context, prevContext);
    }
    return buildPracticeRequestResponse(userMessage, context, prevContext);
  }

  const text = `${name}です。うまく応答を作れませんでした。もう一度送っていただけますか？`;
  return {
    text,
    updatedContext: { ...prevContext, lastUserMessage: userMessage, lastTeacherText: text },
  };
}

function stripActionIfSafety(response: TeacherResponse, prevContext?: ConversationContext): TeacherResponse {
  if (response.action && response.action.type !== 'none' && response.action.type !== 'open_today_plan') {
    if (response.isSafety || prevContext?.safetyContextActive) {
      return { ...response, action: undefined };
    }
  }
  return response;
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

type PracticeTypeLike = 'asana' | 'pranayama' | 'dhyana' | 'sequence';
