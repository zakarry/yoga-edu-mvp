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
