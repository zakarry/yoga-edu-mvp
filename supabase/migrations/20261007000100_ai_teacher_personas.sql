-- Teacher identity belongs to an account, independent of browser storage.
CREATE TABLE public.ai_teacher_personas (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  persona jsonb NOT NULL CHECK (jsonb_typeof(persona) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_teacher_personas ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_teacher_personas TO authenticated;
CREATE POLICY "owner reads teacher" ON public.ai_teacher_personas FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "owner creates teacher" ON public.ai_teacher_personas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner updates teacher" ON public.ai_teacher_personas FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner deletes teacher" ON public.ai_teacher_personas FOR DELETE TO authenticated USING (auth.uid() = user_id);
