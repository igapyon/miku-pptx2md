---
purpose: ai-agent-goal
read_when:
  - before_starting_work
  - before_finishing_work
  - when_scope_is_unclear
update_when:
  - goal_changes
  - done_conditions_change
  - stop_conditions_change
---

# Goal

This file defines what the AI agent is trying to accomplish.
Read this before starting work, before deciding that work is complete, and whenever scope becomes unclear.

## Objective

Implement a normal, low-risk refactoring pass for `miku-pptx2md` as a local-first TypeScript / Node.js main application.

This is an execution goal, not just a planning goal. The pass should improve maintainability without changing the public conversion contract. The current target areas are the Node CLI flow, asset export helpers, core artifact projection APIs, runtime bundle exports, and documentation alignment where those areas are touched.

## Done

- Refactoring tasks in `TODO.md` `## AI Agent Current Tasks` are implemented, verified, and checked off, except for any item explicitly deferred with a concrete reason in `TODO.md` or `HANDOFF.md`.
- The CLI remains compatible with the sister `miku-docx2md`-style contract and does not adopt workbook-specific `miku-xlsx2md` options unless justified.
- Product semantics and artifact projection shapes remain owned by the TypeScript core rather than duplicated in adapters.
- Public behavior is unchanged except for documented contract clarifications.
- Relevant documentation matches the implementation state after the refactoring implementation.
- Relevant build, unit, and runtime smoke commands pass, or the reason they could not be run is recorded.
- `git diff` has been reviewed for unrelated changes and `git status --short` has been checked before handoff.

## Stop

- The requested scope conflicts with the miku-soft repository boundary or would move product behavior into the wrong layer.
- Required product behavior is ambiguous enough that a reasonable implementation would risk changing the public contract.
- Refactoring would require large behavior changes, broad parser rewrites, or new feature semantics instead of maintainability-only changes.
- `TODO.md` `Retry Log` records the same underlying failure three times.
