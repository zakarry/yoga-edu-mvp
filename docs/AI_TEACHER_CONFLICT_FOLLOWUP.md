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

## Corrected real Supabase acceptance, 2026-10-13
Verified implementation commit: 0f16a5a53b269615672da4ba96af850174f67e7d. Rebuilt only the local staging artifact; no cloud deployment. Used the user's already authenticated staging A session through browser automation; no credentials or JWT values read/copied.

1. Two independent page/controller instances loaded the same account settings. The first saved `検証A先生・自動検証先行` and reported account-save success. The old editor tried `検証A先生・自動検証旧入力`, showed the explicit other-device-update message, retained the input, and stayed in edit mode. Reload restored the first saved value: PASS for stale-editor rejection/no overwrite.
2. Both pages then loaded the latest revision, opened separate editors, and dispatched saves together. A displayed conflict, B displayed account-save success. Reload restored `検証A先生・同時保存B`: PASS for one winner from the same starting revision. This is two overlapping UI requests; it is not a load/performance stress test.
3. No-conflict save and reload: PASS in the same real environment. User-observed logout/relogin and Chrome restoration from before the correction remain separately recorded. No fresh-password login was automated after correction.

Local: typecheck, Build, all regression including 10 settings cases PASS; settings browser 3 PASS. Standard practice browser initial run 16 PASS/1 FAIL (abdominal missing an observed exhalation); unchanged single-case rerun PASS. GitHub Actions at implementation commit: all 8 checks PASS (including standard 17 twice). Do not erase the initial local failure.

The earlier remote-status paragraph records the status before this automated acceptance. Real JWT cross-account RLS rejection, post-fix logout/relogin, Android/LINE, second device, offline failure and legacy-account migration remain UNCONFIRMED. Original failed manual-test network traffic was not captured; its precise request revisions cannot be reconstructed. Automated local transport regression verifies revision eq.1 and zero-row handling; real UI outcomes above verify backend rejection without recording authorization headers.
