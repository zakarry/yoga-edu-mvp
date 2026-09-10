/*
  # Server-side rate limit for the paid AI teacher LLM calls

  1. New table
     - `ai_teacher_llm_usage`
       - `id` uuid primary key
       - `user_id` uuid not null, references auth.users
       - `created_at` timestamptz default now()

  2. Security
     - RLS enabled with NO client policies: the table is not readable or writable
       through the Data API. It is only touched by the SECURITY DEFINER function below.
     - No table privileges are granted to anon or authenticated.

  3. New function
     - `claim_ai_teacher_llm_call()` — SECURITY DEFINER, keyed on auth.uid().
       Takes a per-user transaction advisory lock, counts the caller's calls in the
       trailing 60 seconds and records a new one only if it is below the limit of 5.
       Returns jsonb {"allowed": bool, "retry_after_seconds": int}.
       This replaces a browser-only counter that could simply be skipped.
*/

CREATE TABLE IF NOT EXISTS public.ai_teacher_llm_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_teacher_llm_usage ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS ai_teacher_llm_usage_user_created_idx
  ON public.ai_teacher_llm_usage (user_id, created_at DESC);

REVOKE ALL ON public.ai_teacher_llm_usage FROM anon;
REVOKE ALL ON public.ai_teacher_llm_usage FROM authenticated;

CREATE OR REPLACE FUNCTION public.claim_ai_teacher_llm_call()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_window_seconds int := 60;
  v_max_calls int := 5;
  v_count int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_authenticated');
  END IF;

  -- Serialize concurrent claims for this user so two requests cannot both pass.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  SELECT count(*) INTO v_count
  FROM ai_teacher_llm_usage
  WHERE user_id = v_uid
    AND created_at > now() - make_interval(secs => v_window_seconds);

  IF v_count >= v_max_calls THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'rate_limited', 'retry_after_seconds', v_window_seconds);
  END IF;

  INSERT INTO ai_teacher_llm_usage (user_id) VALUES (v_uid);

  DELETE FROM ai_teacher_llm_usage
  WHERE user_id = v_uid
    AND created_at < now() - make_interval(secs => v_window_seconds * 60);

  RETURN jsonb_build_object('allowed', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_ai_teacher_llm_call() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_ai_teacher_llm_call() FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_ai_teacher_llm_call() TO authenticated;
