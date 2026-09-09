/*
# Fix: update_updated_at_column search_path

## Problem
The `update_updated_at_column()` trigger function has a mutable search_path,
which the Security Advisor flags as a warning.

## Fix
Recreate the function with an explicit `search_path = public` setting.
This prevents search_path injection attacks.

## Notes
- Function behavior is unchanged.
- The 2 other Security Advisor warnings (start_pro_yoga_learning, update_pro_yoga_learning_progress)
  are pre-existing Pro Yoga functions from earlier migrations, NOT from K1.
*/

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
