# pptx2md Implementation Specification

This document records implementation-specific behavior for `miku-pptx2md`.

The current implementation is a first-cut TypeScript / Node.js converter. It reads core presentation metadata and ordered slides, extracts title placeholders and slide text, recognizes ordinary text-bearing shapes with preset geometry, and renders Markdown plus human-readable summary text.

The Node CLI is an adapter over the product core. Product semantics, summary
text, and structured artifact projections live under `src/ts/`; the CLI handles
arguments, file I/O, stdout/stderr separation, and safe sidecar writes.

## Source Layout

Planned source-of-truth layout:

```text
src/vendor/
  miku-ms-office-core-<version>.mjs
  miku-ms-office-core-<version>.mjs.map
src/ts/
  asset-path.ts
  core.ts
  zip-io.ts
  xml-utils.ts
  content-types-parser.ts
  rels-parser.ts
  presentation-parser.ts
  slide-parser.ts
  notes-parser.ts
  table-parser.ts
  markdown-renderer.ts
  asset-manifest.ts
```

The exact file split may change during implementation, but the first cut should avoid a monolithic parser.
The vendored `miku-ms-office-core` release asset is the low-level Office
package foundation; product-specific PPTX interpretation remains under
`src/ts/`.

## Processing Pipeline

Planned pipeline:

1. Read `.pptx` bytes.
2. Expand required ZIP entries through `miku-ms-office-core`.
3. Parse content types.
4. Parse root relationships.
5. Parse `ppt/presentation.xml`.
6. Resolve presentation slide relationships into ordered slide parts.
7. Parse each slide XML and slide relationship file.
8. Parse notes slides when resolvable.
9. Build an internal presentation model.
10. Render Markdown.
11. Export assets when requested.
12. Produce summary and diagnostics.

## First Internal Model Draft

```ts
export interface Pptx2MdResult {
  markdown: string;
  summary: Pptx2MdSummary;
  diagnostics: Pptx2MdDiagnostic[];
  assets: Pptx2MdAsset[];
}

export interface Pptx2MdPresentation {
  title: string;
  slides: Pptx2MdSlide[];
}

export interface Pptx2MdSlide {
  index: number;
  title?: string;
  blocks: Pptx2MdBlock[];
  notes: Pptx2MdBlock[];
  source: Pptx2MdSourceTrace;
}
```

This model is only a starting point. Stable public API fields should be documented after implementation tests prove the shape.

## Package Parts

First-cut required package parts:

- `[Content_Types].xml`
- `_rels/.rels`
- `ppt/presentation.xml`
- `ppt/_rels/presentation.xml.rels`
- ordered `ppt/slides/slide*.xml`
- matching `ppt/slides/_rels/slide*.xml.rels`

Optional package parts:

- `ppt/notesSlides/notesSlide*.xml`
- matching `ppt/notesSlides/_rels/notesSlide*.xml.rels`
- `ppt/media/*`
- document properties such as `docProps/core.xml`

## Diagnostics

Diagnostics should be structured in code even when exposed as text.

Recommended diagnostic fields:

```ts
export interface Pptx2MdDiagnostic {
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  source?: Pptx2MdSourceTrace;
}
```

## Safety Notes

- Do not write files outside explicit output paths.
- Reject unsafe asset package paths before file output.
- Do not follow package paths containing empty segments, `.`, `..`, or absolute roots.
- Keep CLI diagnostics on stderr unless stdout is explicitly used for summary or machine-readable output.
- Keep verbose progress separate from primary Markdown output.

## Fixture Strategy

Regression tests use generated minimal PPTX packages from `tests/pptx-fixture.mjs`.
The fixtures build small stored ZIP packages in memory and include only the Open XML parts needed for each behavior under test.

Current generated fixture coverage includes:

- core presentation metadata
- slide title and paragraph text
- text-bearing ordinary shapes and text boxes
- bold, italic, and underline text-run formatting
- bullet and numbered lists
- external text hyperlinks
- basic tables
- merged table cell diagnostics
- unsupported chart and SmartArt graphic-frame diagnostics
- unsupported video picture-object diagnostics
- unsupported slide comment diagnostics
- speaker notes
- resolved image assets
- missing image diagnostics

PowerPoint-authored real-world fixtures are intentionally separate and should be added only when stable sample documents are available for redistribution or local test use.

## Current Core Metadata Extraction

When `docProps/core.xml` is present, selected core properties are exposed through `result.metadata`.
The supported first-cut fields are title, subject, creator, description, keywords, last modified by, revision, category, created, and modified.

The Markdown document heading uses the explicit API title when provided, then the core metadata title, then the API fallback title, then `presentation`.
The CLI passes the input file stem as the fallback title, so a core title wins over the file name.

CLI summary text includes metadata lines such as:

```text
metadata.title: Roadmap
metadata.creator: Alice
```

## Known Initial Gaps

- Complex visual ordering is intentionally not solved in the first cut.

## Current Shape Text Rendering

Text from title placeholders is used as the slide heading when available.
Text from body placeholders and true text boxes is rendered as ordinary Markdown paragraphs.

Text from ordinary shapes that have preset geometry, such as `rect`, is rendered as a blockquote with a shape label:

```markdown
> [Shape: rect] Decision box
> Follow-up label
```

This preserves that the text came from a PowerPoint shape without trying to reproduce coordinates, size, color, or connector routing.

## Current List Rendering

Paragraphs with clear DrawingML list metadata are rendered as Markdown lists.

- `a:buChar` becomes a Markdown bullet item.
- `a:buAutoNum` becomes a Markdown ordered item using the stable `1.` marker.
- `a:pPr lvl="N"` becomes two-space indentation per level.

Paragraphs without clear list metadata remain ordinary Markdown paragraphs.

## Current Inline Formatting

Text runs with `a:rPr b="1"` are rendered with Markdown bold.
Text runs with `a:rPr i="1"` are rendered with Markdown italic.
Runs with both flags are rendered with combined Markdown emphasis.
Text runs with an `a:rPr u` value other than `none` are rendered with inline HTML underline.
Formatted hyperlink text keeps the same inline formatting inside the Markdown link label.

Font size, color, and theme styling are intentionally not reconstructed in the current first cut.

## Current Table Rendering

Simple PowerPoint tables in `p:graphicFrame` / `a:tbl` are rendered as Markdown tables.

- `a:tr` becomes a Markdown table row.
- `a:tc` text becomes a Markdown table cell.
- The first row is used as the Markdown header row.
- Table cells escape literal `|` characters.

Merged cells are rendered as flattened Markdown tables and reported as `limited-table-merged-cells` warnings.
Complex table styling and layout measurements are not reconstructed in the current first cut.

## Current Unsupported Graphic Frame Diagnostics

`p:graphicFrame` content that is not recognized as a simple `a:tbl` table is omitted from normal Markdown output.
When the frame appears to contain a chart, the converter records an `unsupported-chart` warning diagnostic with the slide package path.
When the frame appears to contain SmartArt or another DrawingML diagram, the converter records an `unsupported-smartart` warning diagnostic with the slide package path.

Debug output includes the warning as an HTML comment under `## Diagnostics` when `--debug` or `includeUnsupportedComments` is enabled.
Unknown non-table graphic frames are classified separately as `unsupported-graphic-frame`.

## Current Hyperlink Rendering

Text runs with `a:hlinkClick r:id="..."` are resolved through slide relationships whose type ends with `/hyperlink`.
External hyperlink targets are kept as URLs instead of package paths and rendered as Markdown links:

```markdown
See [project site](https://example.com/project?from=pptx) for details
```

The summary includes a `hyperlinks` count.
Missing hyperlink relationships are reported as warnings and the visible text is preserved without a Markdown link.
Internal slide links and action-style hyperlink behaviors are not reconstructed in the current first cut.

## Current Speaker Notes Rendering

Slide relationships are read from `ppt/slides/_rels/slideN.xml.rels` when present.
Relationships whose type ends with `/notesSlide` are resolved to `ppt/notesSlides/notesSlideN.xml`.

Speaker notes are included by default after slide content:

```markdown
### Speaker Notes

Speaker note text
```

Notes slide thumbnail placeholders with `p:ph type="sldImg"` are ignored.
When `includeNotes` is false, notes are parsed for summary behavior but omitted from Markdown rendering.

## Current Image Asset Rendering

Slide relationships are read from `ppt/slides/_rels/slideN.xml.rels`.
Relationships whose type ends with `/image` are resolved to package paths such as `ppt/media/image1.png`.

When no image path resolver is provided, Markdown contains a lightweight placeholder:

```markdown
[Image: Diagram alt]
```

When the CLI receives `--assets-dir <dir>`, it writes each resolved image under the sidecar directory using the original safe package path and renders a Markdown image link:

```markdown
![Diagram alt](sample.assets/ppt/media/image1.png)
```

The CLI also writes `<assets-dir>/manifest.json` with asset kind, source package path, media type, alt text, source trace, slide index, block index, relationship id, document position, and byte size.
The core helper `createPptx2MdAssetsManifestData(assets)` owns this manifest projection.
This intentionally follows the same broad manifest style as `miku-docx2md` while using PPTX-specific source fields.

## Current Unsupported Picture Diagnostics

`p:pic` content with an image `a:blip` is handled as an image asset.
When a picture-like object instead contains video, audio, or OLE object markers, the converter omits it from normal Markdown and records `unsupported-video`, `unsupported-audio`, or `unsupported-ole-object` warning diagnostics with the slide package path.

Media bytes are not exported in the current first cut.

## Current Slide Comment Diagnostics

Slide relationships whose type ends with `/comments` are detected and reported as `unsupported-comments` warning diagnostics.
Comment text and review metadata are not converted to normal Markdown in the current first cut.

## Current Summary And Diagnostics

The result object exposes selected core metadata, and CLI summary text includes metadata lines when present.
The summary object and CLI summary text include counts for slides, titled slides, text blocks, list items, tables, hyperlinks, image assets, notes slides, warnings, errors, and total diagnostics.
The core helper `createPptx2MdSummaryText(result)` owns this human-readable summary projection.

The CLI also supports `--summary-json-out <file>` for a structured summary artifact with schema `version: 1`.
The JSON object contains `metadata`, `summary`, `diagnostics`, and `assets` metadata without embedding asset bytes.
The core helper `createPptx2MdSummaryJsonData(result)` owns this structured JSON projection.

Diagnostics are structured with severity, code, message, and optional source package path.
When `includeUnsupportedComments` or CLI `--debug` is enabled, diagnostics are appended to Markdown as HTML comments under `## Diagnostics`.

## Current Node Core Contract

The current public product core entry points are:

- `convertPptxToMarkdown(bytes, options)`: converts local PPTX bytes into Markdown, metadata, summary counts, diagnostics, and resolved image assets.
- `createPptx2MdSummaryText(result)`: projects a conversion result into the human-readable summary artifact.
- `createPptx2MdSummaryJsonData(result)`: projects a conversion result into the schema-versioned summary JSON artifact.
- `createPptx2MdAssetsManifestData(assets)`: projects resolved assets into the schema-versioned sidecar asset manifest.

The generated runtime bundle exports the same entry points. This keeps the
main Node application usable as the upstream contract for local scripts, Agent
Skills, MCP adapters, and future separated Web adapters without making those
surfaces duplicate conversion or artifact-shape policy.
