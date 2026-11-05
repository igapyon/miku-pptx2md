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

## 2026-11-04 Remaining Issue Implementation And Review Results

The maintainer requested progress on the remaining Issues and clarified that Node updates flow into Java maintenance. The implementation keeps Node as the semantic source and records the Java comparison rather than claiming new cross-runtime output parity.

| Issue | Result and evidence |
| --- | --- |
| #10 | Version output is numeric only in source and bundle CLIs. Updated help now states that contract as well. |
| #11 | Help derives its invocation from the running script path. Isolated bundle smoke uses versioned, suffix-versioned, and space / quote-containing filenames, then runs the displayed help, version, and normal conversion examples without a source checkout. |
| #12 | README, usage, and CLI describe lightweight local deterministic intake, no LLM/API use during conversion, separate downstream token consumption, and text / visual limits. `docs/product-positioning.md` contains shared vocabulary, a comparison against the recorded Java README snapshot, and the About review and proposed text. |
| #13 | README and specification distinguish current extraction from bounded future work. The technical review and unresolved future decisions are recorded. Real-fixture deferral is now based on inspected content and concrete sample requirements. |

### Real Fixture Decision

Candidate: `workplace/miku-xlsx2md/docs/screenshots/xlsx2md-ogp.pptx`, last changed in sibling commit `5b0e005a2a2c4cd34fa8a9740dd6099d08206042`.

- Size: 110187 bytes.
- SHA-256: `a18dd3856824ce25be1b846884a504950bbd47596547a1a3f8df2245cfc62623`.
- Package properties identify `Microsoft Macintosh PowerPoint`, creator Toshiki Iga, and two slides.
- Both slide XML parts contain no DrawingML text. The package contains SVG / PNG artwork.
- Decision: defer this candidate because it does not exercise semantic text extraction. No candidate bytes are imported into the fixture set.
- Required replacement: stable non-sensitive content whose provenance and permitted test use are known, with title/body text, lists, a simple table, notes, and an embedded image. Unsupported visual objects can be added as a separate diagnostic fixture.

Issue #13 explicitly allows recording a reason and required conditions instead of adding a real fixture. That alternative is complete. Real-world fixture coverage and product-owner prioritization of additional extraction remain future quality / product work; they do not prevent recording this initial technical review as completed. No new product-owner feedback is invented or marked received.

### Verification And References

- `npm run test:unit`: all 31 tests passed, including the numeric version contract and current conversion regressions.
- `npm run smoke:bundle`: passed literal help / version / conversion examples for all three renamed standalone CLI files.
- `npm run smoke:runtime`: passed conversion and artifact projection checks.
- Shared reference checked: installed `igapyon-miku-soft-developer`, `references/maintenance-workflow.md`, `references/10-node-app-workflow.md`, main application / CLI design, and repository conventions. The installed skill is not a Git worktree; no reference commit is available.
- Maintenance adoption: applied adjacent documentation / CLI contract corrections. Changes to Node compatibility floors, CI platforms, or release naming require their own compatibility review and are deferred from this issue slice.
- Java comparison: local README at `2f1c13fc12270dda0f804e0be75283f8be7eaee2`; scope and limits are recorded in `docs/product-positioning.md`.

These records describe local implementation readiness. GitHub Issue state and the hosted About description are separate publishing actions.
