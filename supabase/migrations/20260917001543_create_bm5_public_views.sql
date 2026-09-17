/*
# Create public-schema views for BM5 tables (PostgREST exposure fix)

## Problem
PostgREST only exposes the `public` schema. `breath_manager_v5` tables
are invisible to the Data API, so the admin page sees 0 tests.

## Fix
Create views in `public` that SELECT from `breath_manager_v5` tables.
Use `security_invoker = true` so RLS on the underlying tables still applies.

## Views (all in public):
- bm5_acceptance_tests_view
- bm5_knowledge_view
- bm5_catalog_view
- bm5_passages_view
- bm5_safety_view
- bm5_issues_view
- bm5_editorial_corrections_view

## Security
- security_invoker = true on all views
- RLS on breath_manager_v5 tables gates actual row access
- Only authenticated role gets SELECT; anon revoked
*/

DROP VIEW IF EXISTS public.bm5_acceptance_tests_view;
DROP VIEW IF EXISTS public.bm5_knowledge_view;
DROP VIEW IF EXISTS public.bm5_catalog_view;
DROP VIEW IF EXISTS public.bm5_passages_view;
DROP VIEW IF EXISTS public.bm5_safety_view;
DROP VIEW IF EXISTS public.bm5_issues_view;
DROP VIEW IF EXISTS public.bm5_editorial_corrections_view;

CREATE VIEW public.bm5_acceptance_tests_view AS
  SELECT * FROM breath_manager_v5.bm5_acceptance_tests;
ALTER VIEW public.bm5_acceptance_tests_view SET (security_invoker = true);

CREATE VIEW public.bm5_knowledge_view AS
  SELECT * FROM breath_manager_v5.bm5_knowledge;
ALTER VIEW public.bm5_knowledge_view SET (security_invoker = true);

CREATE VIEW public.bm5_catalog_view AS
  SELECT * FROM breath_manager_v5.bm5_catalog;
ALTER VIEW public.bm5_catalog_view SET (security_invoker = true);

CREATE VIEW public.bm5_passages_view AS
  SELECT * FROM breath_manager_v5.bm5_passages;
ALTER VIEW public.bm5_passages_view SET (security_invoker = true);

CREATE VIEW public.bm5_safety_view AS
  SELECT * FROM breath_manager_v5.bm5_safety;
ALTER VIEW public.bm5_safety_view SET (security_invoker = true);

CREATE VIEW public.bm5_issues_view AS
  SELECT * FROM breath_manager_v5.bm5_issues;
ALTER VIEW public.bm5_issues_view SET (security_invoker = true);

CREATE VIEW public.bm5_editorial_corrections_view AS
  SELECT * FROM breath_manager_v5.bm5_editorial_corrections;
ALTER VIEW public.bm5_editorial_corrections_view SET (security_invoker = true);

GRANT SELECT ON public.bm5_acceptance_tests_view TO authenticated;
GRANT SELECT ON public.bm5_knowledge_view TO authenticated;
GRANT SELECT ON public.bm5_catalog_view TO authenticated;
GRANT SELECT ON public.bm5_passages_view TO authenticated;
GRANT SELECT ON public.bm5_safety_view TO authenticated;
GRANT SELECT ON public.bm5_issues_view TO authenticated;
GRANT SELECT ON public.bm5_editorial_corrections_view TO authenticated;

GRANT UPDATE ON public.bm5_acceptance_tests_view TO authenticated;

REVOKE ALL ON public.bm5_acceptance_tests_view FROM anon;
REVOKE ALL ON public.bm5_knowledge_view FROM anon;
REVOKE ALL ON public.bm5_catalog_view FROM anon;
REVOKE ALL ON public.bm5_passages_view FROM anon;
REVOKE ALL ON public.bm5_safety_view FROM anon;
REVOKE ALL ON public.bm5_issues_view FROM anon;
REVOKE ALL ON public.bm5_editorial_corrections_view FROM anon;
