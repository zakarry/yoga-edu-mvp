/*
# Create public Directory and My Teacher relationships

1. New public Directory tables
- `teachers`, `schools`, `events`, and `clubs` store the existing Directory records.
- `id` is the database identifier; `legacy_id` preserves the original data.ts identifier.
- `name`, `area`, `lat`, `lng`, `description`, and `payload` preserve the existing frontend data.
- `is_published` controls whether a record is visible in the public Directory.
- `schools.google_place_id` is reserved for a future Places integration and is not used now.

2. New relationship table
- `teacher_relationships` records a user's current or past relationship with a teacher.
- `relationship_type` is primary, regular, or specialist.
- `status` is active or ended, with start and end timestamps.

3. Security
- Directory tables have RLS enabled and permit only published SELECT access to anon and authenticated roles.
- Directory INSERT, UPDATE, and DELETE are intentionally unavailable to browser users.
- Teacher relationships are private to the signed-in owner and use separate CRUD policies.
- A partial unique index prevents duplicate active relationships for the same user and teacher.
*/

CREATE TABLE IF NOT EXISTS public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), legacy_id text NOT NULL UNIQUE, name text NOT NULL, area text NOT NULL,
  lat double precision NOT NULL, lng double precision NOT NULL, description text NOT NULL, payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), legacy_id text NOT NULL UNIQUE, name text NOT NULL, area text NOT NULL,
  lat double precision NOT NULL, lng double precision NOT NULL, description text NOT NULL, google_place_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb, is_published boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), legacy_id text NOT NULL UNIQUE, name text NOT NULL, area text NOT NULL,
  lat double precision NOT NULL, lng double precision NOT NULL, description text NOT NULL, payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), legacy_id text NOT NULL UNIQUE, name text NOT NULL, area text NOT NULL,
  lat double precision NOT NULL, lng double precision NOT NULL, description text NOT NULL, payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.teacher_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
  relationship_type text NOT NULL CHECK (relationship_type IN ('primary', 'regular', 'specialist')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')), started_at timestamptz NOT NULL DEFAULT now(), ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ended_relationship_requires_end_date CHECK (status = 'active' OR ended_at IS NOT NULL),
  CONSTRAINT active_relationship_has_no_end_date CHECK (status = 'ended' OR ended_at IS NULL)
);
CREATE INDEX IF NOT EXISTS teachers_published_idx ON public.teachers (is_published);
CREATE INDEX IF NOT EXISTS schools_published_idx ON public.schools (is_published);
CREATE INDEX IF NOT EXISTS events_published_idx ON public.events (is_published);
CREATE INDEX IF NOT EXISTS clubs_published_idx ON public.clubs (is_published);
CREATE INDEX IF NOT EXISTS teacher_relationships_user_idx ON public.teacher_relationships (user_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS teacher_relationships_active_unique_idx ON public.teacher_relationships (user_id, teacher_id) WHERE status = 'active';
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_relationships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "published teachers are publicly readable" ON public.teachers;
CREATE POLICY "published teachers are publicly readable" ON public.teachers FOR SELECT TO anon, authenticated USING (is_published = true);
DROP POLICY IF EXISTS "published schools are publicly readable" ON public.schools;
CREATE POLICY "published schools are publicly readable" ON public.schools FOR SELECT TO anon, authenticated USING (is_published = true);
DROP POLICY IF EXISTS "published events are publicly readable" ON public.events;
CREATE POLICY "published events are publicly readable" ON public.events FOR SELECT TO anon, authenticated USING (is_published = true);
DROP POLICY IF EXISTS "published clubs are publicly readable" ON public.clubs;
CREATE POLICY "published clubs are publicly readable" ON public.clubs FOR SELECT TO anon, authenticated USING (is_published = true);
DROP POLICY IF EXISTS "users can read own teacher relationships" ON public.teacher_relationships;
CREATE POLICY "users can read own teacher relationships" ON public.teacher_relationships FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "users can create own teacher relationships" ON public.teacher_relationships;
CREATE POLICY "users can create own teacher relationships" ON public.teacher_relationships FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "users can update own teacher relationships" ON public.teacher_relationships;
CREATE POLICY "users can update own teacher relationships" ON public.teacher_relationships FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "users can delete own teacher relationships" ON public.teacher_relationships;
CREATE POLICY "users can delete own teacher relationships" ON public.teacher_relationships FOR DELETE TO authenticated USING (auth.uid() = user_id);