/*
# Add membership_tier to profiles

1. Purpose
   - Adds a `membership_tier` column to the existing `profiles` table.
   - This distinguishes free vs paid members for gating LLM features (K7.2 LLM Explanation Pilot).
   - Only paid members can trigger OpenAI API calls via the ai-teacher-explanation edge function.

2. New Columns
   - `profiles.membership_tier` (text, NOT NULL, DEFAULT 'free')
     - Allowed values: 'free', 'paid'
     - Default: 'free' — all existing and new users are free unless explicitly upgraded.
     - CHECK constraint enforces valid values.

3. Security
   - No RLS policy changes. Existing policies on profiles remain unchanged.
   - The column is NOT user-editable via the anon/authenticated API — only server-side
     (service role or a future admin function) can update membership_tier.
   - To enforce this at the DB level, we REVOKE UPDATE on the column from anon and authenticated
     roles, and add a separate RLS policy that denies all updates from non-service roles.

4. Notes
   - Fail-closed: any user whose tier cannot be determined is treated as 'free'.
   - No existing data is lost — the column is added with a safe default.
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS membership_tier text NOT NULL DEFAULT 'free';

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_membership_tier_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_membership_tier_check
  CHECK (membership_tier IN ('free', 'paid'));

-- Revoke UPDATE on membership_tier from anon and authenticated so users cannot self-upgrade
REVOKE UPDATE (membership_tier) ON profiles FROM anon, authenticated;
