export interface LLMKnowledgeItem {
  title: string;
  category: string;
  content: string;
}

export interface LLMSessionContext {
  practiceSummary: {
    totalSessions: number;
    favoriteTypes: string[];
    preferredStyle: string | null;
  };
  conversationContext: Record<string, unknown>;
}

export interface LLMPersona {
  name: string;
  personality: string;
  specialty: string;
  uiLanguage: string;
  teachingLanguage: string;
}

export interface AITeacherLLMRequest {
  userMessage: string;
  persona: LLMPersona;
  sessionContext: LLMSessionContext;
  knowledge: LLMKnowledgeItem[];
}
