/*
# Revoke EXECUTE on handle_new_user from anon and authenticated

## Purpose
The `handle_new_user()` trigger function is SECURITY DEFINER and was callable
via the REST API by anon and authenticated roles. It should only be invoked
by the database trigger on `auth.users`, never directly by clients.

## Changes
- REVOKE EXECUTE on `public.handle_new_user` from `anon` and `authenticated`.
- Grant EXECUTE only to the `postgres` role (trigger execution context).

## Security
This closes the advisor warning about public SECURITY DEFINER function execution.
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
