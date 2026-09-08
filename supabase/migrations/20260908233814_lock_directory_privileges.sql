/*
# Lock public Directory privileges

RLS already denies unpublished rows and has no write policies. This migration
also removes the underlying browser-role table privileges so anon and
authenticated receive SELECT only, matching the intended public Directory
contract.
*/
REVOKE ALL ON TABLE public.teachers, public.schools, public.events, public.clubs FROM anon, authenticated;
GRANT SELECT ON TABLE public.teachers, public.schools, public.events, public.clubs TO anon, authenticated;
REVOKE ALL ON TABLE public.teacher_relationships FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.teacher_relationships TO authenticated;