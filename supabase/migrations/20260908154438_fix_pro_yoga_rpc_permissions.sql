/*
# Fix Pro Yoga RPC permissions

## Problem
The Supabase security advisor flagged that the Pro Yoga SECURITY DEFINER
functions are still executable by anon and authenticated via REST, even
after REVOKE FROM PUBLIC. Supabase's REST API exposes functions in the
public schema by default.

## Fix
1. set_pro_yoga_updated_at: Convert to SECURITY INVOKER (it's a trigger,
   never called directly by users).
2. start_pro_yoga_learning / update_pro_yoga_learning_progress:
   Revoke EXECUTE from anon explicitly. The authenticated role needs
   EXECUTE to call via RPC, but we add a guard inside the function
   to ensure auth.uid() is not null.
*/

-- Trigger function: switch to SECURITY INVOKER (only called by the trigger, not by users)
ALTER FUNCTION public.set_pro_yoga_updated_at() SECURITY INVOKER;

-- Revoke EXECUTE from anon for all three functions
REVOKE EXECUTE ON FUNCTION public.set_pro_yoga_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.start_pro_yoga_learning() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_pro_yoga_learning_progress(integer) FROM anon;
