---
purpose: ai-agent-decisions
read_when:
  - before_starting_work
  - when_making_decision
  - when_looping_or_repeating_work
update_when:
  - important_decision_is_made
  - option_is_rejected
  - work_is_deferred
---

# Decisions

This file records important decisions for the AI agent.
Read this before making or revisiting decisions, especially when the work seems to loop.

## 2026-06-25: Preserve the existing project TODO

Reason:
`TODO.md` already tracks the project phases for `miku-pptx2md`. Replacing it with a generic AI-agent template would lose useful project planning context.

Impact:
AI-agent state is tracked in the `## AI Agent Current Tasks` section inside the existing `TODO.md`, while project-level phase tasks remain unchanged.

## 2026-06-25: Treat this repository as the TypeScript main application

Reason:
The repository contains a TypeScript core, Node CLI script, tests, and miku-soft reference documentation. The README also states that a future Web App surface should live in a separated `miku-pptx2md-web` repository.

Impact:
Product semantics, PPTX parsing, diagnostics, CLI behavior, fixtures, and tests belong here. Browser-specific UI work should not be added to this repository unless the project direction changes.

## 2026-06-25: Use miku-docx2md as the primary CLI contract reference

Reason:
`miku-docx2md` is the closest sister application because it converts an Office document package to Markdown with optional assets, summary output, debug traces, verbose diagnostics, and a Node CLI. Its help text is structured for both humans and AI agents.

Impact:
`miku-pptx2md` CLI help follows the `USAGE`, `CONTRACT`, `OPTIONS`, `OUTPUTS`, `EXAMPLES`, and `EXIT CODES` shape. `--help` and `--version` are metadata commands that must be used alone. Exit codes are simplified to `0` for success or metadata and `1` for usage, I/O, parse, or runtime errors.

## 2026-06-25: Use miku-ms-office-core for low-level Office package reading

Reason:
`miku-ms-office-core` is the shared miku-soft foundation for Microsoft Office package plumbing. Its documented expected users include possible future `miku-pptx2md`, and `miku-docx2md` / `miku-xlsx2md` already consume the versioned release asset.

Impact:
`miku-pptx2md` vendors `miku-ms-office-core-0.5.1.mjs` under `src/vendor/` and uses it for ZIP / Office package entry reading. PPTX slide interpretation, diagnostics vocabulary, and Markdown conversion policy remain product-owned in this repository.
