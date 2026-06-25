# miku-pptx2md

`miku-pptx2md` is a TypeScript / Node.js main application for converting PowerPoint (`.pptx`) presentations into Markdown-oriented artifacts.

This repository will own the product core, Node.js CLI, conversion semantics, diagnostics, fixtures, and tests. A browser Web App surface, if created later, should live in a separated `miku-pptx2md-web` repository.

## What is this?

`miku-pptx2md` reads `.pptx` files locally and currently extracts core presentation metadata, ordered slide sections, title placeholders, text bodies, text-bearing shapes, lists, simple tables, external text hyperlinks, speaker notes, and resolved image references into Markdown-oriented artifacts.

The planned scope also includes richer structured diagnostics and additional object-specific extraction.

The conversion goal is meaningful Markdown extraction, not exact visual reproduction of PowerPoint slides.

## Sister References

This project follows the practical shape of these sister main applications:

- `miku-xlsx2md`: Excel workbook to Markdown artifacts
- `miku-docx2md`: Word document to Markdown plus sidecar assets

The initial `miku-pptx2md` direction adopts their CLI-first, local-first, TypeScript-first, ZIP/XML parsing, diagnostics, tests, and runtime bundle separation patterns where they fit PowerPoint.

Low-level Microsoft Office package plumbing is provided by the vendored
`miku-ms-office-core` release asset. `miku-pptx2md` keeps PowerPoint slide
interpretation and Markdown conversion policy in this repository.

## Node CLI

The CLI converts one input presentation at a time and writes Markdown to a file.

```bash
npm run cli -- ./sample.pptx --out ./sample.md
```

It can also print Markdown to stdout when `--out` is omitted.

```bash
npm run cli -- ./sample.pptx > ./sample.md
```

Summary output is implemented as human-readable text:

```bash
npm run cli -- ./sample.pptx --out ./sample.md --summary --summary-out ./sample.summary.txt
```

Structured summary JSON is available for AI and automation workflows:

```bash
npm run cli -- ./sample.pptx --out ./sample.md --summary-json-out ./sample.summary.json
```

Verbose progress diagnostics are available on stderr:

```bash
npm run cli -- ./sample.pptx --out ./sample.md --verbose
```

Image asset export, speaker note extraction, table extraction, list extraction, bold/italic/underline text run formatting, external text hyperlink extraction, debug comments, text summary, JSON summary, and summary diagnostics are implemented in first-cut form. Richer object-specific diagnostics are still planned.

## Node Core Contract

The TypeScript / Node.js product core is the owner of conversion semantics and
structured artifact shapes. The CLI is an adapter around that core for argument
parsing, file I/O, and stderr/stdout behavior.

Current core-facing entry points are:

- `convertPptxToMarkdown(bytes, options)`: converts local PPTX bytes into Markdown, metadata, summary counts, diagnostics, and resolved image assets.
- `createPptx2MdSummaryText(result)`: projects a conversion result into the human-readable summary artifact.
- `createPptx2MdSummaryJsonData(result)`: projects a conversion result into the schema-versioned summary JSON artifact.
- `createPptx2MdAssetsManifestData(assets)`: projects resolved assets into the schema-versioned sidecar asset manifest.

The generated runtime bundle exports the same core entry points for downstream
Node, Agent Skill, MCP, and future separated Web adapter workflows.

## Output Policy

`miku-pptx2md` prioritizes slide structure over visual fidelity.

- Slide order is preserved.
- Each slide becomes a Markdown section.
- Text content is extracted in a stable reading order where practical.
- Speaker notes are included by default when resolvable.
- Images are exported as sidecar assets when explicitly requested.
- Unsupported visual features are reported through diagnostics rather than silently treated as converted content.

## Documentation

- High-level specification and design policy: [docs/pptx2md-spec.md](./docs/pptx2md-spec.md)
- Planned implementation-oriented specification: [docs/pptx2md-impl-spec.md](./docs/pptx2md-impl-spec.md)
- CLI usage contract: [docs/usage.md](./docs/usage.md)
- Known unsupported PowerPoint features: [docs/unsupported-features.md](./docs/unsupported-features.md)
- miku-soft shared reference entry point: [docs/miku-soft-reference.md](./docs/miku-soft-reference.md)
- Specification worklog: [docs/spec-worklog.md](./docs/spec-worklog.md)

## Build And Test

```bash
npm install
npm run build
npm run test:unit
npm run build:runtime
npm run smoke:runtime
```

GitHub Actions runs the same build and unit-test baseline for branch pushes, pull requests, and `v*` version tags such as `v0.4.0`.

## License

Apache License 2.0.

See [LICENSE](./LICENSE).
