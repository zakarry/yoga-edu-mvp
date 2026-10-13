# PR #27 conflict follow-up (2026-10-13)

## Observations and limits
The user performed real Supabase staging UI acceptance on project htnouayipmqvpckppbzv. A and B settings persisted separately, logout/relogin and another browser restored A. Two intended stale-editor tests saved later values instead of displaying a conflict. SQL inspection showed A revision 3 and B revision 1 after the first test. The original manual requests/response headers were not captured. Do not claim a proven wire-level root cause or corrected remote PASS.

## Code findings and correction
The database uses an atomic UPDATE with both user_id and revision filters and a BEFORE UPDATE increment trigger. It does not upsert. There was no unconditional update fallback. The controller previously used its current revision, rather than an explicit edit-start revision. Auth notifications temporarily set loading=true even for the same user; the page converted this to an undefined owner and reloaded settings/reset the editor. This invalidated the independence of the manual stale-editor setup. Preserve the stable authenticated owner during same-account metadata loading, and pass the edit-start revision explicitly when saving a persona. Logout still immediately clears user and isolates accounts; auth/RLS/provider code is unchanged.

A zero-row update must not be treated as saved. The transport now recognizes no returned row, PostgREST PGRST116 with zero-row details, and insert unique conflict as TeacherSettingsConflictError. Other failures remain generic failures. The controller preserves last confirmed settings and input, returns false, and displays the explicit other-device-update message. Only a validated returned saved row produces success and closes the editor.

## Added regression
- Explicit stale edit revision after a repository reload: rejected, original DB row kept, no success.
- Two writers with the same revision: exactly one winner; loser conflict; logout/relogin restoration; subsequent nonconflicting save.
- Browser UI with PostgREST zero-row response: request revision eq.1, conflict message, input retained, no overwrite, reload latest winner.
- Existing account isolation, local legacy boundary, save/read failure, deletion, 24 content/211 asset and practice boundaries retained.

## Remote status
Before correction: conflict acceptance FAIL. After correction: real Supabase conflict and real JWT RLS rejection UNCONFIRMED. Same-browser relogin and independent Chrome restoration are user-observed PASS before correction, not second-device PASS. Google/LINE, Android, second device, offline failure and old-browser migration acceptance remain unconfirmed. No production DB/Edge/Auth/Secret/DNS/Publish or main merge performed. PR #27 stays Draft.
