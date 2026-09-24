export interface ConversationTurn {
  role: 'user' | 'teacher';
  text: string;
}

export const MAX_CONVERSATION_TURNS = 6;

export function buildConversationTurns(
  messages: Array<{ role: string; text: string }>,
  maxTurns: number = MAX_CONVERSATION_TURNS,
): ConversationTurn[] {
  const turns: ConversationTurn[] = [];
  for (const msg of messages) {
    const role = msg.role === 'user' ? 'user' : 'teacher';
    const text = (msg.text ?? '').trim();
    if (text.length === 0) continue;
    turns.push({ role, text });
  }
  return turns.slice(-maxTurns);
}
