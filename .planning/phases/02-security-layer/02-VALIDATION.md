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
| 02-01-01 | 01 | 1 | R1.2 | grep | `grep "Access-Control-Allow-Origin: \\*" next.config.ts` returns 0 results | N/A | ⬜ pending |
| 02-02-01 | 02 | 1 | R1.3 | build | `npx next build` succeeds | N/A | ⬜ pending |
| 02-03-01 | 03 | 1 | R2.2 | grep | `test -f src/proxy.ts` exists | N/A | ⬜ pending |

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Security headers in production response | R1.3 | Requires running server | `curl -I https://boss.xkmu.de` shows X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| CORS blocks evil.com | R1.2 | Requires HTTP request | `curl -H "Origin: https://evil.com" -I https://boss.xkmu.de/api/v1/health` should NOT reflect origin |
| CSP report-only no violations | R1.3 | Requires browser + Docker | Check browser console in production Docker build for CSP violations |
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
