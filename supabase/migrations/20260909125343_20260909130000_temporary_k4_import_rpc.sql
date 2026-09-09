/*
# Remove temporary K4 import access

1. Security
- Revokes anonymous and authenticated execution of the temporary K4 import RPC.
- Removes the temporary function after the one-time import is complete.

2. Data safety
- Does not modify or delete any imported content, sections, Formal Master entries, or source mappings.
*/

REVOKE EXECUTE ON FUNCTION public.import_k4_source_content(jsonb) FROM anon, authenticated;
DROP FUNCTION IF EXISTS public.import_k4_source_content(jsonb);