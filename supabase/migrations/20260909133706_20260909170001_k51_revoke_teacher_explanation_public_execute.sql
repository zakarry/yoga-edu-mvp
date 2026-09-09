/*
# K5.1: Remove default PUBLIC execution after function recreation

1. Security
- PostgreSQL grants EXECUTE to PUBLIC by default when a function is created.
- Remove PUBLIC and anon execution after the hardened function exists.
- Keep authenticated execution for the signed-in My AI Teacher flow.
*/

REVOKE EXECUTE ON FUNCTION public.lookup_teacher_explanation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_teacher_explanation(text) TO authenticated;
