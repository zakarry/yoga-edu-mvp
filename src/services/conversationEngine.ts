import type { TeacherContext } from './teacherContextService';
import type { ConversationContext, TeacherResponse } from './teacherResponseService';
import type { ConversationTurn } from './conversationHistory';
import type { AITeacherLLMRequest, LLMKnowledgeItem, LLMPersona, LLMSessionContext } from '../types/aiTeacherLLM';
import { fetchLLMExplanation } from './llmExplanationService';
import { classifyIntent, detectSafetyKeyword, isRedFlag, isPrescriptionRequest, isGeneralInfoRequest, resolveEntity, type ConversationIntent } from './safetyAndIntent';
import { getCatalogEntry } from '../lib/poseCatalog';
import { getBreathworkEntry } from '../lib/breathworkCatalog';
import { getMeditationEntry } from '../lib/meditationCatalog';
import { getSequenceEntry } from '../lib/sequenceCatalog';

// Re-import the template functions we need as fallbacks from teacherResponseService.
// We import them lazily via a dynamic require pattern is not possible in ESM,
// so we import them statically. These are the same functions already exported.
import {
  buildUserStateResponse,
  buildCasualResponse,
  buildPreferenceResponse,
  buildPracticeRequestResponse,
  buildSafetySensitiveResponse,
  buildSafetyRedFlagResponse,
  buildSafetyPrescriptionResponse,
  buildSafetyGeneralInfoResponse,
  buildPoseSpecificResponse,
  buildBreathworkSpecificResponse,
  buildMeditationSpecificResponse,
  buildSequenceSpecificResponse,
  buildTopicFollowupResponse,
  buildContextualFollowupResponse,
  buildClarificationResponse,
  tryBreathworkKnowledgeLookup,
  tryKnowledgeLookup,
} from './teacherResponseService';

const CONVERSATION_FALLBACK = '今うまくお返事を作れませんでした。少し言い方を変えてもう一度話してもらえますか？';

export async function generateConversationResponse(
  context: TeacherContext,
  userMessage: string,
  turns: ConversationTurn[],
  prevContext?: ConversationContext,
): Promise<TeacherResponse> {
  const name = context.persona?.name ?? 'AI先生';
  const safetyHit = detectSafetyKeyword(userMessage);
  const intent = classifyIntent(userMessage);

  // ── Safety gate: deterministic, never bypass ──
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

  // ── Knowledge retrieval (auxiliary: feeds LLM context, not a dead-end) ──
  const knowledgeItems: LLMKnowledgeItem[] = [];

  if (intent === 'knowledge_question' || intent === 'practice_request') {
    const resolution = resolveEntity(
      userMessage,
      prevContext?.lastPracticeDomain,
      prevContext?.lastPoseId,
      prevContext?.lastBreathworkId,
      prevContext?.lastMeditationId,
    );

    // Entity-specific responses (pose/breathwork/meditation/sequence) are still
    // useful for structured answers with action buttons. These return directly.
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

    // Try BM5 / breathwork knowledge / yoga knowledge lookups.
    // If they succeed with knowledgeUsed, they already called the LLM internally
    // (tryKnowledgeLookup calls fetchLLMExplanation). Return those directly.
    const breathworkResult = await tryBreathworkKnowledgeLookup(userMessage, context, prevContext);
    if (breathworkResult && breathworkResult.knowledgeUsed) {
      return breathworkResult;
    }

    const knowledgeResult = await tryKnowledgeLookup(userMessage, context, prevContext);
    if (knowledgeResult && knowledgeResult.knowledgeUsed) {
      return knowledgeResult;
    }
  }

  // ── LLM conversation (main engine) ──
  // For all non-safety intents (user_state, casual_conversation, knowledge_question
  // that didn't resolve to an entity, contextual_followup, etc.) we call the LLM
  // with conversation history + persona + knowledge context.
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
  };

  const llmResult = await fetchLLMExplanation(llmPayload, context.userId ?? null);

  if (llmResult.text && !llmResult.fallback) {
    return {
      text: llmResult.text,
      responseSource: 'llm',
      updatedContext: {
        ...prevContext,
        lastUserMessage: userMessage,
        lastTeacherText: llmResult.text,
        lastAssistantMode: 'general_explanation',
      },
    };
  }

  // ── LLM failed: graceful fallback to old templates ──
  return oldTemplateFallback(context, userMessage, intent, prevContext, name);
}

function oldTemplateFallback(
  context: TeacherContext,
  userMessage: string,
  intent: ConversationIntent,
  prevContext: ConversationContext | undefined,
  name: string,
): TeacherResponse {
  if (intent === 'user_state') {
    return buildUserStateResponse(userMessage, context, prevContext);
  }
  if (intent === 'casual_conversation') {
    return buildCasualResponse(userMessage, context, prevContext);
  }
  if (intent === 'preference') {
    return buildPreferenceResponse(userMessage, context, prevContext);
  }
  if (intent === 'contextual_followup') {
    const followup = buildTopicFollowupResponse(userMessage, context, prevContext);
    if (followup) return followup;
    return buildContextualFollowupResponse(userMessage, context, prevContext);
  }
  if (intent === 'conversational_clarification') {
    return buildClarificationResponse(userMessage, context, prevContext);
  }
  if (intent === 'practice_request') {
    if (prevContext?.safetyHoldActive) {
      const text = `${name}です。先ほど痛みがあると教えてもらっているので、通常のヨガ実践は今は進めないようにしましょう。`;
      return {
        text,
        isSafety: true,
        responseSource: 'safety_gate',
        updatedContext: { ...prevContext, lastUserMessage: userMessage, lastTeacherText: text, lastAssistantMode: 'safety_restriction' },
      };
    }
    return buildPracticeRequestResponse(userMessage, context, prevContext);
  }

  // Last resort: graceful conversational fallback (NOT the old FAQ prompt)
  return {
    text: `${name}です。${CONVERSATION_FALLBACK}`,
    responseSource: 'error',
    updatedContext: { ...prevContext, lastUserMessage: userMessage, lastTeacherText: CONVERSATION_FALLBACK },
  };
}
