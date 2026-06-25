# miku-pptx2md Usage Design

This document describes the planned CLI contract for `miku-pptx2md`.

The CLI is not implemented yet. This file is a specification target for the first implementation.

## Convert A Presentation

```bash
npm run cli -- ./sample.pptx --out ./sample.md
```

## Export Image Assets

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

## Print Or Save Summary

Print summary to stdout:

```bash
npm run cli -- ./sample.pptx --out ./sample.md --summary
```

Save summary to a file:

```bash
npm run cli -- ./sample.pptx --out ./sample.md --summary-out ./sample.summary.txt
```

## Speaker Notes

Speaker notes are included by default because they often contain the prose explanation missing from slide bullets.

Users can exclude notes:

```bash
npm run cli -- ./sample.pptx --out ./sample.md --no-notes
```

## Debug Output

Unsupported trace comments may be included in Markdown for diagnostics:

```bash
npm run cli -- ./sample.pptx --out ./sample.md --debug
```

Debug comments are not intended as final human-facing prose.

## Verbose Diagnostics

Progress and timing diagnostics should go to stderr with a stable prefix:

```bash
npm run cli -- ./sample.pptx --out ./sample.md --verbose
```

Verbose output must not mix with primary Markdown output.

## Planned Options

| Option | Description |
| --- | --- |
| `--out <file>` | Markdown output path |
| `--assets-dir <dir>` | Export resolved embedded image assets |
| `--summary` | Print summary to stdout |
| `--summary-out <file>` | Write summary to a file |
| `--no-notes` | Exclude speaker notes |
| `--debug` | Include unsupported trace comments in Markdown |
| `--verbose` | Print progress and timing diagnostics to stderr |
| `--version` | Print version |
| `--help` | Print help |

## Planned Exit Codes

| Code | Meaning |
| --- | --- |
| `0` | Success |
| `1` | Expected processing failure |
| `2` | Invalid CLI usage |
| `3` | Unexpected runtime error |
