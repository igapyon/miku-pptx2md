#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import { convertPptxToMarkdown } from "../dist/js/core.js";

const VERSION = "0.1.0";

try {
  await main(process.argv.slice(2));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
}

async function main(args) {
  if (args.includes("--help") || args.length === 0) {
    printHelp();
    return;
  }
  if (args.includes("--version")) {
    console.log(`miku-pptx2md ${VERSION}`);
    return;
  }

  const options = parseArgs(args);
  if (!options.inputPath) {
    usageError("Input .pptx path is required.");
  }

  const inputBytes = fs.readFileSync(options.inputPath);
  const inputStem = path.basename(options.inputPath).replace(/\.[^.]+$/, "");
  const result = convertPptxToMarkdown(inputBytes, {
    title: inputStem,
    includeNotes: options.includeNotes
  });

  if (options.outPath) {
    fs.mkdirSync(path.dirname(path.resolve(options.outPath)), { recursive: true });
    fs.writeFileSync(options.outPath, result.markdown, "utf8");
  } else {
    process.stdout.write(result.markdown);
  }

  if (options.summary) {
    console.log(formatSummary(result.summary));
  }
  if (options.summaryOutPath) {
    fs.mkdirSync(path.dirname(path.resolve(options.summaryOutPath)), { recursive: true });
    fs.writeFileSync(options.summaryOutPath, formatSummary(result.summary) + "\n", "utf8");
  }
}

function parseArgs(args) {
  const options = {
    inputPath: "",
    outPath: "",
    summary: false,
    summaryOutPath: "",
    includeNotes: true
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--out") {
      options.outPath = requireValue(args, ++i, arg);
    } else if (arg === "--summary") {
      options.summary = true;
    } else if (arg === "--summary-out") {
      options.summaryOutPath = requireValue(args, ++i, arg);
    } else if (arg === "--no-notes") {
      options.includeNotes = false;
    } else if (arg === "--debug" || arg === "--verbose") {
      // Accepted for contract compatibility; first implementation has no extra output yet.
    } else if (arg.startsWith("--")) {
      usageError(`Unknown option: ${arg}`);
    } else if (!options.inputPath) {
      options.inputPath = arg;
    } else {
      usageError(`Unexpected argument: ${arg}`);
    }
  }

  return options;
}

function requireValue(args, index, optionName) {
  const value = args[index];
  if (!value || value.startsWith("--")) {
    usageError(`${optionName} requires a value.`);
  }
  return value;
}

function usageError(message) {
  console.error(message);
  printHelp();
  process.exit(2);
}

function printHelp() {
  console.log(`miku-pptx2md - convert PowerPoint .pptx slide text into Markdown

Usage:
  miku-pptx2md <input.pptx> --out <output.md> [options]
  miku-pptx2md <input.pptx> > output.md
  miku-pptx2md --version
  miku-pptx2md --help

Default behavior:
  Preserves presentation slide order and emits each slide as a Markdown ## section.
  Speaker notes are included by default when implemented; use --no-notes to exclude them.

Outputs:
  stdout        Markdown when --out is omitted
  --out <file>  Markdown file output

Options:
  --out <file>          Write Markdown to a file
  --summary             Print a human-readable summary
  --summary-out <file>  Write a human-readable summary
  --no-notes            Exclude speaker notes
  --debug               Reserved for unsupported trace comments
  --verbose             Reserved for stderr progress diagnostics
  --version             Print version
  --help                Print help
`);
}

function formatSummary(summary) {
  return [
    `slides: ${summary.slides}`,
    `slidesWithTitles: ${summary.slidesWithTitles}`,
    `textBlocks: ${summary.textBlocks}`,
    `diagnostics: ${summary.diagnostics}`
  ].join("\n");
}
