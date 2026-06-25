# TODO

## Phase 0: Specification

- [x] Confirm repository name: `miku-pptx2md`
- [x] Confirm sister references: `miku-xlsx2md` and `miku-docx2md`
- [x] Draft high-level specification
- [x] Draft planned CLI usage contract
- [x] Record miku-soft reference and repository conventions
- [x] Decide speaker notes default: include by default, with `--no-notes`
- [x] Decide first summary shape: human-readable text, structured diagnostics internally
- [ ] Review the first specification with user feedback

## Phase 1: Project Skeleton

- [x] Add `package.json`
- [x] Add TypeScript build configuration
- [x] Add `src/ts/` product core skeleton
- [x] Add CLI entrypoint under `scripts/`
- [x] Add test runner and first fixture tests
- [ ] Add runtime bundle scripts after the core API shape is stable

## Phase 2: PPTX Parsing Foundation

- [x] Implement minimal ZIP package reading for stored and deflated entries
- [ ] Implement XML utility helpers
- [x] Implement minimal XML utility helpers
- [x] Parse presentation relationships and slide order
- [ ] Parse slide relationships beyond first-cut title/text needs
- [x] Parse slide text bodies for first-cut text extraction
- [ ] Parse notes slides
- [ ] Parse content types for image assets

## Phase 3: First-Cut Conversion

- [x] Convert slide titles and body text to Markdown
- [ ] Convert bullet and numbered lists
- [ ] Convert basic tables
- [ ] Export resolved images as sidecar assets
- [ ] Emit speaker notes in a documented section
- [ ] Emit summary and diagnostics

## Phase 4: Quality And Validation

- [ ] Add generated minimal PPTX fixtures
- [ ] Add PowerPoint-authored real fixtures when available
- [ ] Compare output with `miku-docx2md` asset manifest behavior
- [ ] Compare CLI ergonomics with `miku-xlsx2md` and `miku-docx2md`
- [ ] Document known unsupported PowerPoint features
