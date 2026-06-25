# pptx2md Specification

## 1. Document Overview

`pptx2md` is a tool that reads PowerPoint presentations in `.pptx` format and converts their slide structure into Markdown-oriented artifacts.

The goal is not to reproduce the visual appearance of Microsoft PowerPoint slides exactly.
The goal is to extract slide content and presentation structure in a form that is easy for humans to read and easy for generative AI systems to consume.

This tool should be designed as:

- `PowerPoint slide structure extraction -> Markdown`

not simply:

- `PowerPoint appearance reproduction -> Markdown`

This document describes the high-level specification and design policy.
Implementation-specific behavior should be documented in `pptx2md-impl-spec.md` once the first implementation exists.

## 2. Scope

### 2.1 Supported Input

- `.pptx`

### 2.2 Unsupported Input

The first cut does not target:

- `.ppt`
- `.odp`
- pasted slide content or clipboard input
- encrypted or password-protected presentations
- macro behavior

### 2.3 Supported Content in First Cut

The first cut should focus on content that maps cleanly into Markdown and sidecar assets.

- slide order
- slide titles
- text boxes and placeholder text
- paragraphs and inline text runs
- bullet and numbered lists when represented in slide XML
- hyperlinks
- basic tables
- text inside ordinary shapes such as rectangles, callouts, and arrows when it is represented as normal DrawingML text
- resolved embedded image references as sidecar assets
- speaker notes
- basic presentation and slide metadata useful for traceability

### 2.4 Out of Scope in First Cut

The first cut intentionally excludes visual and layout-heavy reproduction.

- exact slide layout reproduction
- theme-accurate typography and colors
- animations
- transitions
- SmartArt reconstruction
- chart data reconstruction
- geometric shape rendering
- video and audio media extraction beyond diagnostics
- embedded OLE object conversion
- comments and review metadata
- master slide rendering
- pixel-perfect image placement

Visual features may be diagnosed and counted without being converted into normal Markdown.

## 3. Target Presentations

`pptx2md` primarily targets presentation-style inputs whose main value is in written slide content and speaker notes.

- technical presentations
- design review decks
- meeting decks
- training material
- project reports
- architecture explanation slides
- AI handoff decks where slide text matters more than exact layout

## 4. Design Principles

### 4.1 Output Purpose

The Markdown output should aim to satisfy the following:

- easy for humans to read
- easy for generative AI to process
- preserves slide order
- preserves meaningful slide text structure
- preserves speaker notes where available
- preserves enough source traceability to understand where content came from
- makes unsupported, partial, or lossy conversion visible

### 4.2 Conversion Policy

- prioritize semantic slide content over visual fidelity
- preserve presentation slide order from `ppt/presentation.xml`
- map slide titles and body text into ordinary Markdown where reasonable
- prefer stable and predictable output over aggressive visual inference
- keep the first cut small and testable
- prioritize features that can be expressed naturally in GitHub-compatible Markdown / HTML
- do not force representation for features that do not fit GitHub-compatible Markdown / HTML naturally

In other words, the conversion policy is:

- if a PowerPoint feature can be represented reasonably in Markdown / HTML, preserve it
- if it cannot be represented reasonably in that range, expose it through diagnostics in the first cut

This is a deliberate output policy, not merely an implementation limitation.

### 4.3 Relationship to Sister Apps

`pptx2md` should reuse ideas from `miku-xlsx2md` and `miku-docx2md`, especially:

- documentation structure
- separation of core logic and UI
- CLI-first local processing
- test-first implementation style
- ZIP container handling approach
- XML parsing style
- TypeScript-first source management
- sidecar asset export and manifest patterns
- unsupported element diagnostics
- browser/runtime separation

Unless there is a clear PowerPoint-specific reason to differ, `pptx2md` should imitate the sister apps in implementation style, naming discipline, test style, and runtime separation.

However, `pptx2md` should not inherit spreadsheet-specific behavior.
There is no table-region detection problem equivalent to Excel sheet analysis.
There is also no single flowing document order equivalent to Word.
The main parsing targets are presentation slide order, per-slide shape tree order, placeholder roles, notes slides, relationships, and media assets.

## 5. Output Unit and File Structure

### 5.1 Output Unit

The first cut should treat one `.pptx` file as one input and produce one combined Markdown document as the primary output.

Each slide should become one section in the combined Markdown document.

### 5.2 Default Output

The primary output should be:

- one combined Markdown file

When resolved embedded images are exported explicitly, a sidecar asset directory may accompany the Markdown output.
The primary output remains the Markdown document; sidecar image export does not imply slide layout reconstruction.

### 5.3 Naming

The default output file name should be based on the input presentation name.

Example:

- input: `deck.pptx`
- output: `deck.md`
- assets: `deck.assets/`
- summary: `deck.summary.txt` for human-readable text or `deck.summary.json` for schema-versioned structured output

## 6. Parsing Model

### 6.1 Container Handling

A `.pptx` file should be treated as a ZIP package.

As with the sister apps, shared low-level Microsoft Office package plumbing
should be provided by `miku-ms-office-core` where practical.
ZIP expansion, OPC path handling, relationships, content types, Office package
reading, XML helpers, and structured diagnostics are low-level foundation
concerns.

`miku-pptx2md` should keep PowerPoint-specific slide interpretation, extraction
policy, diagnostics vocabulary, and Markdown conversion decisions in this
repository.

The first cut should read at least the following package entries when present:

- `[Content_Types].xml`
- `_rels/.rels`
- `ppt/presentation.xml`
- `ppt/_rels/presentation.xml.rels`
- `ppt/slides/slide*.xml`
- `ppt/slides/_rels/slide*.xml.rels`
- `ppt/notesSlides/notesSlide*.xml`
- `ppt/notesSlides/_rels/notesSlide*.xml.rels`

Slide masters, slide layouts, themes, charts, and diagrams may be read later for diagnostics or richer extraction, but they should not block the first cut.

### 6.2 Core Internal Model

The internal model may remain small in the first cut.

- presentation
- slide
- slide block
- text run
- hyperlink
- list item
- table
- table row
- table cell
- image reference
- notes block
- diagnostic
- asset

The first cut may also keep lightweight internal metadata for:

- source package path
- slide index
- slide relationship id
- shape id or placeholder kind when available
- relationship target
- unsupported element diagnostics

### 6.3 Slide Order

The parser should preserve the slide order defined by `ppt/presentation.xml` and its relationships.
This is the primary structural axis for `pptx2md`.

File name ordering such as `slide1.xml`, `slide2.xml`, and `slide10.xml` must not replace presentation order.

### 6.4 Shape Reading Order

Within a slide, PowerPoint does not provide one universal prose reading order equivalent to Word document order.

The first cut should use a stable, conservative order:

1. slide title placeholder when available
2. body/content placeholders in XML order
3. other text-bearing shapes in XML order
4. tables in XML order
5. image references in XML order
6. notes section after slide content

This order is intentionally approximate.
When the order is uncertain, the output should remain stable and diagnostics may report that visual reading order was not inferred.

## 7. Markdown Conversion Rules

### 7.1 Presentation Header

The combined Markdown document should start with a presentation title.

If document properties or the input file name provide a useful title, use it.
Otherwise use the input file stem.

Example:

```markdown
# deck
```

### 7.2 Slide Sections

Each slide should become a Markdown section.

Recommended first-cut shape:

```markdown
## Slide 1: Overview

...
```

If no slide title is found, use:

```markdown
## Slide 1
```

### 7.3 Slide Titles

Slide title placeholders should be used as section titles when available.

If multiple title-like placeholders exist, use the first stable title candidate and keep additional title-like text in the slide body or diagnostics.

### 7.4 Text Boxes And Placeholders

PowerPoint text should be handled in these units:

- slide: one Markdown `##` section
- text-bearing shape or placeholder: one local text container
- paragraph: one logical text paragraph inside a shape text body
- run: one inline text segment with shared formatting and hyperlink properties
- line break: an explicit break inside a paragraph when represented in the XML

Ordinary paragraphs become Markdown paragraphs.

Multiple paragraphs inside one text box should preserve paragraph order.
Separate paragraphs should be separated by a blank line unless they are rendered as a list.

Runs inside the same paragraph should be joined into one Markdown paragraph while preserving supported inline formatting.
The converter should not emit a new Markdown paragraph for every run.

Explicit line breaks inside a PowerPoint paragraph may be rendered as Markdown hard breaks or `<br>` when preserving the break improves readability.
The exact first-cut representation should be documented in `pptx2md-impl-spec.md` after implementation.

Empty paragraphs should normally be ignored unless they are needed to separate meaningful text blocks.

Text-bearing placeholders may be grouped by placeholder role when useful, but the first cut should avoid adding noisy labels unless they improve readability.
For example, a body placeholder can usually be emitted as normal slide body text, while speaker notes should use the dedicated notes section.

The first cut should not try to reconstruct font size, exact text box position, or visual line wrapping as semantic paragraphs.
Those are layout properties and should be ignored or reported only as diagnostics when relevant.

Example:

```markdown
## Slide 1: Project Status

Current status is green.

- API design completed
- Parser implementation in progress
- Fixture collection pending
```

### 7.5 Lists

Bullet and numbered paragraphs should become Markdown lists when their list information is clear.

Nested levels should be represented with Markdown indentation.
If list metadata is ambiguous, preserve text as paragraphs and emit diagnostics rather than over-infer numbering.

### 7.6 Inline Formatting

The first cut may preserve simple inline formatting when it maps cleanly:

- bold
- italic
- strike
- hyperlinks

Underline, font size, color, and theme styling should not be treated as semantic content in the first cut unless a product-specific rule is later added.

### 7.7 Tables

PowerPoint tables should become Markdown tables when the grid is simple enough.

Merged cells are flattened into Markdown tables and reported through diagnostics because Markdown cannot preserve the original merge structure.
Unsupported table structure should be visible in diagnostics.

### 7.8 Images

Resolved embedded images should be exportable as sidecar assets when `--assets-dir` is specified.

Without asset export, Markdown may contain lightweight placeholders such as:

```markdown
[Image: alt text]
```

With asset export, Markdown may contain relative links such as:

```markdown
![alt text](deck.assets/ppt/media/image1.png)
```

The first cut should not attempt pixel-perfect placement or sizing.

### 7.9 Shapes, Diagrams, And Visual Objects

The first-cut strategy is not to discard every shape.
Instead, classify visual objects by how much semantic content can be extracted safely.

#### Extract As Text

If an ordinary PowerPoint shape contains normal DrawingML text, extract that text.
This covers common shapes such as:

- rectangles with labels
- callouts with text
- arrows with text
- process boxes
- simple grouped text-bearing shapes when the text is directly readable

The Markdown output should preserve the text content, not the exact geometry.
The first cut should preserve that the text came from an ordinary shape when doing so improves reviewability.
Recommended first-cut Markdown shape:

```markdown
> [Shape: rect] Decision box
> Follow-up label
```

Body placeholders and true text boxes may still be emitted as ordinary paragraphs under the owning slide.
It should not attempt to describe position, size, color, connector routing, or z-order as prose.

#### Export As Assets

If a visual object is a resolved embedded bitmap or similar media file, export it as a sidecar asset when asset export is requested.

The Markdown may use an image link or lightweight placeholder.
This preserves the source artifact without pretending to understand the visual semantics.

#### Diagnose Or Placeholder

If a visual object has important presence but cannot be converted into useful Markdown, expose it through diagnostics and, when debug output is requested, concise Markdown comments or placeholders.

This category includes:

- SmartArt
- charts
- diagrams whose meaning depends on geometry
- connector-only drawings
- icons without useful alt text
- embedded OLE objects
- video or audio objects

Normal Markdown should not invent a textual interpretation of these objects.
For example, a flowchart should not be converted into process steps unless the text and structure can be extracted reliably.

#### Future Extension

A later version may add optional slide-thumbnail or object-image extraction.
That would be a visual reference artifact, not the primary Markdown conversion.
The core Markdown contract should still remain text/structure-first.

### 7.10 Speaker Notes

Speaker notes should be extracted when resolvable.

Speaker notes should be included by default because they often contain the prose explanation missing from slide bullets.
The CLI should provide `--no-notes` so users can exclude notes when they only want slide-visible content.

Recommended Markdown shape:

```markdown
### Speaker Notes

...
```

### 7.11 Unsupported Content

Unsupported content should not silently disappear from the product contract.

Normal Markdown may omit unsupported visual content, but the conversion result should expose diagnostics for:

- charts
- SmartArt
- media objects
- embedded OLE objects
- animations
- unsupported drawings
- unreadable relationships
- missing referenced parts

Debug output may include concise HTML comments in Markdown when requested.

## 8. Asset Export

When `--assets-dir <dir>` is specified, resolved embedded images should be written under a safe sidecar directory.

Recommended path shape:

```text
deck.assets/
  manifest.json
  ppt/
    media/
      image1.png
      image2.jpeg
```

The asset writer must reject unsafe package paths before writing files.
At minimum, reject empty segments, `.` / `..`, absolute paths, and paths outside the expected media roots.

The manifest should include:

- asset kind
- source package path
- output path
- content type
- byte size
- owning slide index
- relationship id when available
- alt text when available
- source trace

## 9. Summary And Diagnostics

The converter should expose a summary that is useful for humans and AI agents.

Recommended summary counts:

- slides
- slides with titles
- text blocks
- list items
- tables
- images
- exported image assets
- notes slides
- hyperlinks
- unsupported elements
- warnings

Diagnostics should be structured internally even if the first user-facing summary is text.

Diagnostics should include:

- severity
- code
- message
- source package path
- slide index when available
- shape or relationship information when available

## 10. CLI Contract

The first CLI should be local-first and non-interactive.

Planned shape:

```bash
npm run cli -- ./sample.pptx --out ./sample.md
npm run cli -- ./sample.pptx --out ./sample.md --assets-dir ./sample.assets
npm run cli -- ./sample.pptx --out ./sample.md --summary
npm run cli -- ./sample.pptx --out ./sample.md --summary-json-out ./sample.summary.json
```

The CLI should follow the same broad help and argument shape as
`miku-docx2md`, while keeping the simple `--out` and `--summary` style also
used by `miku-xlsx2md`. Workbook-specific options such as ZIP export, encoding,
output modes, formatting modes, and table detection modes should not be copied
into `miku-pptx2md` unless PPTX-specific behavior later justifies them.

Current options:

- `--out <file>`: write Markdown to a file
- `--assets-dir <dir>`: export resolved embedded image assets
- `--summary`: print summary to stdout
- `--summary-out <file>`: write summary to a file
- `--summary-json-out <file>`: write structured summary JSON to a file
- `--no-notes`: exclude speaker notes when notes are included by default
- `--debug`: include unsupported trace comments in Markdown
- `--include-unsupported-comments`: alias for `--debug`
- `--verbose`: write progress and timing diagnostics to stderr
- `--version`: print version
- `--help`: print help

Exit codes:

- `0`: success, or explicit metadata command such as `--version` / `--help`
- `1`: CLI usage error, file I/O error, parse error, or unexpected runtime error

## 11. Repository And Runtime Shape

The planned repository shape follows the sister Node main applications.

- `src/ts/`: TypeScript source of truth
- `dist/js/`: generated JavaScript output, not hand-maintained
- `scripts/`: CLI, build, smoke, and bundle scripts
- `tests/`: fixtures and regression tests
- `docs/`: specifications and usage documents
- `bundle/`: generated runtime artifacts
- `workplace/`: local scratch and reference area

Downstream Web App ownership should be separated into `miku-pptx2md-web` if a browser UI is created.

## 12. First-Cut Open Questions

These decisions should be finalized before implementation begins:

- Speaker notes are included by default. `--no-notes` excludes them.
- Summary is available as human-readable text and as schema-versioned JSON. Diagnostics should remain structured internally and be represented directly in JSON summary output.
- Image export should preserve safe original package paths under the sidecar asset directory, such as `ppt/media/image1.png`.
- Merged PowerPoint tables are represented as flattened Markdown tables with diagnostics.
- Bold and italic text runs are preserved as Markdown emphasis in the first implementation. Underline text runs are preserved as Markdown-compatible inline HTML.
- Slide comments are diagnosed in the first cut and may be exposed as structured content later.
