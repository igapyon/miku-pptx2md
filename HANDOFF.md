---
purpose: ai-agent-handoff
read_when:
  - before_resuming_work
  - before_handing_off_work
  - when_context_is_missing
update_when:
  - work_is_paused
  - handoff_summary_changes
  - verification_status_changes
---

# Handoff

This file summarizes the current working state for the next human or AI agent.
Keep it concise. Do not use this as a full work log or a replacement for `TODO.md` and `DECISIONS.md`.

## Current State

- `miku-pptx2md` has a TypeScript core skeleton, CLI entrypoint, ZIP reading, minimal XML helpers, core metadata extraction, slide order parsing, and first-cut slide title/body text Markdown conversion.
- Text inside ordinary PowerPoint shapes with preset geometry is rendered as blockquote Markdown with a `[Shape: ...]` label; body placeholders and text boxes remain ordinary paragraphs.
- Clear DrawingML bullet and numbered paragraph metadata is rendered as Markdown list items, including simple nested levels.
- Bold and italic DrawingML text runs are rendered as Markdown emphasis; underline runs are rendered as inline HTML.
- Markdown hyperlink labels preserve the same first-cut inline formatting.
- External text hyperlinks in slide text are resolved through slide relationships and rendered as Markdown links.
- Simple PowerPoint tables in `p:graphicFrame` / `a:tbl` are rendered as Markdown tables using the first row as the header.
- Tables with merged cells are rendered as flattened Markdown tables and reported as `limited-table-merged-cells` warning diagnostics.
- Non-table chart-like and SmartArt-like `p:graphicFrame` content is omitted from Markdown and reported as `unsupported-chart` or `unsupported-smartart` warning diagnostics.
- Video/audio/OLE picture-like objects are omitted from Markdown and reported as unsupported picture-object warning diagnostics.
- Slide comments are omitted from Markdown and reported as `unsupported-comments` warning diagnostics.
- Slide-level relationships are parsed for notes slides; speaker notes render under `### Speaker Notes` by default and are omitted by `--no-notes`.
- Resolved slide image relationships are exported with `--assets-dir`, using package-relative paths and a `manifest.json`.
- Asset manifest fields are aligned with the sister `miku-docx2md` style, with PPTX-specific `slideIndex`, `blockIndex`, `relationshipId`, `sourceTrace`, and `documentPosition`.
- Generated minimal PPTX fixtures cover titles, paragraphs, shapes, lists, tables, notes, images, and missing-image diagnostics.
- Summary output includes selected core metadata when present. Summary counts include slides, text blocks, list items, tables, hyperlinks, image assets, notes slides, warnings, errors, and diagnostics. `--summary-json-out` writes structured summary JSON. `--debug` appends diagnostic comments to Markdown.
- Known unsupported PowerPoint features are documented in `docs/unsupported-features.md`.
- The existing project `TODO.md` tracks specification, skeleton, parsing, conversion, and validation phases.
- README and `docs/usage.md` now describe implemented speaker notes, lists, tables, shape text, image assets, summaries, and diagnostics while keeping planned areas separate.
- `.github/workflows/ci.yml` runs build and unit tests for branch pushes, pull requests, and `v*` version tag pushes.
- CLI help and argument handling now follow the sister `miku-docx2md` shape, including metadata-command restrictions, verbose stderr diagnostics, and agent-readable help sections.
- `npm run build:runtime` generates `bundle/miku-pptx2md-runtime.mjs`, and `npm run smoke:runtime` verifies the runtime export.

## Next Action

- Await user feedback on the first specification or stable PowerPoint-authored sample `.pptx` files before marking the remaining TODO items complete.
- If new autonomous scope is desired, the next likely implementation area is additional object-specific extraction or richer diagnostics.

## Relevant Files

- `GOAL.md`: current objective, done conditions, and stop conditions.
- `TODO.md`: project phase tasks plus the AI agent current-task section.
- `DECISIONS.md`: important repository workflow and boundary decisions.
- `README.md`: user-facing repository state and build/test instructions.
- `docs/usage.md`: planned and implemented CLI contract.
- `src/ts/core.ts`: product core conversion behavior.
- `docs/pptx2md-spec.md`: high-level conversion policy, including shape text rendering.
- `docs/pptx2md-impl-spec.md`: implementation-specific first-cut behavior.
- `docs/unsupported-features.md`: known unsupported and limited PowerPoint features.
- `scripts/miku-pptx2md-cli.mjs`: Node CLI entrypoint.
- `tests/pptx2md-cli.test.mjs`: CLI contract regression tests.
- `tests/pptx2md-core.test.mjs`: focused core regression test.
- `.github/workflows/ci.yml`: GitHub Actions build/test workflow including `v*` tag pushes.
- `scripts/build-runtime-bundle.mjs`: runtime bundle generation.
- `scripts/smoke-runtime-bundle.mjs`: runtime bundle smoke verification.

## Watch Outs

- Preserve the miku-soft boundary: this repository is the main TypeScript application, not a Web App repository.
- Do not overwrite the existing project `TODO.md`; update only relevant task lines or the AI-agent section.
- Keep generated or local scratch artifacts out of Git unless the repository explicitly documents them as committed outputs.

## Last Verification

- 2026-06-25: `npm run test:unit` passed after documentation and CI workflow updates.
- 2026-06-25: `npm run smoke:version` passed after documentation and CI workflow updates.
- 2026-06-25: `npm run test:unit` passed after CLI help and argument contract alignment.
- 2026-06-25: `npm run smoke:version` passed after CLI help and argument contract alignment.
- 2026-06-25: `npm run test:unit` passed after shape text rendering update.
- 2026-06-25: `npm run smoke:version` passed after shape text rendering update.
- 2026-06-25: `npm run test:unit` passed after bumping package version to 0.4.0.
- 2026-06-25: `npm run smoke:version` passed and printed `miku-pptx2md 0.4.0`.
- 2026-06-25: `npm run test:unit` passed after bullet and numbered list rendering update.
- 2026-06-25: `npm run smoke:version` passed after bullet and numbered list rendering update.
- 2026-06-25: `npm run test:unit` passed after basic table rendering update.
- 2026-06-25: `npm run smoke:version` passed after basic table rendering update.
- 2026-06-25: `npm run test:unit` passed after speaker notes rendering update.
- 2026-06-25: `npm run smoke:version` passed after speaker notes rendering update.
- 2026-06-25: `npm run test:unit` passed after image asset export update.
- 2026-06-25: `npm run smoke:version` passed after image asset export update.
- 2026-06-25: `npm run test:unit` passed after summary and diagnostic comment update.
- 2026-06-25: `npm run smoke:version` passed after summary and diagnostic comment update.
- 2026-06-25: `npm run test:unit` passed after unsupported features documentation update.
- 2026-06-25: `npm run smoke:version` passed after unsupported features documentation update.
- 2026-06-25: `npm run build:runtime` generated `bundle/miku-pptx2md-runtime.mjs`.
- 2026-06-25: `npm run smoke:runtime` passed after runtime bundle script update.
- 2026-06-25: `npm run test:unit` passed after runtime bundle script update.
- 2026-06-25: `npm run smoke:version` passed after runtime bundle script update.
- 2026-06-25: `npm run test:unit` passed after asset manifest alignment.
- 2026-06-25: `npm run build:runtime` passed after asset manifest alignment.
- 2026-06-25: `npm run smoke:runtime` passed after asset manifest alignment.
- 2026-06-25: `npm run smoke:version` passed after asset manifest alignment.
- 2026-06-25: `npm run test:unit` passed after generated fixture documentation and TODO cleanup.
- 2026-06-25: `npm run smoke:version` passed after README and usage documentation refresh.
- 2026-06-25: `npm run test:unit` passed after external text hyperlink extraction and summary count update.
- 2026-06-25: `npm run build:runtime` passed after external text hyperlink extraction and summary count update.
- 2026-06-25: `npm run smoke:runtime` passed after external text hyperlink extraction and summary count update.
- 2026-06-25: `npm run smoke:version` passed after external text hyperlink extraction and summary count update.
- 2026-06-25: `npm run test:unit` passed after unsupported chart graphic-frame diagnostic update.
- 2026-06-25: `npm run build:runtime` passed after unsupported chart graphic-frame diagnostic update.
- 2026-06-25: `npm run smoke:runtime` passed after unsupported chart graphic-frame diagnostic update.
- 2026-06-25: `npm run smoke:version` passed after unsupported chart graphic-frame diagnostic update.
- 2026-06-25: `npm run test:unit` passed after core presentation metadata extraction update.
- 2026-06-25: `npm run build:runtime` passed after core presentation metadata extraction update.
- 2026-06-25: `npm run smoke:runtime` passed after core presentation metadata extraction update.
- 2026-06-25: `npm run smoke:version` passed after core presentation metadata extraction update.
- 2026-06-25: `npm run test:unit` passed after structured summary JSON output update.
- 2026-06-25: `npm run build:runtime` passed after structured summary JSON output update.
- 2026-06-25: `npm run smoke:runtime` passed after structured summary JSON output update.
- 2026-06-25: `npm run smoke:version` passed after structured summary JSON output update.
- 2026-06-25: `npm run test:unit` passed after unsupported SmartArt graphic-frame diagnostic coverage update.
- 2026-06-25: `npm run build:runtime` passed after unsupported SmartArt graphic-frame diagnostic coverage update.
- 2026-06-25: `npm run smoke:runtime` passed after unsupported SmartArt graphic-frame diagnostic coverage update.
- 2026-06-25: `npm run smoke:version` passed after unsupported SmartArt graphic-frame diagnostic coverage update.
- 2026-06-25: `npm run test:unit` passed after unsupported video picture-object diagnostic update.
- 2026-06-25: `npm run build:runtime` passed after unsupported video picture-object diagnostic update.
- 2026-06-25: `npm run smoke:runtime` passed after unsupported video picture-object diagnostic update.
- 2026-06-25: `npm run smoke:version` passed after unsupported video picture-object diagnostic update.
- 2026-06-25: `npm run test:unit` passed after unsupported audio and OLE picture-object diagnostic coverage update.
- 2026-06-25: `npm run build:runtime` passed after unsupported audio and OLE picture-object diagnostic coverage update.
- 2026-06-25: `npm run smoke:runtime` passed after unsupported audio and OLE picture-object diagnostic coverage update.
- 2026-06-25: `npm run smoke:version` passed after unsupported audio and OLE picture-object diagnostic coverage update.
- 2026-06-25: `npm run test:unit` passed after unsupported slide comment diagnostic update.
- 2026-06-25: `npm run build:runtime` passed after unsupported slide comment diagnostic update.
- 2026-06-25: `npm run smoke:runtime` passed after unsupported slide comment diagnostic update.
- 2026-06-25: `npm run smoke:version` passed after unsupported slide comment diagnostic update.
- 2026-06-25: `npm run test:unit` passed after merged table-cell diagnostic update.
- 2026-06-25: `npm run build:runtime` passed after merged table-cell diagnostic update.
- 2026-06-25: `npm run smoke:runtime` passed after merged table-cell diagnostic update.
- 2026-06-25: `npm run smoke:version` passed after merged table-cell diagnostic update.
- 2026-06-25: `npm run test:unit` passed after bold and italic text-run Markdown formatting update.
- 2026-06-25: `npm run build:runtime` passed after bold and italic text-run Markdown formatting update.
- 2026-06-25: `npm run smoke:runtime` passed after bold and italic text-run Markdown formatting update.
- 2026-06-25: `npm run smoke:version` passed after bold and italic text-run Markdown formatting update.
- 2026-06-25: `npm run test:unit` passed after underline text-run Markdown-compatible formatting update.
- 2026-06-25: `npm run build:runtime` passed after underline text-run Markdown-compatible formatting update.
- 2026-06-25: `npm run smoke:runtime` passed after underline text-run Markdown-compatible formatting update.
- 2026-06-25: `npm run smoke:version` passed after underline text-run Markdown-compatible formatting update.
- 2026-06-25: `npm run test:unit` passed after preserving inline formatting inside Markdown hyperlink labels.
- 2026-06-25: `npm run build:runtime` passed after preserving inline formatting inside Markdown hyperlink labels.
- 2026-06-25: `npm run smoke:runtime` passed after preserving inline formatting inside Markdown hyperlink labels.
- 2026-06-25: `npm run smoke:version` passed after preserving inline formatting inside Markdown hyperlink labels.
