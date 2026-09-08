/*
# Add role check to Pro Yoga RPCs

## Purpose
Ensure only teacher/both users can start Pro Yoga learning or update progress.
student users are blocked at the DB level, not just UI.

## Changes
- start_pro_yoga_learning(): add profiles.role check
- update_pro_yoga_learning_progress(): add profiles.role check
- Both already have: SECURITY DEFINER, fixed search_path, auth.uid() NULL guard,
  no dynamic SQL, passed/certified protection, applied not settable
*/

CREATE OR REPLACE FUNCTION public.start_pro_yoga_learning()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_row public.pro_yoga_certifications;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role IS NULL OR v_role NOT IN ('teacher', 'both') THEN
    RETURN jsonb_build_object('error', 'teacher_role_required');
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

CREATE OR REPLACE FUNCTION public.update_pro_yoga_learning_progress(p_progress integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_row public.pro_yoga_certifications;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role IS NULL OR v_role NOT IN ('teacher', 'both') THEN
    RETURN jsonb_build_object('error', 'teacher_role_required');
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

-- Re-grant EXECUTE to authenticated only (CREATE OR REPLACE resets grants)
REVOKE EXECUTE ON FUNCTION public.start_pro_yoga_learning() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.start_pro_yoga_learning() FROM anon;
GRANT EXECUTE ON FUNCTION public.start_pro_yoga_learning() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_pro_yoga_learning_progress(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_pro_yoga_learning_progress(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_pro_yoga_learning_progress(integer) TO authenticated;
