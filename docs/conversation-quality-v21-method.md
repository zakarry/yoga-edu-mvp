# Conversation quality v2.1 acceptance method

This is an acceptance-only change. No application, Edge Function, DB, auth, or safety implementation is changed. Do not deploy or merge this PR as a safety fix.

## Provenance

- Fetched GitHub main: `23eb9bc354544f55be3dd42b7d9fb21ea0b5fa62` (`Implement 4 conversation rules`). The four implementation files were ALREADY on main before this test began; they are inherited by this branch, not newly added by this PR. No main write was performed.
- Production and preview Edge source normalized to LF: SHA256 `288a9a9631090c15a95d78fca3bd61804f2fbf3b5a4eb04a4d846cd18324a5b1`, matching the supplied deployment report. This is source/report correspondence, not a downloaded server-code attestation.
- Fresh local build files `index-Dxc3qH4P.js` and `conversationEngine-DGujEri7.js` were byte-for-byte equal to the files served by `https://yogai.net/assets/` on 2026-09-26.
- Production STEP5 was manually driven through the three-turn Japanese repair conversation plus chest-pain/repair conflict. Visible full responses and Router logs were observed. Router `source` is a preliminary route, NOT proof of the final LLM path.

## Instrumented live integration

`acceptance.html` / `acceptance.ts` / `vite.acceptance.config.ts` are local-only test tooling, not included in the production Vite entry. They invoke the unchanged main `generateTeacherResponse`, live Knowledge services and deployed `ai-teacher-explanation` using an ordinary authenticated Supabase session. The fetch wrapper observes real traffic; it does not replace responses or alter requests.

Each turn records input, actual response, intent, safety keyword, red-flag detection, repair detection, input history, outgoing Edge payload, response/evidence, trace and timestamp. No access tokens or request authorization headers are recorded. Safety-only turns correctly have no LLM call. `sentPayload.turns` is the measured client-to-Edge history; provider-side exact request bytes are not exposed. Server evidence reports processed history count, provider status, completion ID and usage recording.

The controlled nonpersistent persona is MAYA, calm, Yoga, with no explicitly selected teaching language. The same persona is used in JP/EN; no saved teacher settings are overwritten. Memory preferences are omitted for a matched comparison. CASE 1–3 and conflict are one conversation; CASE 4–6 and 9–10 another; CASE 7 and 8 independent; CASE 11, EN2, EN3 and CASE12 share an English-started conversation. History uses the unchanged six-turn limit.

The fixture `腰痛…`/`胸が痛い` inputs are synthetic test cases, not assertions about the account owner's health. The harness does not save them to Memory or practice logs. Normal production LLM usage metering still applies. Calls are spaced by 15 seconds, without disabling rate limits.

## Re-run (only when explicitly authorized to incur live LLM calls)

1. Install the existing lockfile with `npm ci --ignore-scripts`.
2. Provide the existing project public frontend environment locally. Set `VITE_AI_TEACHER_LLM_ENABLED=true`; do not select the preview function. Never commit environment files or credentials.
3. Run `npm run dev -- --host 127.0.0.1 --port 5177 --strictPort --config vite.acceptance.config.ts`.
4. Use the normal local homepage login, then open `/acceptance.html` and click the run button.
5. The local middleware writes `../evidence/live-cases.json`. Review before copying into this repository. Do not publish real user health data or credentials.

Build warnings about mixed Supabase imports and large chunks pre-exist. Dependency audit reports 4 vulnerabilities (1 moderate, 3 high); no dependency upgrades were made in this acceptance-only task.
