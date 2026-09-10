/*
  # Restrict profile column writes so membership tier cannot be self-assigned

  1. Problem
     - `authenticated` held table-level UPDATE/INSERT on `public.profiles`, and the
       `update_own_profile` policy is row-scoped, so a user could PATCH their own row
       and set `membership_tier` to 'paid', unlocking the paid AI teacher feature.

  2. Change
     - Revoke table-level UPDATE and INSERT on `public.profiles` from `anon` and `authenticated`.
     - Re-grant UPDATE only on the columns the profile screen writes
       (display_name, role, preferred_language, area, updated_at).
     - Re-grant INSERT only on the columns needed for the self-heal insert path
       (id, role, display_name, preferred_language, area), so `membership_tier`
       always takes its 'free' default.

  3. Notes
     - SELECT is untouched: the app reads `profiles` with select('*') and reads
       `membership_tier` for the paid gate.
     - `membership_tier` remains writable by `postgres` / `service_role` only.
     - Existing RLS policies are unchanged; they still restrict rows to auth.uid().
*/

REVOKE UPDATE ON public.profiles FROM authenticated;
REVOKE UPDATE ON public.profiles FROM anon;
REVOKE INSERT ON public.profiles FROM authenticated;
REVOKE INSERT ON public.profiles FROM anon;
REVOKE TRUNCATE ON public.profiles FROM authenticated;
REVOKE TRUNCATE ON public.profiles FROM anon;
REVOKE DELETE ON public.profiles FROM authenticated;
REVOKE DELETE ON public.profiles FROM anon;

GRANT UPDATE (display_name, role, preferred_language, area, updated_at)
  ON public.profiles TO authenticated;

GRANT INSERT (id, role, display_name, preferred_language, area)
  ON public.profiles TO authenticated;
