/*
# Restore legacy coordinate aliases and remove migration helper

The promoted latitude/longitude columns are authoritative. The original lat/lng
columns are restored as compatibility aliases so existing database consumers
are not broken, and the temporary public JSON helper is removed.
*/
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS lng double precision;
UPDATE public.teachers SET lat = latitude, lng = longitude;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS lng double precision;
UPDATE public.schools SET lat = latitude, lng = longitude;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS lng double precision;
UPDATE public.events SET lat = latitude, lng = longitude;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS lng double precision;
UPDATE public.clubs SET lat = latitude, lng = longitude;
DROP FUNCTION IF EXISTS public._jsonb_to_text_array(jsonb);