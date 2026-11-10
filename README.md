# miku-pptx2md

`miku-pptx2md` is a lightweight, local PowerPoint (`.pptx`) intake tool for AI agents. It produces text-focused Markdown intermediate artifacts for search, summaries, and initial content review.

Conversion uses local ZIP/XML processing without an LLM or AI API, so the conversion itself consumes no inference tokens. An agent orchestrating the CLI or analyzing the resulting Markdown can consume tokens separately. With the same input, runtime, version, and options, conversion is deterministic and does not depend on model-generated results.

The output is an intermediate representation for understanding and handing off content. Layout, styling, images, shapes, and charts have limited preservation; consult the original presentation for visual details. The tool is AI-oriented, not AI-dependent, and is not layout-faithful.

This TypeScript / Node.js repository owns the product core, CLI, conversion semantics, diagnostics, fixtures, and tests. A browser Web App surface, if created later, should live in a separated `miku-pptx2md-web` repository.

## What is this?

`miku-pptx2md` reads `.pptx` files locally and currently extracts core presentation metadata, ordered slide sections, title placeholders, text bodies, text-bearing shapes, lists, simple tables, external text hyperlinks, speaker notes, and resolved image references into Markdown-oriented artifacts.

Current structured diagnostics report unsupported or incomplete extraction at the package-part level where available. Planned extensions include richer slide, object, and relationship traces plus separately scoped extraction for chart data and SmartArt text. Layout reconstruction, geometry-dependent diagrams, animations, and OLE, audio, or video conversion remain outside the initial scope; recognized unsupported objects are reported through diagnostics.

The conversion goal is meaningful Markdown extraction, not exact visual reproduction of PowerPoint slides.

The [Java companion](https://github.com/igapyon/miku-pptx2md-java) shares this local, text-focused intake purpose and follows Node as its semantic source. Output equivalence depends on the compared versions and fixtures; exact Node / Java output parity is not guaranteed without verification. See the [product message and Java comparison](docs/product-positioning.md).

## Sister References

This project follows the practical shape of these sister main applications:

- `miku-xlsx2md`: Excel workbook to Markdown artifacts
- `miku-docx2md`: Word document to Markdown plus sidecar assets

The initial `miku-pptx2md` direction adopts their CLI-first, local-first, TypeScript-first, ZIP/XML parsing, diagnostics, tests, and runtime bundle separation patterns where they fit PowerPoint.

Low-level Microsoft Office package plumbing is provided by the vendored
`miku-ms-office-core` release asset. `miku-pptx2md` keeps PowerPoint slide
interpretation and Markdown conversion policy in this repository.

## Node CLI

The CLI converts one input presentation at a time and writes Markdown to a file. Node.js 22 or newer is required.

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

Image asset export, speaker note extraction, table extraction, list extraction, bold/italic/underline text run formatting, external text hyperlink extraction, YAML front matter, debug comments, text summary, JSON summary, and summary diagnostics are implemented in first-cut form. Richer object-specific diagnostics are still planned.

## Node Core Contract

The TypeScript / Node.js product core is the owner of conversion semantics and
structured artifact shapes. The CLI is an adapter around that core for argument
parsing, file I/O, and stderr/stdout behavior.

Current core-facing entry points are:

- `convertPptxToMarkdown(bytes, options)`: asynchronously converts local PPTX bytes into Markdown, metadata, summary counts, diagnostics, and resolved image assets. It returns `Promise<Pptx2MdResult>`.
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
- Product vocabulary, Java comparison, and proposed GitHub About: [docs/product-positioning.md](./docs/product-positioning.md)

## Build And Test

```bash
npm install
npm run build
npm run test:unit
npm run build:bundle
npm run smoke:bundle
npm run build:runtime
npm run smoke:runtime
```

GitHub Actions runs the same build and unit-test baseline for branch pushes, pull requests, and `v*` version tags such as `v0.8.1`.

When a GitHub Release for a `v*` tag is published, the release asset workflow builds and smokes the CLI and runtime bundles, creates a source archive, and uploads:

- `miku-pptx2md-<version>.mjs`
- `miku-pptx2md-runtime-<version>.mjs`
- `miku-pptx2md-sources-<version>.tgz`

## License

Apache License 2.0.

See [LICENSE](./LICENSE).
