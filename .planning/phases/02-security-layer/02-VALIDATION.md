---
phase: 2
slug: security-layer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~20 seconds |

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
| 02-01-T1 | 01 | 1 | R1.2, R1.3 | grep | `grep "Access-Control-Allow-Origin" next.config.ts \| wc -l` returns 0 | N/A | ⬜ pending |
| 02-01-T2 | 01 | 1 | R1.2 | grep | `grep "ALLOWED_ORIGINS" docker-compose.local.yml` returns 1 match with `:-` | N/A | ⬜ pending |
| 02-01-T3 | 01 | 1 | R2.2 | grep | `grep "x-middleware-subrequest" src/proxy.ts` returns 2 lines | N/A | ⬜ pending |
| 02-01-T4 | 01 | 1 | R1.2, R1.3, R2.2 | build | `cd /c/Daten/xKMU-BusinessOS && npx next build 2>&1 \| tail -5` exits 0 | N/A | ⬜ pending |
| 02-02-T1 | 02 | 2 | R1.2, R1.3, R2.2 | curl | `curl -sI https://boss.xkmu.de \| grep -E "X-Frame-Options\|X-Content-Type-Options\|Referrer-Policy"` returns 3 headers | N/A | ⬜ pending |
| 02-02-T2 | 02 | 2 | R1.3 | manual | CSP Report-Only: human checks browser DevTools Console for zero violations | N/A | ⬜ pending |

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Security headers in production response | R1.3 | Requires running server | `curl -I https://boss.xkmu.de` shows X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| CORS blocks evil.com | R1.2 | Requires HTTP request | `curl -H "Origin: https://evil.com" -I https://boss.xkmu.de/api/v1/health` should NOT reflect origin |
| CVE bypass on 5 routes | R2.2 | Requires running server | `curl -H "x-middleware-subrequest: 1"` against /api/v1/leads, /api/v1/companies, /api/v1/contacts, /api/v1/tasks, /api/v1/tickets — all must return 401 |
| CSP Report-Only no violations | R1.3 | Requires browser + Docker | Check browser console in production Docker build for CSP violations — zero expected. See Plan 02-02 Task 2 checkpoint for exact steps. Approval recorded when user types "approved" in execute-phase. |
| Static assets bypass proxy | R2.2 | Requires running server | `/_next/static/*` responses have no proxy overhead |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
