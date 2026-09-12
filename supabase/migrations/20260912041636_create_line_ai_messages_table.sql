CREATE TABLE IF NOT EXISTS public.line_ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  line_user_id text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('user', 'assistant')),
  message_text text,
  intent text,
  safety_flag boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.line_ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "line_ai_messages_select_own"
  ON public.line_ai_messages FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "line_ai_messages_insert_own"
  ON public.line_ai_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "line_ai_messages_delete_own"
  ON public.line_ai_messages FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_line_ai_messages_line_user ON public.line_ai_messages (line_user_id, created_at DESC);
CREATE INDEX idx_line_ai_messages_user ON public.line_ai_messages (user_id, created_at DESC);
