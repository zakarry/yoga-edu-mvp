-- Owner-only registration drafts. Does not grant editing of published Directory records.
CREATE TABLE public.teacher_registration_drafts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  values jsonb NOT NULL CHECK (jsonb_typeof(values) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.teacher_registration_drafts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.teacher_registration_drafts TO authenticated;
CREATE POLICY "owner reads registration" ON public.teacher_registration_drafts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "owner creates registration" ON public.teacher_registration_drafts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner updates registration" ON public.teacher_registration_drafts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
