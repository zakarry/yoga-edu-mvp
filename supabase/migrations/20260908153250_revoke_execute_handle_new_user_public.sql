/*
# Revoke EXECUTE on handle_new_user from PUBLIC

## Purpose
The earlier migration revoked EXECUTE from anon and authenticated roles, but
PostgreSQL grants EXECUTE to PUBLIC by default for functions. The Supabase
security advisor confirmed that PUBLIC still had EXECUTE on handle_new_user().

This migration revokes EXECUTE from PUBLIC explicitly, closing the last gap.
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
