# miku-pptx2md Specification Worklog

## 2026-06-25 Initial Specification Pass

Requested direction:

- Create a tool that converts `.pptx` files to Markdown.
- Use `miku-xlsx2md` and `miku-docx2md` as sister application references.
- Start with specification design before implementation.

Checked references:

- Local sister repository: `/Users/igapyon/Documents/git/miku-xlsx2md`
- Local sister repository: `/Users/igapyon/Documents/git/miku-docx2md`
- Shared miku-soft workflow: `igapyon-miku-soft-developer`
- Main workflow: `references/10-node-app-workflow.md`
- Main design reference: `references/miku-soft-basic/miku-soft-10-mainapp-design.md`
- CLI design reference: `references/miku-soft-ai-era-cli-interface.md`

Reference revision note:

- Installed skill path was readable at `/Users/igapyon/.codex/skills/igapyon-miku-soft-developer`.
- The installed skill directory was not itself a Git worktree, so no skill commit hash was recorded.

Adopted from `miku-xlsx2md`:

- TypeScript / Node.js main application shape.
- Local-first conversion.
- Product core and CLI ownership in the main repository.
- Runtime bundle as a later downstream contract.
- Markdown and ZIP-like artifact thinking.
- Diagnostics for lossy, partial, unsupported, and fallback behavior.

Adopted from `miku-docx2md`:

- `.pptx` should be treated as an Office Open XML ZIP package.
- Resolve relationships and content types explicitly.
- Export resolved embedded images as sidecar assets when requested.
- Provide `manifest.json` for exported assets.
- Keep unsupported visual features out of normal Markdown and expose them through diagnostics or debug output.

Rejected or deferred from sister references:

- Excel-style table-region detection is not a PPTX first-cut concern.
- Word document reading order rules do not directly apply to slide layouts.
- Exact visual reproduction is out of scope for the first cut.

## 2026-06-25 miku-ms-office-core Adoption

Requested direction:

- Use <https://github.com/igapyon/miku-ms-office-core/> for Office ZIP-package-related plumbing.

Checked references:

- Shared miku-soft workflow: `igapyon-miku-soft-developer`
- Main workflow: `references/10-node-app-workflow.md`
- Main design reference: `references/miku-soft-basic/miku-soft-10-mainapp-design.md`
- Local sister repository: `workplace/miku-xlsx2md`
- Local sister repository: `workplace/miku-docx2md`
- `miku-ms-office-core` README, API reference, and package consumption notes on GitHub

Reference revision note:

- Checked date: 2026-06-25
- Installed skill path was readable at `/Users/igapyon/.codex/skills/igapyon-miku-soft-developer`.
- The installed skill directory was not itself a Git worktree, so no skill commit hash was recorded.

Adopted:

- Vendor the versioned `miku-ms-office-core-0.5.1.mjs` release asset under `src/vendor/`.
- Use `miku-ms-office-core` for low-level ZIP / Office package entry reading.
- Keep PPTX slide interpretation and Markdown conversion policy in `miku-pptx2md`.

## 2026-11-03 Issue #13 Scope And Fixture Review

Requested direction:

- Review the implemented first-cut scope against the README, TODO, product specification, implementation specification, and unsupported-feature list.
- Record whether a PowerPoint-authored real fixture is available and define concrete follow-up work for richer diagnostics and object extraction.

Checked repository evidence:

- The product is a TypeScript / Node.js main application whose core owns conversion semantics, Markdown artifacts, summaries, and diagnostics.
- `README.md`, `docs/pptx2md-spec.md`, `docs/pptx2md-impl-spec.md`, and `docs/unsupported-features.md` distinguish current extraction from layout-faithful rendering and unsupported-object conversion.
- Current conversion extracts slide order, selected metadata, titles and text, text-bearing shapes, lists, simple tables, external text hyperlinks, speaker notes, comments, and resolved image references. It also reports known unsupported or incomplete cases such as charts, SmartArt, media, OLE objects, missing relationships, and merged table cells.
- Current diagnostics contain severity, code, message, and an optional package-part source path. The product specification already recommends slide index and shape or relationship context when available; those fields are not yet part of the current diagnostic contract.
- Tests generate minimal PPTX packages in `tests/pptx-fixture.mjs`; this repository has no PowerPoint-authored test file.
- A real `.pptx` exists in the local workspace at `workplace/miku-xlsx2md/docs/screenshots/xlsx2md-ogp.pptx`. It is tracked as a screenshot source in the sibling `miku-xlsx2md` repository, so it is not used as a `miku-pptx2md` fixture without confirming content suitability and permitted use.

Review findings and recommendations:

- Keep the current first-cut boundary text-focused: extract content whose structure is directly readable, preserve slide order, and expose known losses through diagnostics.
- Keep layout reconstruction, geometry-dependent diagram interpretation, animations, and OLE, audio, or video conversion outside the first-cut scope.
- Treat richer diagnostic traces as a separate follow-up: add slide index and shape or relationship identity when the source provides them, with an explicit decision before changing the JSON contract.
- Treat chart cached-data extraction and SmartArt text extraction as separate future features, each with stable ordering and representative fixtures. Do not infer visual meaning from geometry.
- Keep generated minimal fixtures as the deterministic baseline. Add a real sample only after its provenance, content, and local-test or redistribution permission are known.

Open product-owner feedback:

- Confirm whether the text-focused first-cut boundary and the proposed chart / SmartArt follow-ups match the intended product direction.
- Provide or identify a stable PowerPoint-authored sample if one is approved for local regression testing or redistribution. If none is available, the documented fixture blocker and sample requirements satisfy the current scope decision without importing the sibling OGP deck.

Reference revision note:

- Checked date: 2026-11-03
- Main workflow: `references/maintenance-workflow.md` and the Node.js main-application design.
- The installed skill directory was not a Git worktree, so no skill commit hash was available.
