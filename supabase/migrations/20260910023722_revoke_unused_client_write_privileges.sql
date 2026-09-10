/*
  # Revoke write privileges that no policy permits

  1. Problem
     - `anon` and `authenticated` held INSERT / UPDATE / DELETE / TRUNCATE on the
       curated knowledge tables, on `pro_yoga_certifications`, and (for `anon`) on the
       per-user tables. No RLS policy allows those writes today, so nothing is
       exploitable, but the privilege is a standing hazard: the first permissive
       policy added to any of these tables would immediately expose writes.

  2. Change
     - Revoke only the privileges no policy uses. SELECT is untouched everywhere so
       every existing read in the app keeps working.
     - Curated knowledge tables: read-only for clients (imports run with the service role).
     - `pro_yoga_certifications`: writes only happen inside SECURITY DEFINER RPCs.
     - Per-user tables: `anon` loses writes; `authenticated` loses the verbs with no
       matching policy (UPDATE on diagnoses/practice_logs, DELETE on privacy_settings)
       and TRUNCATE everywhere.
*/

-- Curated knowledge: client read-only
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.knowledge_entries FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.knowledge_contents FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.knowledge_sources FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.knowledge_source_sections FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.knowledge_relations FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.learning_mappings FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.practice_knowledge FROM anon, authenticated;

-- Certification state is only written by the role-checking RPCs
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.pro_yoga_certifications FROM anon, authenticated;

-- Per-user tables: no anon writes at all
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.diagnoses FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.practice_logs FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.privacy_settings FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.user_learning_progress FROM anon;

-- Per-user tables: drop the verbs authenticated has no policy for
REVOKE UPDATE, TRUNCATE ON public.diagnoses FROM authenticated;
REVOKE UPDATE, TRUNCATE ON public.practice_logs FROM authenticated;
REVOKE DELETE, TRUNCATE ON public.privacy_settings FROM authenticated;
REVOKE TRUNCATE ON public.user_learning_progress FROM authenticated;
REVOKE TRUNCATE ON public.teacher_relationships FROM authenticated;
