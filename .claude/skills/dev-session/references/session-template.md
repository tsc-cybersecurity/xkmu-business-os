# SESSION.md Template

## Template

```markdown
# Session Progress

**Project**: [project name]
**Branch**: [current branch]
**Last Updated**: [YYYY-MM-DD HH:MM]
**Phase**: [what you're working on]
**Checkpoint**: [commit hash from last checkpoint, or "none"]

## What Works
- [completed items, validated patterns, things confirmed working]

## Current Position
- [exact file and line being worked on]
- [specific state of the work]

## Blockers
- [anything preventing progress]
- [include what was already tried]

## Resume Instructions
1. [first concrete step — read this file, run this command, make this decision]
2. [second step]
3. [third step]
```

## Field Guidelines

| Field | Good | Bad |
|-------|------|-----|
| Phase | "Add OAuth login flow" | "Working on auth" |
| Current Position | "Implementing callback handler in `src/auth/callback.ts:35`" | "Doing the auth stuff" |
| Resume Instructions | "1. Run `npm test` to verify auth tests pass" | "1. Continue working" |
| Blockers | "D1 returns 500 on bulk insert >10 rows — tried batching, need to check param limits" | "Database broken" |

## Lifecycle

```
Start Session → creates SESSION.md
  ↓
Work + periodic Checkpoints → updates SESSION.md + WIP commits
  ↓
Wrap Session → final checkpoint, concrete resume instructions
  ↓
Resume Session → reads SESSION.md, orients, continues
```

## Housekeeping

- **Collapse completed phases**: When a phase is done, replace its details with a 1-2 line summary
- **Keep under 100 lines**: If SESSION.md grows beyond this, collapse more aggressively
- **Don't duplicate docs**: Architecture belongs in CLAUDE.md or ARCHITECTURE.md, not here
- **Checkpoint hash**: Always record the git hash so Resume can detect what changed since
- **Clean up on completion**: When the project/feature is done, delete SESSION.md — it's temporary by design
