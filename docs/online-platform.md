# Online platform foundations

## Realtime collaboration

Authenticated users create or join a six-character room. Membership is persisted in `collaboration_members`; private Supabase Realtime channels use matching RLS policies on `realtime.messages`. Presence carries only a display name, while Broadcast synchronizes the current hash-encoded lab state. Rooms expire after eight hours.

Apply `20260820055055_realtime_collaboration.sql`, then disable **Allow public access** in Supabase Realtime settings so the private-channel policies are enforced.

## Community and auth

The hardening migration limits user-controlled text/array sizes, tightens ownership checks, removes callable access to trigger functions, and adds `simulations`/`likes` to the Realtime publication. The frontend refreshes community cards after live database changes and uses optimistic likes with rollback.

## LMS, LTI 1.3, and auto-grading

The schema separates courses, memberships, assignments, and submissions. Learners cannot insert or update scored rows directly. `submit_assignment` validates course membership and evaluates a versioned grading specification on the database before storing the score.

`GET /api/lti` exposes a platform registration descriptor. Manual course codes, assignments, learner submissions, and database-side scoring are complete. A production LTI launch still requires issuer-specific client IDs, deployment IDs, platform JWKS validation, nonce/state storage, key rotation, and AGS access tokens. Those credentials must remain server-side and can only be finalized after an LMS platform (Canvas, Moodle, Blackboard, etc.) and its registration values are supplied.

## Verification

`npm run check` runs lint, the Node test suite, and the production build. GitHub Actions additionally installs Rust and `wasm-pack`, generates the WASM bundle, and repeats the full production build on pushes and pull requests.

Required existing variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Recommended server variable:

- `PUBLIC_APP_URL` — canonical HTTPS origin used by the LTI descriptor
