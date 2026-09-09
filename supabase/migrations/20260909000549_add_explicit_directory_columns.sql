/*
# Add explicit search columns to Directory tables

1. Purpose
- Previously the Directory tables stored all search-relevant attributes only inside a jsonb `payload` column.
- This migration promotes the primary search fields to explicit, typed, indexed columns so the database can filter and verify them directly.
- `payload` is retained as a backward-compatible mirror of the full original record for any fields not yet promoted; it is no longer the source of truth for the promoted columns.

2. teachers
- Adds profile_id (reserved for future teacher-owned profile link), target_levels, specialties, formats, certifications, foreign_support_status, languages, language_level, pro_yoga_status, beginner_friendly, verified.
- Renames lat/lng to latitude/longitude via add+copy+drop (no data loss for the existing 10 seeded rows).

3. schools
- Adds school_types, programs, strengths, foreign_support_status, languages, international_support_level, pro_yoga_supported, featured, priority_rank, admin_recommended, website_url, verified.
- Renames lat/lng to latitude/longitude.

4. events
- Adds event_date, organizer_type, event_types, content_tags, foreign_participant_status, languages, has_interpreter, is_international_event, verified.
- Renames lat/lng to latitude/longitude.

5. clubs
- Adds club_types, activities, foreign_participant_status, languages, international_exchange_available, verified.
- Renames lat/lng to latitude/longitude.

6. Safety
- Adds columns nullable first, backfills from payload, then enforces NOT NULL where the source data is always present.
- Does not DROP the payload column; it is kept as a compatibility mirror.
- Does not touch teacher_relationships (already correct).
*/

-- helper: jsonb array -> text[] via jsonb_array_elements_text
CREATE OR REPLACE FUNCTION public._jsonb_to_text_array(j jsonb) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(array_agg(e::text), ARRAY[]::text[]) FROM jsonb_array_elements_text(j) AS e;
$$;

-- teachers: add explicit columns
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS target_levels text[];
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS specialties text[];
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS formats text[];
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS certifications text[];
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS foreign_support_status text;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS languages text[];
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS language_level text;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS pro_yoga_status text;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS beginner_friendly boolean NOT NULL DEFAULT false;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;

UPDATE public.teachers SET
  latitude = lat,
  longitude = lng,
  target_levels = public._jsonb_to_text_array(payload->'targetLevels'),
  specialties = public._jsonb_to_text_array(payload->'specialties'),
  formats = public._jsonb_to_text_array(payload->'formats'),
  certifications = public._jsonb_to_text_array(payload->'certifications'),
  foreign_support_status = COALESCE(payload->>'foreignSupportStatus', ''),
  languages = public._jsonb_to_text_array(payload->'languages'),
  language_level = COALESCE(payload->>'languageLevel', ''),
  pro_yoga_status = COALESCE(payload->>'proYogaStatus', ''),
  beginner_friendly = public._jsonb_to_text_array(payload->'targetLevels') @> ARRAY['初心者'],
  verified = false
WHERE latitude IS NULL;

ALTER TABLE public.teachers DROP COLUMN lat;
ALTER TABLE public.teachers DROP COLUMN lng;
ALTER TABLE public.teachers ALTER COLUMN latitude SET NOT NULL;
ALTER TABLE public.teachers ALTER COLUMN longitude SET NOT NULL;
ALTER TABLE public.teachers ALTER COLUMN target_levels SET NOT NULL;
ALTER TABLE public.teachers ALTER COLUMN specialties SET NOT NULL;
ALTER TABLE public.teachers ALTER COLUMN formats SET NOT NULL;
ALTER TABLE public.teachers ALTER COLUMN certifications SET NOT NULL;
ALTER TABLE public.teachers ALTER COLUMN foreign_support_status SET NOT NULL;
ALTER TABLE public.teachers ALTER COLUMN languages SET NOT NULL;
ALTER TABLE public.teachers ALTER COLUMN language_level SET NOT NULL;
ALTER TABLE public.teachers ALTER COLUMN pro_yoga_status SET NOT NULL;

-- schools: add explicit columns
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS school_types text[];
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS programs text[];
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS strengths text[];
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS foreign_support_status text;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS languages text[];
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS international_support_level text;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS pro_yoga_supported boolean NOT NULL DEFAULT false;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS priority_rank integer NOT NULL DEFAULT 0;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS admin_recommended boolean NOT NULL DEFAULT false;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS website_url text;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;

UPDATE public.schools SET
  latitude = lat,
  longitude = lng,
  school_types = public._jsonb_to_text_array(payload->'schoolTypes'),
  programs = public._jsonb_to_text_array(payload->'programs'),
  strengths = public._jsonb_to_text_array(payload->'strengths'),
  foreign_support_status = COALESCE(payload->>'foreignSupportStatus', ''),
  languages = public._jsonb_to_text_array(payload->'languages'),
  international_support_level = COALESCE(payload->>'internationalSupportLevel', ''),
  pro_yoga_supported = COALESCE((payload->>'proYogaSupported')::boolean, false),
  featured = COALESCE((payload->>'featured')::boolean, false),
  priority_rank = COALESCE((payload->>'priorityRank')::integer, 0),
  admin_recommended = COALESCE((payload->>'adminRecommended')::boolean, false),
  verified = false
WHERE latitude IS NULL;

ALTER TABLE public.schools DROP COLUMN lat;
ALTER TABLE public.schools DROP COLUMN lng;
ALTER TABLE public.schools ALTER COLUMN latitude SET NOT NULL;
ALTER TABLE public.schools ALTER COLUMN longitude SET NOT NULL;
ALTER TABLE public.schools ALTER COLUMN school_types SET NOT NULL;
ALTER TABLE public.schools ALTER COLUMN programs SET NOT NULL;
ALTER TABLE public.schools ALTER COLUMN strengths SET NOT NULL;
ALTER TABLE public.schools ALTER COLUMN foreign_support_status SET NOT NULL;
ALTER TABLE public.schools ALTER COLUMN languages SET NOT NULL;
ALTER TABLE public.schools ALTER COLUMN international_support_level SET NOT NULL;

-- events: add explicit columns
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_date date;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS organizer_type text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_types text[];
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS content_tags text[];
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS foreign_participant_status text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS languages text[];
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS has_interpreter boolean NOT NULL DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_international_event boolean NOT NULL DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;

UPDATE public.events SET
  latitude = lat,
  longitude = lng,
  event_date = COALESCE((payload->>'date')::date, now()::date),
  organizer_type = COALESCE(payload->>'organizerType', ''),
  event_types = public._jsonb_to_text_array(payload->'eventTypes'),
  content_tags = public._jsonb_to_text_array(payload->'contentTags'),
  foreign_participant_status = COALESCE(payload->>'foreignParticipantStatus', ''),
  languages = public._jsonb_to_text_array(payload->'languages'),
  has_interpreter = COALESCE((payload->>'hasInterpreter')::boolean, false),
  is_international_event = COALESCE((payload->>'isInternationalEvent')::boolean, false),
  verified = false
WHERE latitude IS NULL;

ALTER TABLE public.events DROP COLUMN lat;
ALTER TABLE public.events DROP COLUMN lng;
ALTER TABLE public.events ALTER COLUMN latitude SET NOT NULL;
ALTER TABLE public.events ALTER COLUMN longitude SET NOT NULL;
ALTER TABLE public.events ALTER COLUMN event_date SET NOT NULL;
ALTER TABLE public.events ALTER COLUMN organizer_type SET NOT NULL;
ALTER TABLE public.events ALTER COLUMN event_types SET NOT NULL;
ALTER TABLE public.events ALTER COLUMN content_tags SET NOT NULL;
ALTER TABLE public.events ALTER COLUMN foreign_participant_status SET NOT NULL;
ALTER TABLE public.events ALTER COLUMN languages SET NOT NULL;

-- clubs: add explicit columns
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS club_types text[];
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS activities text[];
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS foreign_participant_status text;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS languages text[];
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS international_exchange_available boolean NOT NULL DEFAULT false;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;

UPDATE public.clubs SET
  latitude = lat,
  longitude = lng,
  club_types = public._jsonb_to_text_array(payload->'clubTypes'),
  activities = public._jsonb_to_text_array(payload->'activities'),
  foreign_participant_status = COALESCE(payload->>'foreignParticipantStatus', ''),
  languages = public._jsonb_to_text_array(payload->'languages'),
  international_exchange_available = COALESCE((payload->>'internationalExchangeAvailable')::boolean, false),
  verified = false
WHERE latitude IS NULL;

ALTER TABLE public.clubs DROP COLUMN lat;
ALTER TABLE public.clubs DROP COLUMN lng;
ALTER TABLE public.clubs ALTER COLUMN latitude SET NOT NULL;
ALTER TABLE public.clubs ALTER COLUMN longitude SET NOT NULL;
ALTER TABLE public.clubs ALTER COLUMN club_types SET NOT NULL;
ALTER TABLE public.clubs ALTER COLUMN activities SET NOT NULL;
ALTER TABLE public.clubs ALTER COLUMN foreign_participant_status SET NOT NULL;
ALTER TABLE public.clubs ALTER COLUMN languages SET NOT NULL;

-- helpful indexes for the promoted columns
CREATE INDEX IF NOT EXISTS teachers_area_idx ON public.teachers (area);
CREATE INDEX IF NOT EXISTS teachers_beginner_idx ON public.teachers (beginner_friendly);
CREATE INDEX IF NOT EXISTS schools_area_idx ON public.schools (area);
CREATE INDEX IF NOT EXISTS schools_featured_idx ON public.schools (featured);
CREATE INDEX IF NOT EXISTS events_area_idx ON public.events (area);
CREATE INDEX IF NOT EXISTS events_date_idx ON public.events (event_date);
CREATE INDEX IF NOT EXISTS clubs_area_idx ON public.clubs (area);