# miku-pptx2md Usage

This document describes the CLI contract for `miku-pptx2md`.
The CLI is a Node adapter over the TypeScript product core: conversion
semantics, summary text shape, summary JSON shape, diagnostics, and asset manifest shape are owned
by the core, while the CLI owns argument parsing, file I/O, and stdout/stderr
behavior.

The current implementation supports one local `.pptx` input, Markdown output, core presentation metadata, sidecar image assets, external text hyperlinks, speaker notes, human-readable summary output, verbose stderr diagnostics, `--version`, and `--help`.

The CLI follows the same broad argument shape as the sister `miku-docx2md` CLI for Office document to Markdown conversion. It keeps the simple `--out` and `--summary` style also used by `miku-xlsx2md`, but does not adopt workbook-specific options such as ZIP export, encoding, output modes, or table detection modes. `--help` and `--version` are metadata commands and must be used without other arguments.

Some advanced conversion areas, such as richer object-specific diagnostics and additional object-specific extraction, remain planned.

## Convert A Presentation

```bash
npm run cli -- ./sample.pptx --out ./sample.md
```

## Export Image Assets

Image asset export writes resolved embedded images and `manifest.json` under the requested sidecar directory.

```bash
npm run cli -- ./sample.pptx --out ./sample.md --assets-dir ./sample.assets
```

Planned asset directory shape:

```text
sample.assets/
  manifest.json
  ppt/
    media/
      image1.png
```

The `manifest.json` artifact uses schema `version: 1` and is produced from the
same core projection as `createPptx2MdAssetsManifestData(result.assets)`.

## Print Or Save Summary

Print summary to stdout:

```bash
npm run cli -- ./sample.pptx --out ./sample.md --summary
```

Save summary to a file:

```bash
npm run cli -- ./sample.pptx --out ./sample.md --summary-out ./sample.summary.txt
```

Save structured summary JSON to a file:

```bash
npm run cli -- ./sample.pptx --out ./sample.md --summary-json-out ./sample.summary.json
```

When `docProps/core.xml` is present, summary text includes selected core metadata fields such as `metadata.title`, `metadata.creator`, `metadata.created`, and `metadata.modified`.
The core title is used as the Markdown document heading unless the core API caller provides an explicit title override.
The same human-readable summary shape is produced by the Node core helper
`createPptx2MdSummaryText(result)`.

Structured summary JSON uses schema `version: 1` and includes `metadata`, `summary`, `diagnostics`, and sidecar `assets` metadata.
The same structured summary shape is produced by the Node core helper
`createPptx2MdSummaryJsonData(result)`.

## Speaker Notes

Speaker notes are included by default when they are resolvable through slide notes relationships.
Pass `--no-notes` to omit them.

```bash
npm run cli -- ./sample.pptx --out ./sample.md --no-notes
```

## Debug Output

Diagnostic trace comments can be included in Markdown:

```bash
npm run cli -- ./sample.pptx --out ./sample.md --debug
```

The current CLI accepts `--debug` and `--include-unsupported-comments`. Debug comments are not intended as final human-facing prose.

## Verbose Diagnostics

Progress and timing diagnostics go to stderr with a stable `verbose:` prefix:

```bash
npm run cli -- ./sample.pptx --out ./sample.md --verbose
```

Verbose output does not mix with primary Markdown output.

## Current Options

| Option | Description |
| --- | --- |
| `--out <file>` | Markdown output path |
| `--summary` | Print summary to stdout |
| `--summary-out <file>` | Write summary to a file |
| `--summary-json-out <file>` | Write structured summary JSON to a file |
| `--assets-dir <dir>` | Export resolved embedded image assets and `manifest.json` |
| `--no-notes` | Omit speaker notes from Markdown output |
| `--debug` | Include diagnostic HTML comments in Markdown |
| `--include-unsupported-comments` | Alias for `--debug` |
| `--verbose` | Print progress and timing diagnostics to stderr |
| `--version` | Print version |
| `--help` | Print help |

## Exit Codes

| Code | Meaning |
| --- | --- |
| `0` | Success, or explicit metadata command such as `--version` / `--help` |
| `1` | CLI usage error, file I/O error, parse error, or unexpected runtime error |
