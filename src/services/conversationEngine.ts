import type { TeacherContext } from './teacherContextService';
import type { ConversationContext, TeacherResponse } from './teacherResponseService';
import type { ConversationTurn } from './conversationHistory';
import type { AITeacherLLMRequest, LLMKnowledgeItem, LLMPersona, LLMSessionContext } from '../types/aiTeacherLLM';
import { fetchLLMExplanation } from './llmExplanationService';
import { classifyIntent, resolveEntity, isConversationRepair } from './safetyAndIntent';
import { assessCurrentTurn, safetyMessage } from '../../supabase/functions/_shared/currentTurnPolicy';
import { retrieveConversationKnowledge, clearRetrievalTrace } from './conversationKnowledge';
import { sanitizeKnowledgePayload } from './knowledgeGuardService';
import { startConversationTrace, updateConversationTrace } from './conversationTrace';
import { buildPoseSpecificResponse, buildBreathworkSpecificResponse, buildMeditationSpecificResponse, buildSequenceSpecificResponse } from './teacherResponseService';
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
  clearRetrievalTrace();
  const assessment = assessCurrentTurn(userMessage);
  updateConversationTrace({intent:assessment.intent,safety:assessment.safety,repair:false});
  // Current-turn Safety → Intent → Repair → Knowledge → General Conversation.
  // The server independently repeats this gate before any provider request.
  if (assessment.safety !== 'none') {
    const text = `${name}です。${safetyMessage(assessment.safety)}`;
    return { text, isSafety: true, responseSource: 'safety_gate', updatedContext: {
      ...prevContext, lastUserMessage:userMessage, lastTeacherText:text,
      safetyHoldActive:true, safetyHoldReason:assessment.safety, safetyActiveSignals:[assessment.safety],
      lastAssistantMode:'safety_red_flag', lastTeacherSuggestion:undefined,
    }};
  }
  const legacyIntent = classifyIntent(userMessage);
  const intent = assessment.intent === 'prevention' ? 'prevention' : legacyIntent.startsWith('safety_') ? 'knowledge_question' : legacyIntent;
  updateConversationTrace({intent,repair:isConversationRepair(userMessage) && turns.length>=2});
  // Repairs use the same complete history and grounded retrieval path; no early LLM shortcut.
  const knowledgeItems: LLMKnowledgeItem[] = (await retrieveConversationKnowledge(userMessage, turns)).map(sanitizeKnowledgePayload);
  updateConversationTrace({ outcome:'started', knowledgeItems:knowledgeItems.length });

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
    const metadata = knowledgeItems.length > 0 && (intent === 'practice_request' || intent === 'knowledge_question') ? getPracticeMetadata(userMessage, context, prevContext) : undefined;
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
