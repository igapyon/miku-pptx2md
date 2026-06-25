# TODO

## Phase 0: Specification

- [x] Confirm repository name: `miku-pptx2md`
- [x] Confirm sister references: `miku-xlsx2md` and `miku-docx2md`
- [x] Draft high-level specification
- [x] Draft planned CLI usage contract
- [x] Record miku-soft reference and repository conventions
- [x] Adopt `miku-ms-office-core` for low-level Office package ZIP reading
- [x] Decide speaker notes default: include by default, with `--no-notes`
- [x] Decide first summary shape: human-readable text, structured diagnostics internally
- [ ] Review the first specification with user feedback

## Phase 1: Project Skeleton

- [x] Add `package.json`
- [x] Add TypeScript build configuration
- [x] Add `src/ts/` product core skeleton
- [x] Add CLI entrypoint under `scripts/`
- [x] Add test runner and first fixture tests
- [x] Add runtime bundle scripts after the core API shape is stable

## Phase 2: PPTX Parsing Foundation

- [x] Implement minimal ZIP package reading for stored and deflated entries
- [x] Implement XML utility helpers
- [x] Implement minimal XML utility helpers
- [x] Parse presentation relationships and slide order
- [x] Parse slide relationships beyond first-cut title/text needs
- [x] Parse slide text bodies for first-cut text extraction
- [x] Parse notes slides
- [x] Parse content types for image assets

## Phase 3: First-Cut Conversion

- [x] Convert slide titles and body text to Markdown
- [x] Mark text-bearing ordinary shapes in Markdown
- [x] Convert bullet and numbered lists
- [x] Convert simple bold and italic text runs
- [x] Convert basic tables
- [x] Export resolved images as sidecar assets
- [x] Emit speaker notes in a documented section
- [x] Emit summary and diagnostics

## Phase 4: Quality And Validation

- [x] Add generated minimal PPTX fixtures
- [ ] Add PowerPoint-authored real fixtures when available
- [x] Compare output with `miku-docx2md` asset manifest behavior
- [x] Compare CLI ergonomics with `miku-xlsx2md` and `miku-docx2md`
- [x] Document known unsupported PowerPoint features

## AI Agent Current Tasks

This section tracks active work items for AI agents.
Update this section while working. Do not rewrite unrelated TODO items.

### Tasks

- [x] Align README and `docs/usage.md` with the current minimal implementation state.
- [x] Continue the next PPTX parsing task after documentation is current.
- [x] Add GitHub Actions build/test workflow for branch, pull request, and `v*` tag pushes.
- [x] Align CLI help and argument contract with sister application conventions.
- [x] Add first-cut bold and italic text-run Markdown formatting.
- [x] Add first-cut underline text-run Markdown-compatible formatting.
- [x] Preserve inline formatting inside Markdown hyperlink labels.
- [x] Add first-cut external text hyperlink extraction and summary count.
- [x] Report unsupported chart graphic frames through diagnostics.
- [x] Report unsupported SmartArt graphic frames through diagnostics.
- [x] Report unsupported video picture objects through diagnostics.
- [x] Report unsupported audio and OLE picture objects through diagnostics.
- [x] Report unsupported slide comments through diagnostics.
- [x] Report merged PowerPoint table cells through diagnostics.
- [x] Extract selected core presentation metadata from `docProps/core.xml`.
- [x] Add structured summary JSON output for AI and automation workflows.

### Blockers

- Specification review requires user feedback on the first specification.
- PowerPoint-authored real fixtures require stable sample `.pptx` files that are acceptable for local test use or redistribution.

### Retry Log

Use this section only when the same task or error is repeated.
If the same failure appears 3 times, stop and ask the user.

- None.
