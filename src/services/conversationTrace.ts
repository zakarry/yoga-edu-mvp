// In-memory, per-request diagnostics. Never include credentials, user IDs or messages.
export interface ConversationTrace {
  engineEntered: boolean;
  oldTemplateFallback: boolean;
  buildGeneralKnowledgeFallback: boolean;
  historyTurns: number;
  knowledgeItems: number;
  outcome: 'started' | 'safety' | 'llm' | 'unavailable';
  reason?: string;
  httpStatus?: number;
}
let trace: ConversationTrace | null = null;
export function startConversationTrace(historyTurns: number): void {
  trace = { engineEntered: true, oldTemplateFallback: false, buildGeneralKnowledgeFallback: false, historyTurns, knowledgeItems: 0, outcome: 'started' };
}
export function updateConversationTrace(update: Partial<ConversationTrace>): void {
  if (trace) trace = { ...trace, ...update };
}
export function getConversationTrace(): ConversationTrace | null { return trace ? { ...trace } : null; }
