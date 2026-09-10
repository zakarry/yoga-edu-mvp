/*
  # LINE Login support tables

  1. Purpose
     - LINE is not a built-in Supabase OAuth provider, so we implement it as a
       custom Edge Function flow. Two server-side tables are needed:
       - `line_auth_states`: one-time CSRF state tokens for the OAuth state parameter
       - `line_identities`: maps a LINE user (by `sub`) to a Supabase auth.users row

  2. New Tables
     - `line_auth_states`
       - `id` uuid PK
       - `state` text UNIQUE NOT NULL — the random opaque token sent to LINE and verified on callback
       - `redirect_to` text NOT NULL — where to send the user after session is established
       - `consumed` boolean NOT NULL DEFAULT false — prevents replay
       - `created_at` timestamptz NOT NULL DEFAULT now() — for TTL (old states are ignored)
     - `line_identities`
       - `line_sub` text PK — LINE's stable user identifier (the `sub` claim from the ID token)
       - `user_id` uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE — the linked Supabase user
       - `display_name` text — LINE display name at time of link (for reference only)
       - `created_at` timestamptz NOT NULL DEFAULT now()

  3. Security
     - RLS ENABLED on both tables with NO policies.
     - No grants to `anon` or `authenticated`.
     - Only the `service_role` (used inside the Edge Function) can read/write.
     - The `line_auth_states` table is write-once: a state is inserted on start,
       marked consumed on callback, and never updated again.
     - The `line_identities` table is the canonical LINE→Supabase user mapping.
       No automatic merging with existing email/Google accounts: each LINE user
       gets its own Supabase user row.

  4. Notes
     - `line_auth_states` rows are short-lived. The Edge Function should reject
       any state older than 10 minutes or already consumed.
     - No user-facing data (profiles, diagnoses, etc.) is stored in these tables.
     - `membership_tier` for LINE-created users defaults to `free` via the
       existing `profiles` trigger (`handle_new_user`).
*/

CREATE TABLE IF NOT EXISTS public.line_auth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text UNIQUE NOT NULL,
  redirect_to text NOT NULL,
  consumed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.line_auth_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.line_auth_states FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.line_identities (
  line_sub text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.line_identities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.line_identities FROM anon, authenticated;
