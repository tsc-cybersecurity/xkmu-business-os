---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | R2.1 | grep | `grep -rn "async function getAuthContext" src/app/api/` returns 0 results | N/A | ⬜ pending |
| 01-01-02 | 01 | 1 | R2.1 | build | `npx next build` succeeds | N/A | ⬜ pending |
| 01-02-01 | 02 | 1 | R1.1 | grep | `grep -rn "sql.raw" src/app/api/v1/import/` returns 0 results | N/A | ⬜ pending |
| 01-02-02 | 02 | 1 | R1.1 | unit | `npx vitest run src/__tests__/` passes | ⬜ W0 | ⬜ pending |
| 01-03-01 | 03 | 1 | R1.5 | grep | `grep -rn "fG58Ebj2" src/` returns 0 results | N/A | ⬜ pending |
| 01-03-02 | 03 | 1 | R1.5 | grep | `grep -rn ':-' docker-compose.local.yml` returns 0 secret defaults | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements. No new test framework or fixtures needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 14 migrated routes return 401 with invalid session | R2.1 | Requires HTTP requests against running server | `curl -X GET http://localhost:3000/api/v1/companies/1/research -H "Cookie: session=invalid"` should return 401 |
| Cross-tenant import is rejected | R1.1 | Requires crafted SQL file upload | Upload SQL file with different tenantId, verify rejection |
| Docker Compose fails without env vars | R1.5 | Requires Docker | Run `docker compose -f docker-compose.local.yml config` without env vars, should error |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
