ALTER TABLE public.practice_logs
  ADD COLUMN IF NOT EXISTS practice_session_id uuid DEFAULT gen_random_uuid();

ALTER TABLE public.practice_logs
  ALTER COLUMN practice_session_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS practice_logs_user_session_unique
  ON public.practice_logs (user_id, practice_session_id);
