-- STAGING ONLY: run only in a confirmed new, separate Supabase project.
-- Not a production migration. No production data/UUIDs/providers/Edge functions.
BEGIN;
DO $$ BEGIN
  IF to_regclass('auth.users') IS NULL THEN RAISE EXCEPTION 'Supabase Auth schema required'; END IF;
  IF EXISTS (SELECT 1 FROM auth.users) OR EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')
  ) THEN RAISE EXCEPTION 'Refusing non-empty project: staging bootstrap is fresh-project-only'; END IF;
END $$;
/*
# Create profiles and privacy_settings tables with RLS

## Purpose
Phase 1 of the Yoga AI Supabase integration. Creates the two foundational
myYOGA tables — profiles (user identity) and privacy_settings (user-controlled
data retention consent) — with full Row Level Security.

## New Tables

### 1. profiles
- `id` uuid, primary key, references `auth.users(id)` ON DELETE CASCADE
- `role` text, CHECK constraint limits to 'student' | 'teacher' | 'both'
- `display_name` text, nullable
- `preferred_language` text, default 'ja'
- `area` text, nullable
- `created_at` timestamptz, default now()
- `updated_at` timestamptz, default now()

### 2. privacy_settings
- `user_id` uuid, primary key, references `auth.users(id)` ON DELETE CASCADE
- `save_diagnosis` boolean, default false
- `save_practice_history` boolean, default false
- `allow_ai_memory` boolean, default false
- `allow_teacher_sharing` boolean, default false
- `allow_sensitive_data_storage` boolean, default false
- `updated_at` timestamptz, default now()

All privacy defaults are false: the app never stores user data to the cloud
unless the user explicitly opts in.

## Automation
- A trigger (`handle_new_user`) fires AFTER INSERT on `auth.users` to auto-create
  a matching `profiles` row (role='student') and a `privacy_settings` row (all
  false). This ensures every new signup has both rows ready.

## Security (RLS)
Both tables have RLS enabled. Policies are scoped TO authenticated with
auth.uid() ownership checks:
- profiles: SELECT / INSERT / UPDATE own row only
- privacy_settings: SELECT / INSERT / UPDATE own row only

No DELETE policies are granted to users; rows are removed only via the
ON DELETE CASCADE from auth.users.

## Notes
1. This migration is idempotent — safe to re-run.
2. No service_role key is used in the frontend; only anon key.
3. privacy_settings defaults to all-false per the user-consent-first design.
*/

-- =========================================================
-- 1. profiles table
-- =========================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'both')),
  display_name text,
  preferred_language text NOT NULL DEFAULT 'ja',
  area text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =========================================================
-- 2. privacy_settings table
-- =========================================================
CREATE TABLE IF NOT EXISTS privacy_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  save_diagnosis boolean NOT NULL DEFAULT false,
  save_practice_history boolean NOT NULL DEFAULT false,
  allow_ai_memory boolean NOT NULL DEFAULT false,
  allow_teacher_sharing boolean NOT NULL DEFAULT false,
  allow_sensitive_data_storage boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_privacy" ON privacy_settings;
CREATE POLICY "select_own_privacy" ON privacy_settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_privacy" ON privacy_settings;
CREATE POLICY "insert_own_privacy" ON privacy_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_privacy" ON privacy_settings;
CREATE POLICY "update_own_privacy" ON privacy_settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- 3. Auto-create rows on signup
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, 'student')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.privacy_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

/*
# Create user_consents table — terms/privacy agreement history

1. New Table: public.user_consents
   - id                  uuid PK, auto-generated
   - user_id             uuid NOT NULL, references auth.users(id) ON DELETE CASCADE
   - terms_version       text NOT NULL (e.g. "1.0")
   - privacy_version     text NOT NULL (e.g. "1.0")
   - terms_accepted_at   timestamptz NOT NULL DEFAULT now()
   - privacy_accepted_at timestamptz NOT NULL DEFAULT now()
   - created_at          timestamptz NOT NULL DEFAULT now()

2. Constraints
   - UNIQUE (user_id, terms_version, privacy_version) — prevents duplicate
     consent records for the same version combination. Each new version
     agreement is a new INSERT, never an UPDATE.
   - No UNIQUE on user_id alone — multiple version rows per user are expected.

3. Security (RLS)
   - RLS ENABLED.
   - SELECT:  TO authenticated, USING (auth.uid() = user_id) — users can read
     only their own consent records.
   - INSERT:  TO authenticated, WITH CHECK (auth.uid() = user_id) — users can
     insert consent records only for themselves.
   - UPDATE:  NO policy — users cannot modify existing consent records.
   - DELETE:  NO policy — users cannot delete consent records.
   - When the auth.users account is deleted, ON DELETE CASCADE removes all
     related user_consents rows automatically.
   - service_role bypasses RLS for administrative access.

4. Design Notes
   - This table is an immutable audit log of consent. New version agreements
     add new rows; old rows are preserved for compliance history.
   - The application checks for a row matching (user_id, CURRENT_TERMS_VERSION,
     CURRENT_PRIVACY_VERSION). If none exists, a ConsentGate is shown.
   - No updated_at column or trigger — rows are never updated.
*/

CREATE TABLE IF NOT EXISTS public.user_consents (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version       text        NOT NULL,
  privacy_version     text        NOT NULL,
  terms_accepted_at   timestamptz NOT NULL DEFAULT now(),
  privacy_accepted_at timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: one consent record per (user, terms_version, privacy_version)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_user_consents_user_versions'
  ) THEN
    ALTER TABLE public.user_consents
      ADD CONSTRAINT uq_user_consents_user_versions
      UNIQUE (user_id, terms_version, privacy_version);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- SELECT: users can read only their own consent records
DROP POLICY IF EXISTS "select_own_consents" ON public.user_consents;
CREATE POLICY "select_own_consents"
  ON public.user_consents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: users can insert consent records only for themselves
DROP POLICY IF EXISTS "insert_own_consents" ON public.user_consents;
CREATE POLICY "insert_own_consents"
  ON public.user_consents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE policy — users cannot modify consent records.
-- No DELETE policy — users cannot delete consent records.
-- Account deletion cascades via auth.users ON DELETE CASCADE.

-- Compatibility fields, with safe defaults and no privileged bootstrap.
ALTER TABLE public.profiles ADD COLUMN is_admin boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN is_super_admin boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN membership_tier text NOT NULL DEFAULT 'free' CHECK (membership_tier IN ('free','paid'));
ALTER TABLE public.profiles ADD CONSTRAINT staging_super_admin_requires_admin CHECK (NOT is_super_admin OR is_admin);
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles, public.privacy_settings, public.user_consents FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.profiles, public.privacy_settings, public.user_consents TO authenticated;
GRANT INSERT (id,role,display_name,preferred_language,area) ON public.profiles TO authenticated;
GRANT UPDATE (role,display_name,preferred_language,area,updated_at) ON public.profiles TO authenticated;
GRANT INSERT, UPDATE ON public.privacy_settings TO authenticated;
GRANT INSERT ON public.user_consents TO authenticated;
ALTER FUNCTION public.handle_new_user() SET search_path = '';
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
COMMIT;
-- Next apply the reviewed canonical 20261013000100_ai_teacher_settings.sql once.
