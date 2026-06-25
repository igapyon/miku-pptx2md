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
