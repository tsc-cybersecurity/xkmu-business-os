---
phase: 3
slug: xss-api-protection
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 3 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~20 seconds |

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Max feedback latency:** 20 seconds

## Per-Task Verification Map

Updated after planning.

## Wave 0 Requirements

- `npm install isomorphic-dompurify @edge-csrf/nextjs` — new dependencies needed

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CSRF token in browser forms | R2.4 | Requires browser | Check that forms include CSRF token hidden field |
| API-Key scoping in Admin UI | R2.3 | Requires UI interaction | Create key with scope, verify enforcement |

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
