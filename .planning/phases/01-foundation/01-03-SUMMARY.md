---
phase: 01-foundation
plan: 03
subsystem: infra
tags: [docker, credentials, security, seed, environment-variables]

# Dependency graph
requires: []
provides:
  - docker-compose.local.yml with :? syntax for all required secrets (no default fallbacks)
  - seed-check.ts without hardcoded admin credentials
  - seed.ts without hardcoded admin credentials
affects: [deployment, onboarding, 01-foundation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Docker Compose :? variable syntax for required secrets — fails fast on missing env vars"
    - "Seed scripts throw Error at module load time when required env vars are missing"

key-files:
  created: []
  modified:
    - docker-compose.local.yml
    - src/lib/db/seed-check.ts
    - src/lib/db/seed.ts

key-decisions:
  - "Use :? (not :-) for SUPABASE_DB_PASSWORD, JWT_SECRET, REDIS_PASSWORD, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD in docker-compose.local.yml"
  - "Seed scripts throw at module load (not at runtime in async function) so failures are immediate and visible"

patterns-established:
  - "Required secrets: ${VAR:?error message} in docker-compose — exits before container starts"
  - "Optional vars: ${VAR:-} or ${VAR:-default} — safe defaults only for non-security-critical settings"
  - "Seed guard: extract env vars, check both, throw Error before SEED_DATA declaration"

requirements-completed: [R1.5]

# Metrics
duration: 3min
completed: 2026-03-31
---

# Phase 01 Plan 03: Remove Hardcoded Credentials Summary

**Docker Compose and seed scripts hardened: :? syntax for 5 required secrets, hardcoded password `fG58Ebj2@MDv6uvm` and email `xkmu9c0up6ab04k35f66784bljf2rqb5f43@vdix.de` removed from all source files**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-31T04:47:48Z
- **Completed:** 2026-03-31T04:50:51Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- docker-compose.local.yml now exits immediately with a clear error if SUPABASE_DB_PASSWORD, JWT_SECRET, REDIS_PASSWORD, SEED_ADMIN_EMAIL, or SEED_ADMIN_PASSWORD are not set
- Removed all hardcoded secret fallbacks (48cc2ba9bf03963c170c83798ef1419a, changeMe_jwt_secret_min32chars_2026!, changeMe_redis_2026!)
- seed-check.ts and seed.ts now throw an explicit Error at module load time when SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD are missing
- The committed password `fG58Ebj2@MDv6uvm` can no longer be used to log in to any deployment that follows the new startup contract

## Task Commits

Each task was committed atomically:

1. **Task 1: Harden docker-compose.local.yml** - `acfa671` (feat)
2. **Task 2: Remove hardcoded credential fallbacks from seed scripts** - `53ce04a` (feat)

**Plan metadata:** committed after SUMMARY creation (docs)

## Files Created/Modified
- `docker-compose.local.yml` - Changed 7 variable references from :- to :? for SUPABASE_DB_PASSWORD, JWT_SECRET, REDIS_PASSWORD (3 occurrences), SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD
- `src/lib/db/seed-check.ts` - Replaced hardcoded SEED_DATA user block with env var extraction + guard that throws before SEED_DATA declaration
- `src/lib/db/seed.ts` - Same pattern as seed-check.ts

## Decisions Made
- Used `${VAR:?message}` Docker Compose syntax which causes `docker compose config` to exit non-zero with a clear error message if the variable is unset or empty — this is the only way to enforce required secrets at compose time
- Seed guard placed BEFORE the SEED_DATA constant (module-level, top-of-file) so the error fires immediately on script invocation, not silently deep in async execution
- Optional variables (APP_PORT, NEXT_PUBLIC_APP_URL, SMTP_*, AI API keys) correctly retain :- syntax with safe defaults — only security-critical secrets were changed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript errors in test files (`__tests__/helpers/mock-request.ts`, `__tests__/unit/services/`) and 2 pre-existing vitest failures in `lead.validation.test.ts` — all unrelated to seed scripts and out of scope for this plan. No TypeScript errors in modified files.

## User Setup Required
None - no external service configuration required.
The change REQUIRES users to set all 5 secrets in their `.env` file before running `docker compose -f docker-compose.local.yml up`. This is intentional — missing secrets now cause an immediate, visible failure instead of silently using committed credentials.

## Next Phase Readiness
- P0 credential exposure closed: hardcoded password no longer functional in new deployments
- docker-compose.local.yml serves as the deployment contract — all required secrets are explicit
- Ready for next plan in Phase 01

---
*Phase: 01-foundation*
*Completed: 2026-03-31*

## Self-Check: PASSED

- FOUND: 01-03-SUMMARY.md
- FOUND: docker-compose.local.yml (modified)
- FOUND: src/lib/db/seed-check.ts (modified)
- FOUND: src/lib/db/seed.ts (modified)
- FOUND: commit acfa671 (Task 1 — docker-compose.local.yml hardened)
- FOUND: commit 53ce04a (Task 2 — seed scripts hardened)
- FOUND: commit 8ed0cac (docs — SUMMARY, STATE, ROADMAP)
