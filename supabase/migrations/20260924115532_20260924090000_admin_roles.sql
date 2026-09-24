BEGIN;
-- DRAFT: apply only with an explicitly approved initial Super Admin assignment.
-- No automatic promotion. Keep the existing is_admin flag for compatibility.
ALTER TABLE public.profiles ADD COLUMN is_super_admin boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD CONSTRAINT super_admin_requires_admin CHECK (NOT is_super_admin OR is_admin);
REVOKE INSERT (is_super_admin), UPDATE (is_super_admin) ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT (is_super_admin) ON public.profiles TO authenticated;

CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  target_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('member_updated','admin_granted','admin_revoked','super_admin_bootstrap')),
  before_values jsonb NOT NULL,
  after_values jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_audit_log FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_audit_log TO authenticated;
CREATE POLICY super_admin_audit_read ON public.admin_audit_log FOR SELECT TO authenticated
USING (auth.jwt()->>'aal' = 'aal2' AND EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.is_admin AND p.is_super_admin
));

-- Definer RPCs use the caller's signed JWT, not a caller-provided actor ID.
-- Row locks serialize revocation with in-flight writes; expected version prevents lost updates.
CREATE FUNCTION public.admin_update_member(p_target uuid, p_expected_updated_at timestamptz, p_patch jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_before public.profiles%ROWTYPE;
  v_after public.profiles%ROWTYPE;
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF v_actor IS NULL OR auth.jwt()->>'aal' IS DISTINCT FROM 'aal2' THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='MFA_REQUIRED';
  END IF;
  PERFORM 1 FROM public.profiles WHERE id IN (v_actor,p_target) ORDER BY id FOR UPDATE;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=v_actor AND is_admin) THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='FORBIDDEN';
  END IF;
  SELECT * INTO v_before FROM public.profiles WHERE id=p_target;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='NOT_FOUND'; END IF;
  IF p_expected_updated_at IS NULL OR v_before.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='CONFLICT';
  END IF;
  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' OR p_patch='{}'::jsonb THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='INVALID_FIELDS';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_patch) k WHERE k NOT IN ('display_name','area','role','membership_tier')) THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='INVALID_FIELDS';
  END IF;
  IF (p_patch ? 'display_name' AND (jsonb_typeof(p_patch->'display_name') NOT IN ('string','null') OR length(p_patch->>'display_name')>100))
    OR (p_patch ? 'area' AND (jsonb_typeof(p_patch->'area') NOT IN ('string','null') OR length(p_patch->>'area')>120))
    OR (p_patch ? 'role' AND ((p_patch->>'role') IS NULL OR (p_patch->>'role') NOT IN ('student','teacher','both')))
    OR (p_patch ? 'membership_tier' AND ((p_patch->>'membership_tier') IS NULL OR (p_patch->>'membership_tier') NOT IN ('free','paid'))) THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='INVALID_FIELDS';
  END IF;
  v_old := jsonb_build_object('display_name',v_before.display_name,'area',v_before.area,'role',v_before.role,'membership_tier',v_before.membership_tier);
  UPDATE public.profiles SET
    display_name=CASE WHEN p_patch ? 'display_name' THEN p_patch->>'display_name' ELSE display_name END,
    area=CASE WHEN p_patch ? 'area' THEN p_patch->>'area' ELSE area END,
    role=CASE WHEN p_patch ? 'role' THEN p_patch->>'role' ELSE role END,
    membership_tier=CASE WHEN p_patch ? 'membership_tier' THEN p_patch->>'membership_tier' ELSE membership_tier END,
    updated_at=clock_timestamp()
  WHERE id=p_target RETURNING * INTO v_after;
  v_new := jsonb_build_object('display_name',v_after.display_name,'area',v_after.area,'role',v_after.role,'membership_tier',v_after.membership_tier);
  INSERT INTO public.admin_audit_log(actor_id,target_id,action,before_values,after_values)
    VALUES(v_actor,p_target,'member_updated',v_old,v_new);
  RETURN jsonb_build_object('updatedAt',v_after.updated_at);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_update_member(uuid,timestamptz,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_member(uuid,timestamptz,jsonb) TO authenticated;

CREATE FUNCTION public.admin_set_admin(p_target uuid, p_expected_updated_at timestamptz, p_enabled boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_actor uuid:=auth.uid(); v_before public.profiles%ROWTYPE; v_updated timestamptz;
BEGIN
  IF v_actor IS NULL OR auth.jwt()->>'aal' IS DISTINCT FROM 'aal2' THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='MFA_REQUIRED';
  END IF;
  PERFORM 1 FROM public.profiles WHERE id IN (v_actor,p_target) ORDER BY id FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=v_actor AND is_admin AND is_super_admin) THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='FORBIDDEN';
  END IF;
  SELECT * INTO v_before FROM public.profiles WHERE id=p_target;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='NOT_FOUND'; END IF;
  -- This endpoint only manages regular admins; never removes or creates a Super Admin.
  IF v_before.is_super_admin OR v_actor=p_target THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='PROTECTED_ADMIN';
  END IF;
  IF p_enabled IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='INVALID_FIELDS'; END IF;
  IF p_expected_updated_at IS NULL OR v_before.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='CONFLICT';
  END IF;
  IF v_before.is_admin=p_enabled THEN RETURN jsonb_build_object('updatedAt',v_before.updated_at); END IF;
  UPDATE public.profiles SET is_admin=p_enabled,updated_at=clock_timestamp() WHERE id=p_target RETURNING updated_at INTO v_updated;
  INSERT INTO public.admin_audit_log(actor_id,target_id,action,before_values,after_values)
    VALUES(v_actor,p_target,CASE WHEN p_enabled THEN 'admin_granted' ELSE 'admin_revoked' END,
      jsonb_build_object('is_admin',v_before.is_admin),jsonb_build_object('is_admin',p_enabled));
  RETURN jsonb_build_object('updatedAt',v_updated);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_admin(uuid,timestamptz,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_admin(uuid,timestamptz,boolean) TO authenticated;

-- Existing BM5 privileges must not be inherited by newly appointed regular Admins.
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT schemaname,tablename,policyname,cmd FROM pg_policies
    WHERE schemaname='breath_manager_v5' AND policyname LIKE 'bm5_admin_%'
  LOOP
    EXECUTE format('ALTER POLICY %I ON %I.%I USING (auth.jwt()->>''aal'' = ''aal2'' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.is_admin AND p.is_super_admin))',p.policyname,p.schemaname,p.tablename);
    IF p.cmd='UPDATE' THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I WITH CHECK (auth.jwt()->>''aal'' = ''aal2'' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.is_admin AND p.is_super_admin))',p.policyname,p.schemaname,p.tablename);
    END IF;
  END LOOP;
END;
$$;
-- Fix 1: Add internal admin check to bm5_search_preview RPC
-- The RPC is SECURITY DEFINER so it bypasses RLS.
-- We must check auth.uid() against profiles.is_admin inside the function body.
CREATE OR REPLACE FUNCTION breath_manager_v5.bm5_search_preview(
  p_query text DEFAULT NULL,
  p_entry_type text DEFAULT NULL,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  retrieval_id text,
  entry_type text,
  entry_id text,
  title text,
  category_id text,
  answer_preview text,
  production_ready boolean,
  preview_allowed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Server-side admin check: reject non-admin users
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_admin = true AND p.is_super_admin = true AND auth.jwt()->>'aal' = 'aal2'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin privileges required';
  END IF;

  RETURN QUERY
  SELECT
    rp.retrieval_id,
    rp.entry_type,
    rp.entry_id,
    rp.title,
    rp.category_id,
    rp.answer_preview,
    rp.production_ready,
    rp.preview_allowed
  FROM breath_manager_v5.bm5_retrieval_preview rp
  WHERE (p_query IS NULL OR rp.title ILIKE '%' || p_query || '%' OR rp.answer_preview ILIKE '%' || p_query || '%')
    AND (p_entry_type IS NULL OR rp.entry_type = p_entry_type)
  ORDER BY rp.entry_type, rp.entry_id
  LIMIT p_limit;
END;
$$;

-- Revoke anon, keep authenticated (RPC internally checks admin)
REVOKE EXECUTE ON FUNCTION breath_manager_v5.bm5_search_preview(text, text, int) FROM anon;
GRANT EXECUTE ON FUNCTION breath_manager_v5.bm5_search_preview(text, text, int) TO authenticated;


REVOKE EXECUTE ON FUNCTION breath_manager_v5.bm5_search_preview(text,text,int) FROM PUBLIC;

DO $$
DECLARE target_id uuid := 'c8d541a4-dccb-4f2b-a44e-306bb0e09e2d';
BEGIN
  PERFORM 1 FROM public.profiles WHERE id=target_id FOR UPDATE;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=target_id AND is_admin AND display_name='kaz ohashi')
     OR (SELECT count(*) FROM public.profiles WHERE is_admin) <> 1
     OR EXISTS (SELECT 1 FROM public.profiles WHERE is_super_admin) THEN
    RAISE EXCEPTION 'Initial Super Admin precondition failed';
  END IF;
  UPDATE public.profiles SET is_super_admin=true,updated_at=clock_timestamp() WHERE id=target_id;
  INSERT INTO public.admin_audit_log(actor_id,target_id,action,before_values,after_values)
  VALUES(target_id,target_id,'super_admin_bootstrap','{"is_super_admin":false}'::jsonb,'{"is_super_admin":true}'::jsonb);
END;
$$;

COMMIT;