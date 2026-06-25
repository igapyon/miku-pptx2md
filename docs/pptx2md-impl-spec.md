# pptx2md Implementation Specification

This document will record implementation-specific behavior for `miku-pptx2md`.

The executable implementation does not exist yet. For now, this document captures the intended first implementation shape so the first code pass has a clear boundary.

## Source Layout

Planned source-of-truth layout:

```text
src/ts/
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

## Processing Pipeline

Planned pipeline:

1. Read `.pptx` bytes.
2. Expand required ZIP entries.
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

## Known Initial Gaps

- No implementation exists yet.
- No fixture format is finalized yet.
- No JSON summary schema is finalized yet.
- Complex visual ordering is intentionally not solved in the first cut.
