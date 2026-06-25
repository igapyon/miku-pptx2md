# miku-pptx2md

`miku-pptx2md` is a planned TypeScript / Node.js main application for converting PowerPoint (`.pptx`) presentations into Markdown-oriented artifacts.

This repository will own the product core, Node.js CLI, conversion semantics, diagnostics, fixtures, and tests. A browser Web App surface, if created later, should live in a separated `miku-pptx2md-web` repository.

## What is this?

`miku-pptx2md` will read `.pptx` files locally and extract slide titles, text boxes, lists, tables, speaker notes, resolved images, hyperlinks, and selected slide metadata into Markdown and related artifacts.

The conversion goal is meaningful Markdown extraction, not exact visual reproduction of PowerPoint slides.

## Sister References

This project follows the practical shape of these sister main applications:

- `miku-xlsx2md`: Excel workbook to Markdown artifacts
- `miku-docx2md`: Word document to Markdown plus sidecar assets

The initial `miku-pptx2md` direction adopts their CLI-first, local-first, TypeScript-first, ZIP/XML parsing, diagnostics, tests, and runtime bundle separation patterns where they fit PowerPoint.

## Planned Node CLI

The first planned CLI converts one input presentation at a time and writes Markdown to a file.

```bash
npm run cli -- ./sample.pptx --out ./sample.md
```

Planned asset export:

```bash
npm run cli -- ./sample.pptx --out ./sample.md --assets-dir ./sample.assets
```

Planned summary output:

```bash
npm run cli -- ./sample.pptx --out ./sample.md --summary --summary-out ./sample.summary.txt
```

The first CLI skeleton is being implemented from the specification. Initial behavior focuses on extracting ordered slide sections into Markdown.

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
- Planned CLI usage contract: [docs/usage.md](./docs/usage.md)
- miku-soft shared reference entry point: [docs/miku-soft-reference.md](./docs/miku-soft-reference.md)
- Specification worklog: [docs/spec-worklog.md](./docs/spec-worklog.md)

## Build And Test

No executable implementation exists yet.

After implementation starts, this repository should use the same broad shape as the sister Node main applications:

```bash
npm install
npm run build
npm run test:unit
```

## License

Apache License 2.0.

See [LICENSE](./LICENSE).
