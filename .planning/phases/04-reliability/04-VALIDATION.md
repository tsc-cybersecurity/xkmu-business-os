---
phase: 4
slug: reliability
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 4 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~20 seconds |

## Per-Task Verification Map

Updated after planning.

## Wave 0 Requirements

- `npm install ioredis` — new dependency for Redis rate limiting

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Rate limit persists across container restart | R3.1 | Requires Docker | Restart container, check counter preserved |
| Fail-open when Redis down | R3.1 | Requires stopping Redis | Stop Redis container, verify requests pass |

**Approval:** pending
