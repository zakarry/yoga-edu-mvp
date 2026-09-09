export interface LLMKnowledgeItem {
  title: string;
  category: string;
  content: string;
}

export interface LLMSessionContext {
  requestedMinutes: number | null;
  requestedType: string | null;
  requestedStyle: string | null;
  explanationPreference: string;
  cuePreference: string;
  praisePreference: string;
  practiceSummary: {
    totalSessions: number;
    favoriteTypes: string[];
    preferredStyle: string | null;
  };
}

export interface LLMPersona {
  name: string;
  personality: string;
  specialty: string;
  teachingLanguage: string;
}

export interface AITeacherLLMRequest {
  userMessage: string;
  persona: LLMPersona;
  sessionContext: LLMSessionContext;
  knowledge: LLMKnowledgeItem[];
}
