/*
# Backfill legacy lat/lng aliases from latitude/longitude

1. Purpose
- The restore_directory_legacy_coordinate_aliases migration ran before schools/events/clubs were seeded, so their lat/lng columns stayed NULL.
- This migration backfills lat/lng from the canonical latitude/longitude columns for all four Directory tables so the legacy aliases are consistent.
2. Safety
- Idempotent: re-running only overwrites lat/lng with the same latitude/longitude values.
- Does not touch the canonical latitude/longitude columns.
*/
UPDATE public.teachers SET lat = latitude, lng = longitude WHERE lat IS NULL OR lng IS NULL;
UPDATE public.schools SET lat = latitude, lng = longitude WHERE lat IS NULL OR lng IS NULL;
UPDATE public.events SET lat = latitude, lng = longitude WHERE lat IS NULL OR lng IS NULL;
UPDATE public.clubs SET lat = latitude, lng = longitude WHERE lat IS NULL OR lng IS NULL;