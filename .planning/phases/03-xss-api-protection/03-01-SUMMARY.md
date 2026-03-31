---
phase: 03-xss-api-protection
plan: "01"
subsystem: security
tags: [xss, sanitization, dompurify, security-hardening]
dependency_graph:
  requires: []
  provides: [sanitize-wrapper, xss-protection]
  affects: [markdown-renderer, email-templates-preview]
tech_stack:
  added: [isomorphic-dompurify, "@types/dompurify"]
  patterns: [html-sanitization-wrapper]
key_files:
  created:
    - src/lib/utils/sanitize.ts
    - src/__tests__/unit/utils/sanitize.test.ts
  modified:
    - src/app/_components/markdown-renderer.tsx
    - src/app/intern/(dashboard)/settings/email-templates/page.tsx
    - package.json
decisions:
  - isomorphic-dompurify chosen for SSR-safe sanitization (runs on Node.js with jsdom and browser with native DOM)
  - sanitizeEmailHtml is more permissive than sanitizeHtml — allows table elements and style attributes for email layout compatibility
  - Test assertion for table sanitization uses toContain() not toBe() — DOMPurify correctly normalizes HTML by adding implicit tbody
  - layout.tsx JSON-LD script tag intentionally excluded — developer-controlled data, not user input
metrics:
  duration_minutes: 9
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_created: 2
  files_modified: 3
---

# Phase 3 Plan 1: HTML Sanitization (XSS Protection) Summary

## One-liner

isomorphic-dompurify wrapper with sanitizeHtml/sanitizeEmailHtml closing stored XSS on all 3 user-content dangerouslySetInnerHTML call sites.

## What Was Built

Installed isomorphic-dompurify and created a centralized `src/lib/utils/sanitize.ts` wrapper exporting two functions:

- `sanitizeHtml()` — strips script tags, event handlers, and javascript: URIs while preserving markdown output tags (p, strong, em, code, pre, ul, ol, li, h1-h4, a, img, hr, span, div)
- `sanitizeEmailHtml()` — more permissive variant allowing table elements and style attributes for email layout HTML

Updated all 3 user-content dangerouslySetInnerHTML call sites:
1. `MarkdownRenderer` component (line 15) — wraps renderMarkdown() output
2. `InlineMarkdown` component (line 38) — wraps hand-rolled HTML after regex transforms
3. Email templates preview dialog (line 239) — wraps raw DB bodyHtml field

The 4th call site (`layout.tsx` JSON-LD) is intentionally untouched — it uses `JSON.stringify(jsonLd)` on developer-controlled data.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install package and create sanitize.ts wrapper with tests | b62d759 | sanitize.ts, sanitize.test.ts, package.json |
| 2 | Update 3 dangerouslySetInnerHTML call sites | b566adf | markdown-renderer.tsx, email-templates/page.tsx |

## Verification

- `grep -rn "dangerouslySetInnerHTML" src/`: 4 results — 3 call sanitize functions, 1 (layout.tsx) uses JSON.stringify
- `npx vitest run src/__tests__/unit/utils/sanitize.test.ts`: 6/6 tests pass
- `npx next build`: succeeds with no type errors
- `grep "isomorphic-dompurify" package.json`: `"isomorphic-dompurify": "^3.7.1"` present

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed brittle table test assertion**
- **Found during:** Task 1 GREEN phase
- **Issue:** Test asserted `toBe('<table><tr><td>cell</td></tr></table>')` but DOMPurify correctly normalizes HTML by adding implicit `<tbody>`, producing `<table><tbody><tr><td>cell</td></tr></tbody></table>`
- **Fix:** Changed assertion to `toContain()` checks for `<table>`, `<td>cell</td>`, and `</table>` — tests the actual security property (table tags preserved) not the specific normalization format
- **Files modified:** src/__tests__/unit/utils/sanitize.test.ts
- **Commit:** b62d759

## Known Stubs

None — all sanitization is fully wired to live user content.

## Requirements Satisfied

- R1.4: Every dangerouslySetInnerHTML on user content calls sanitizeHtml() or sanitizeEmailHtml()
