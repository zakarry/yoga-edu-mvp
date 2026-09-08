/*
# Pro Yoga Certifications table + RLS + RPCs

## Purpose
Track a teacher's Pro Yoga certification journey: learning progress,
application, exam pass, and certification. Users can start learning and
update their own progress, but cannot self-certify.

## Security model
- SELECT: own row only (RLS)
- INSERT/UPDATE: blocked via RLS (no policies)
- Mutations only through SECURITY DEFINER RPCs with fixed search_path
- EXECUTE on RPCs granted to authenticated only (NOT PUBLIC)
- passed/certified/applied statuses are never set by user-facing RPCs
*/

CREATE TABLE IF NOT EXISTS public.pro_yoga_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'learning', 'applied', 'passed', 'certified')),
  learning_progress integer NOT NULL DEFAULT 0
    CHECK (learning_progress >= 0 AND learning_progress <= 100),
  started_at timestamptz,
  applied_at timestamptz,
  passed_at timestamptz,
  certified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pro_yoga_certifications ENABLE ROW LEVEL SECURITY;

-- SELECT: own row only
CREATE POLICY "select_own_pro_yoga" ON public.pro_yoga_certifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies — direct table writes are blocked.
-- All mutations go through SECURITY DEFINER RPCs below.

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_pro_yoga_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pro_yoga_updated_at ON public.pro_yoga_certifications;
CREATE TRIGGER pro_yoga_updated_at
  BEFORE UPDATE ON public.pro_yoga_certifications
  FOR EACH ROW EXECUTE FUNCTION public.set_pro_yoga_updated_at();

-- RPC: start_pro_yoga_learning()
-- Creates row if missing, sets status='learning', records started_at.
-- Never touches passed/certified.
CREATE OR REPLACE FUNCTION public.start_pro_yoga_learning()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.pro_yoga_certifications;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  SELECT * INTO v_row
    FROM public.pro_yoga_certifications
    WHERE user_id = v_uid
    FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.pro_yoga_certifications (user_id, status, started_at)
    VALUES (v_uid, 'learning', now())
    RETURNING * INTO v_row;
  ELSE
    -- Only allow transition from not_started to learning
    IF v_row.status = 'not_started' THEN
      UPDATE public.pro_yoga_certifications
        SET status = 'learning', started_at = COALESCE(started_at, now())
        WHERE user_id = v_uid
        RETURNING * INTO v_row;
    END IF;
  END IF;

  RETURN jsonb_build_object('data', to_jsonb(v_row));
END;
$$;

-- RPC: update_pro_yoga_learning_progress(progress integer)
-- Updates learning_progress (0-100). If status is not_started, bumps to learning.
-- Never touches passed/certified/applied.
CREATE OR REPLACE FUNCTION public.update_pro_yoga_learning_progress(p_progress integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.pro_yoga_certifications;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  IF p_progress IS NULL OR p_progress < 0 OR p_progress > 100 THEN
    RETURN jsonb_build_object('error', 'invalid_progress');
  END IF;

  SELECT * INTO v_row
    FROM public.pro_yoga_certifications
    WHERE user_id = v_uid
    FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.pro_yoga_certifications (user_id, status, learning_progress, started_at)
    VALUES (v_uid, 'learning', p_progress, now())
    RETURNING * INTO v_row;
  ELSE
    IF v_row.status IN ('passed', 'certified') THEN
      -- Don't modify progress for certified/passed users
      RETURN jsonb_build_object('data', to_jsonb(v_row));
    END IF;

    UPDATE public.pro_yoga_certifications
      SET learning_progress = p_progress,
          status = CASE WHEN v_row.status = 'not_started' THEN 'learning' ELSE v_row.status END,
          started_at = COALESCE(started_at, now())
      WHERE user_id = v_uid
      RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object('data', to_jsonb(v_row));
END;
$$;

-- Revoke EXECUTE from PUBLIC (PostgreSQL grants EXECUTE to PUBLIC by default)
REVOKE EXECUTE ON FUNCTION public.start_pro_yoga_learning() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_pro_yoga_learning_progress(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_pro_yoga_updated_at() FROM PUBLIC;

-- Grant EXECUTE to authenticated only
GRANT EXECUTE ON FUNCTION public.start_pro_yoga_learning() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_pro_yoga_learning_progress(integer) TO authenticated;
