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
