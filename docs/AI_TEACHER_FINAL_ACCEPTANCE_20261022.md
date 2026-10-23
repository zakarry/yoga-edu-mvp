# PR #27 final verification, 2026-10-22

## Restart baseline

GitHub API and fetch confirmed main `e213cbd0381ed4de904fa4474af06d23af25a87f`, PR #27 Draft/open, head `d3a94df565c08ec81b21b0a372a244d4570536d4`, mergeable. These were unchanged since the previous task. Working tree was clean. Read AGENTS.md, PRODUCT_REQUIREMENTS.md, REGRESSION_TESTS.md and USER_FEEDBACK_BACKLOG.md; scope DATA-01/02 and FB-01. Preserve AUD-01/02, TIME-01/02, SAFE-01, UI-01 and susokukan's dedicated session clock.

## Real JWT acceptance runner

`scripts/staging/acceptance.html` and `.ts` are an explicit test entry, not imported by the product. Build with `node scripts/staging/build-acceptance.mjs`, then serve `dist-teacher-acceptance` with Vite preview on `127.0.0.1:4177`. Open `/scripts/staging/acceptance.html`. The builder and page reject any backend other than independent project `htnouayipmqvpckppbzv`. Only its publishable key is used. No service role, SQL Editor session, synthetic auth.uid, or mocked API is accepted as real JWT evidence.

The human enters existing A/B test passwords directly in the local form. Do not photograph filled credentials. The runner clears inputs on submit, keeps passwords/sessions only in memory for the run, and logs neither JWT nor passwords. There is no trace/HAR or credentials result file. It verifies users server-side using getUser, requires two distinct identities and existing settings as positive controls, and then checks:

- A cannot SELECT B and B cannot SELECT A (HTTP success with zero rows).
- A cannot UPDATE B and B cannot UPDATE A (zero returned rows). Requests use the row's existing teacher_name to avoid changing content even if a security defect exists. Both full rows including revisions must remain unchanged.
- INSERT under the other existing user's ID must specifically return RLS error `42501`; unique/FK/auth/network errors do not count as a PASS.
- An unauthenticated client is denied access.
- Each account signs out, proves its client session is empty, signs in again, confirms its server-verified identity, and reads exactly its original full row including name/personality/teaching language/revision.

A failed prerequisite stops subsequent checks. Results only contain named PASS/FAIL, response statuses/counts/error codes and non-sensitive test settings. A real RLS FAIL is not repaired by weakening a policy. No settings are deleted or reset. These are real GoTrue/PostgREST API checks; product UI logout/relogin has its own Playwright suite and real UI acceptance boundary.

## Status and boundaries

At runner preparation, real JWT results are **UNCONFIRMED**, waiting for the human's A/B password entry. Record the actual completed result in the PR acceptance update; do not substitute the 2026-10-13 conflict PASS or isolated PostgreSQL PASS. The initial local typecheck/Build/all regression, including 10 teacher-settings cases, passed on restart. Rerun standard practice Playwright 17 and settings Playwright 3 and GitHub Actions; record the new results separately from old CI.

The runner receives a dedicated TypeScript check in Actions, with no staging credentials in GitHub. CI cannot make the real Supabase checks PASS. Production sources, migrations/RLS definitions, OAuth/LINE settings, secrets, Edge Functions, DNS and publishing remain unchanged. Keep PR #27 Draft. Production application of its migration and any merge/publish need their own authorized step after acceptance.

`npm ci` reported six dependency advisories (one moderate, five high); no dependency or lockfile updates were included. Review these separately before a production release; they are not a real JWT test result.
