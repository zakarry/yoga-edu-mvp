/*
# Remove temporary K4.6 editorial insertion RPC

1. Security
- Revokes anonymous and authenticated execution of the one-time K4.6 insertion function.
- Removes the temporary function after the editorial content import.

2. Data safety
- Does not modify or delete source_text, editorial_summary, or public_content rows.
- Does not change publication state.
*/

REVOKE EXECUTE ON FUNCTION public.insert_k46_editorial_content(jsonb) FROM anon, authenticated;
DROP FUNCTION IF EXISTS public.insert_k46_editorial_content(jsonb);
