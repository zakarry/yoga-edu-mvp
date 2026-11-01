-- Settings only. No conversation, medical information, Memory, or privilege fields.
CREATE TABLE public.ai_teacher_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_name text CHECK (teacher_name IS NULL OR (char_length(btrim(teacher_name)) > 0 AND char_length(teacher_name) <= 80)),
  avatar text NOT NULL DEFAULT '🧘‍♀️' CHECK (char_length(avatar) BETWEEN 1 AND 32),
  personality text NOT NULL DEFAULT 'gentle' CHECK (personality IN ('gentle','encouraging','precise','philosophical','strict')),
  specialty text NOT NULL DEFAULT 'pranayama' CHECK (specialty IN ('pranayama','hatha','vinyasa','yin','meditation','philosophy')),
  ui_language text NOT NULL DEFAULT 'ja' CHECK (ui_language IN ('ja','en','zh','ko')),
  teaching_language text NOT NULL DEFAULT 'ja' CHECK (teaching_language IN ('ja','en','zh','ko')),
  persona_created_at timestamptz,
  explanation text NOT NULL DEFAULT 'standard' CHECK (explanation IN ('short','standard','detailed')),
  cue text NOT NULL DEFAULT 'as_needed' CHECK (cue IN ('more','as_needed','minimal')),
  praise text NOT NULL DEFAULT 'normal' CHECK (praise IN ('more','normal','less')),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((teacher_name IS NULL) = (persona_created_at IS NULL))
);
ALTER TABLE public.ai_teacher_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_teacher_settings FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_teacher_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.ai_teacher_settings TO authenticated;
GRANT INSERT (user_id,teacher_name,avatar,personality,specialty,ui_language,teaching_language,persona_created_at,explanation,cue,praise) ON public.ai_teacher_settings TO authenticated;
GRANT UPDATE (teacher_name,avatar,personality,specialty,ui_language,teaching_language,persona_created_at,explanation,cue,praise) ON public.ai_teacher_settings TO authenticated;
CREATE POLICY settings_select_own ON public.ai_teacher_settings FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY settings_insert_own ON public.ai_teacher_settings FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY settings_update_own ON public.ai_teacher_settings FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY settings_delete_own ON public.ai_teacher_settings FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);
CREATE FUNCTION public.bump_ai_teacher_settings_revision() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.revision := OLD.revision + 1;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.bump_ai_teacher_settings_revision() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER bump_ai_teacher_settings_revision BEFORE UPDATE ON public.ai_teacher_settings
FOR EACH ROW EXECUTE FUNCTION public.bump_ai_teacher_settings_revision();
