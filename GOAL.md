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

Advance `miku-pptx2md` as a local-first TypeScript / Node.js main application that converts PowerPoint `.pptx` presentations into Markdown-oriented artifacts, including repository automation that can handle `v*` version tags when release or packaging work is in scope.

## Done

- The current task is implemented or explicitly deferred in `TODO.md`.
- Relevant documentation matches the actual implementation state.
- GitHub Actions workflows support the intended `v*` version-tag workflow, such as `v0.4.0`, when release or packaging automation is part of the current task.
- Relevant build or test commands pass, or the reason they could not be run is recorded.
- `git status --short` has been checked before handoff.

## Stop

- The requested scope conflicts with the miku-soft repository boundary or would move product behavior into the wrong layer.
- Required product behavior is ambiguous enough that a reasonable implementation would risk changing the public contract.
- `TODO.md` `Retry Log` records the same underlying failure three times.
