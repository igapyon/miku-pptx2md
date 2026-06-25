# Unsupported PowerPoint Features

`miku-pptx2md` prioritizes semantic Markdown extraction over visual reproduction.
This document records known unsupported or intentionally limited areas in the current first-cut implementation.

## Currently Supported In First Cut

- slide order from `ppt/presentation.xml`
- selected core presentation metadata from `docProps/core.xml`
- slide titles and text bodies
- simple bold and italic text runs as Markdown emphasis
- simple underline text runs as Markdown-compatible inline HTML
- inline formatting inside text hyperlink labels
- text-bearing ordinary shapes as labeled blockquotes
- bullet and numbered paragraphs with clear DrawingML list metadata
- simple `a:tbl` PowerPoint tables
- external text hyperlinks through slide relationships
- speaker notes through slide notes relationships
- resolved embedded images as placeholders or sidecar assets
- human-readable summary counts, structured summary JSON, and structured diagnostics
- unsupported chart and SmartArt graphic frames are reported as diagnostics
- unsupported video, audio, and OLE picture objects are reported as diagnostics
- unsupported slide comments are reported as diagnostics
- merged table cells are flattened with diagnostics

## Unsupported Or Limited

- exact slide layout, coordinates, z-order, colors, theme typography, and visual line wrapping
- font size, color, and theme-driven inline styling
- animations and transitions
- SmartArt reconstruction
- chart data reconstruction
- connector routing and geometry-dependent diagram meaning
- video and audio extraction beyond diagnostics
- embedded OLE object conversion beyond diagnostics
- comments and review metadata beyond diagnostics
- master slide rendering
- pixel-perfect slide or object rendering
- complex table layout such as exact merged-cell reconstruction and style-driven layout
- internal slide links and action-style hyperlink behaviors beyond ordinary external text links

Unsupported chart and SmartArt graphic frames are detected and reported as warnings, but chart data, diagram structure, and visual reconstruction are not converted to Markdown.
Unsupported video, audio, and OLE picture objects are detected and reported as warnings, but their media content is not exported or converted to Markdown.
Slide comments are detected through slide relationships and reported as warnings, but comment text and review metadata are not converted to Markdown.
Tables with merged cells are rendered as flattened Markdown tables and reported as warnings because Markdown cannot preserve the original merge structure.

## Diagnostic Policy

Unsupported content should not be interpreted as prose unless the source text and structure are directly readable.
Normal Markdown may omit unsupported visual content, while diagnostics expose known missing or unresolved relationships.

Use `--debug` to append diagnostic comments to Markdown when troubleshooting a conversion.
