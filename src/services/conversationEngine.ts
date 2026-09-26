import type { TeacherContext } from './teacherContextService';
import type { ConversationContext, TeacherResponse } from './teacherResponseService';
import type { ConversationTurn } from './conversationHistory';
import type { AITeacherLLMRequest, LLMKnowledgeItem, LLMPersona, LLMSessionContext } from '../types/aiTeacherLLM';
import { fetchLLMExplanation } from './llmExplanationService';
import { classifyIntent, detectSafetyKeyword, isRedFlag, isPrescriptionRequest, isGeneralInfoRequest, resolveEntity, isConversationRepair } from './safetyAndIntent';
import { getKnowledgeRanking } from './teacherKnowledgeService';
import { sanitizeKnowledgePayload, MAX_KNOWLEDGE_ITEMS } from './knowledgeGuardService';
import { startConversationTrace, updateConversationTrace } from './conversationTrace';
import { buildSafetySensitiveResponse, buildSafetyRedFlagResponse, buildSafetyPrescriptionResponse, buildSafetyGeneralInfoResponse, buildPoseSpecificResponse, buildBreathworkSpecificResponse, buildMeditationSpecificResponse, buildSequenceSpecificResponse } from './teacherResponseService';
import { getCatalogEntry } from '../lib/poseCatalog';
import { getBreathworkEntry } from '../lib/breathworkCatalog';
import { getMeditationEntry } from '../lib/meditationCatalog';
import { getSequenceEntry } from '../lib/sequenceCatalog';

function getPracticeMetadata(message: string, context: TeacherContext, previous?: ConversationContext): TeacherResponse | undefined {
  const entity = resolveEntity(message, previous?.lastPracticeDomain, previous?.lastPoseId, previous?.lastBreathworkId, previous?.lastMeditationId);
  const sequence = entity.sequenceId && getSequenceEntry(entity.sequenceId);
  if (sequence) return buildSequenceSpecificResponse(sequence, entity.questionType, context, previous);
  const breathwork = entity.breathworkId && getBreathworkEntry(entity.breathworkId);
  if (breathwork) return buildBreathworkSpecificResponse(breathwork, entity.questionType, context, previous);
  const meditation = entity.meditationId && getMeditationEntry(entity.meditationId);
  if (meditation) return buildMeditationSpecificResponse(meditation, entity.questionType, context, previous, message);
  const pose = entity.poseId && getCatalogEntry(entity.poseId);
  if (pose) return buildPoseSpecificResponse(pose, entity.questionType, context, previous);
}

export async function generateConversationResponse(
  context: TeacherContext,
  userMessage: string,
  turns: ConversationTurn[],
  prevContext?: ConversationContext,
): Promise<TeacherResponse> {
  startConversationTrace(turns.length);
  updateConversationTrace({ outcome: 'safety' });
  const name = context.persona?.name ?? 'AI先生';
  const safetyHit = detectSafetyKeyword(userMessage);
  const intent = classifyIntent(userMessage);

  // ── Safety gate: deterministic, never bypass ──
  // Rule 2: Safety context resets when the current message has no safety keyword.
  // The previous safety hold no longer forces a safety response for unrelated topics.
  // Safety is re-evaluated based on the CURRENT message only.
  if (prevContext?.safetyHoldActive) {
    const isExplicitRelease = /今は痛くない|今はいたくない|今日は痛くない|痛くない|いたくない|もう痛くない|痛みはありません|痛みはない|今は大丈夫|もう大丈夫|治った|なおった|しびれもありません|しびれはない|めまいもありません|めまいはない|息苦しくない/.test(userMessage);
    if (isExplicitRelease) {
      const text = `${name}です。教えてくれてありがとうございます。無理のない範囲で進めていきましょう。`;
      return {
        text,
        safetyReleased: true,
        safetyActiveSignals: [],
        responseSource: 'safety_gate',
        updatedContext: { ...prevContext, lastUserMessage: userMessage, lastTeacherText: text, safetyHoldActive: false, safetyHoldReason: undefined, safetyActiveSignals: [], lastAssistantMode: 'casual' },
      };
    }
  }

  // Rule 3: Conversation repair signals take priority — the user is telling us
  // the previous response missed the point. Route to LLM with repair context.
  if (isConversationRepair(userMessage) && turns.length >= 2) {
    updateConversationTrace({ outcome: 'started', knowledgeItems: 0 });
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
      knowledge: [],
      turns,
      memory: context.memorySummary ? {
        favoritePractices: context.memorySummary.favoritePractices,
        preferredDuration: context.memorySummary.preferredDuration,
        preferredExplanation: context.memorySummary.preferredExplanation,
        preferredTone: context.memorySummary.preferredTone,
      } : undefined,
    };
    const llmResult = await fetchLLMExplanation(llmPayload, context.userId ?? null);
    if (llmResult.text && !llmResult.fallback) {
      updateConversationTrace({ outcome: 'llm', httpStatus: llmResult.httpStatus });
      return {
        text: llmResult.text,
        responseSource: 'llm',
        updatedContext: {
          ...prevContext,
          lastUserMessage: userMessage,
          lastTeacherText: llmResult.text,
          lastAssistantMode: 'general_explanation',
          safetyHoldActive: false,
          safetyHoldReason: undefined,
          safetyActiveSignals: [],
        },
      };
    }
    // Fallback: acknowledge and ask what the user actually wants to discuss
    const fallbackText = `${name}です。すみません、うまく伝わらなかったようですね。今お話ししたいことを教えていただけますか？`;
    return {
      text: fallbackText,
      responseSource: 'error',
      updatedContext: {
        ...prevContext,
        lastUserMessage: userMessage,
        lastTeacherText: fallbackText,
        safetyHoldActive: false,
        safetyHoldReason: undefined,
        safetyActiveSignals: [],
      },
    };
  }

  if (intent === 'safety_red_flag') {
    return buildSafetyRedFlagResponse(userMessage, context, prevContext);
  }
  if (safetyHit || intent === 'safety_sensitive') {
    if (isRedFlag(userMessage)) return buildSafetyRedFlagResponse(userMessage, context, prevContext);
    if (isPrescriptionRequest(userMessage) || intent === 'safety_prescription_request') return buildSafetyPrescriptionResponse(userMessage, context, prevContext);
    if (isGeneralInfoRequest(userMessage)) return buildSafetyGeneralInfoResponse(userMessage, context, prevContext);
    return buildSafetySensitiveResponse(userMessage, context, prevContext);
  }
  if (intent === 'safety_prescription_request') {
    return buildSafetyPrescriptionResponse(userMessage, context, prevContext);
  }
  if (intent === 'safety_general_information') {
    return buildSafetyGeneralInfoResponse(userMessage, context, prevContext);
  }

  // Knowledge enriches the same LLM request; it must never terminate conversation.
  let knowledgeItems: LLMKnowledgeItem[] = [];
  try {
    const ranked = await getKnowledgeRanking(userMessage);
    knowledgeItems = ranked.filter(item => item.score >= 40).slice(0, MAX_KNOWLEDGE_ITEMS).map(item => sanitizeKnowledgePayload(item.entry));
  } catch {
    // A retrieval outage must not prevent general conversation.
  }
  updateConversationTrace({ outcome: 'started', knowledgeItems: knowledgeItems.length });

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
    turns,
    memory: context.memorySummary ? {
      favoritePractices: context.memorySummary.favoritePractices,
      preferredDuration: context.memorySummary.preferredDuration,
      preferredExplanation: context.memorySummary.preferredExplanation,
      preferredTone: context.memorySummary.preferredTone,
    } : undefined,
  };

  const llmResult = await fetchLLMExplanation(llmPayload, context.userId ?? null);

  if (llmResult.text && !llmResult.fallback) {
    updateConversationTrace({ outcome: 'llm', httpStatus: llmResult.httpStatus });
    // Keep existing explicit practice actions without using their template text.
    const metadata = intent === 'practice_request' || intent === 'knowledge_question' ? getPracticeMetadata(userMessage, context, prevContext) : undefined;
    return {
      action: metadata?.action,
      knowledgeUsed: knowledgeItems.length > 0,
      knowledgeSource: knowledgeItems.length > 0 ? 'yoga_knowledge' : undefined,
      text: llmResult.text,
      responseSource: 'llm',
      updatedContext: {
        ...prevContext,
        ...metadata?.updatedContext,
        lastUserMessage: userMessage,
        lastTeacherText: llmResult.text,
        lastAssistantMode: 'general_explanation',
      },
    };
  }

  updateConversationTrace({ outcome: 'unavailable', reason: llmResult.reason, httpStatus: llmResult.httpStatus });
  return {
    text: llmResult.reason === 'rate_limited'
      ? '少し時間をおいてから、続けてお話しください。'
      : '今、先生との通信がうまくいきませんでした。少し時間をおいて、もう一度お試しください。',
    responseSource: 'error',
    updatedContext: prevContext,
  };
}
