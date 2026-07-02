#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

import { getSafePptxPackagePathParts } from "../dist/js/asset-path.js";
import {
  convertPptxToMarkdown,
  createPptx2MdAssetsManifestData,
  createPptx2MdSummaryJsonData,
  createPptx2MdSummaryText
} from "../dist/js/core.js";

const FRONT_MATTER_MODES = new Set(["include", "exclude"]);

const FLAG_OPTIONS = {
  "--summary"(options) {
    options.summary = true;
  },
  "--no-notes"(options) {
    options.includeNotes = false;
  },
  "--debug"(options) {
    options.includeUnsupportedComments = true;
  },
  "--include-unsupported-comments"(options) {
    options.includeUnsupportedComments = true;
  },
  "--verbose"(options) {
    options.verbose = true;
  }
};

const VALUE_OPTIONS = {
  "--out": {
    apply(options, value) {
      options.outPath = value;
    }
  },
  "--assets-dir": {
    apply(options, value) {
      options.assetsDir = value;
    }
  },
  "--summary-out": {
    apply(options, value) {
      options.summaryOutPath = value;
    }
  },
  "--summary-json-out": {
    apply(options, value) {
      options.summaryJsonOutPath = value;
    }
  },
  "--front-matter": {
    apply(options, value) {
      if (!FRONT_MATTER_MODES.has(value)) {
        throw new Error(`Invalid front matter mode: ${value}`);
      }
      options.frontMatter = value;
    }
  }
};

function printHelp() {
  console.log(`miku-pptx2md - local-first PPTX to Markdown converter

USAGE
  node scripts/miku-pptx2md-cli.mjs <input.pptx> [options]
  node scripts/miku-pptx2md-cli.mjs --version
  node scripts/miku-pptx2md-cli.mjs --help

CONTRACT
  Input is exactly one local .pptx file path.
  Primary output is Markdown.
  If --out is set, Markdown is written to that file.
  If --out is omitted, Markdown is written to stdout.
  --summary prints conversion summary text to stdout.
  --summary-out writes conversion summary text to a file.
  --summary-json-out writes structured summary JSON to a file.
  If --out is omitted, avoid --summary unless mixed stdout output is acceptable.
  --verbose writes progress and timing diagnostics to stderr.
  --help and --version are metadata commands and must be used without other arguments.

OPTIONS
  --out <file>
      Write Markdown to this file. Parent directories are created.

  --assets-dir <dir>
      Export resolved embedded image assets into this directory.
      Also writes <dir>/manifest.json.
      Markdown image links are made relative to --out, or to the current directory
      when --out is omitted.

  --summary
      Print summary text to stdout.

  --summary-out <file>
      Write summary text to this file. Parent directories are created.

  --summary-json-out <file>
      Write structured summary JSON to this file. Parent directories are created.

  --front-matter <mode>
      include or exclude. Default: include.

  --no-notes
      Omit speaker notes from Markdown output.

  --debug
      Include diagnostic HTML comment traces in Markdown.

  --include-unsupported-comments
      Alias for --debug.

  --verbose
      Write progress and timing diagnostics to stderr with a "verbose:" prefix.
      Primary Markdown and summary outputs are unchanged.

  --version
      Show product name and package version, then exit.

  --help
      Show this help, then exit.

OUTPUTS
  Markdown:
      Main converted presentation structure. Starts with YAML front matter by
      default; use --front-matter exclude to omit it. Each slide is emitted as
      a section.

  Summary:
      Core metadata plus text, list, table, hyperlink, image, notes, and diagnostics counts.

  Asset directory:
      Contains resolved embedded image files at package-relative paths such as
      ppt/media/example.png, plus manifest.json.

  Asset manifest:
      JSON with asset path, media type, alt text, byte size, source trace,
      slide index, block index, relationship id, and document position.

EXAMPLES
  Write Markdown to a file:
    node scripts/miku-pptx2md-cli.mjs ./sample.pptx --out ./sample.md

  Print Markdown to stdout:
    node scripts/miku-pptx2md-cli.mjs ./sample.pptx

  Write Markdown and summary files:
    node scripts/miku-pptx2md-cli.mjs ./sample.pptx --out ./sample.md --summary-out ./sample.summary.txt

  Write structured summary JSON:
    node scripts/miku-pptx2md-cli.mjs ./sample.pptx --out ./sample.md --summary-json-out ./sample.summary.json

  Omit YAML front matter:
    node scripts/miku-pptx2md-cli.mjs ./sample.pptx --out ./sample.md --front-matter exclude

  Print a summary:
    node scripts/miku-pptx2md-cli.mjs ./sample.pptx --out ./sample.md --summary

  Write Markdown and export image assets:
    node scripts/miku-pptx2md-cli.mjs ./sample.pptx --out ./sample.md --assets-dir ./sample.assets

  Include diagnostic debug comments:
    node scripts/miku-pptx2md-cli.mjs ./sample.pptx --out ./sample.md --debug

  Show progress diagnostics on stderr:
    node scripts/miku-pptx2md-cli.mjs ./sample.pptx --out ./sample.md --verbose

  Show version:
    node scripts/miku-pptx2md-cli.mjs --version

EXIT CODES
  0  Success, or explicit metadata command such as --version / --help.
  1  CLI usage error, file I/O error, parse error, or unexpected runtime error.
`);
}

async function readPackageVersion() {
  const packageJson = JSON.parse(await fs.readFile(new URL("../package.json", import.meta.url), "utf8"));
  return typeof packageJson.version === "string" ? packageJson.version : "0.0.0";
}

function parseArgs(args) {
  if (args.length === 1 && args[0] === "--help") {
    return { help: true };
  }
  if (args.length === 1 && args[0] === "--version") {
    return { version: true };
  }
  if (args.includes("--help") || args.includes("--version")) {
    throw new Error("Use --help or --version without other arguments.");
  }

  const options = {
    inputPath: null,
    outPath: null,
    assetsDir: null,
    summaryOutPath: null,
    summaryJsonOutPath: null,
    summary: false,
    frontMatter: "include",
    includeNotes: true,
    includeUnsupportedComments: false,
    verbose: false
  };
  const positionals = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }

    const flagHandler = FLAG_OPTIONS[arg];
    if (flagHandler) {
      flagHandler(options);
      continue;
    }

    const valueOption = VALUE_OPTIONS[arg];
    if (valueOption) {
      const value = args[i + 1];
      if (!value) {
        throw new Error(`Missing value for ${arg}`);
      }
      i += 1;
      valueOption.apply(options, value);
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  if (positionals.length === 1) {
    [options.inputPath] = positionals;
  } else if (positionals.length > 1) {
    throw new Error("Specify exactly one input .pptx file.");
  }
  return options;
}

async function writeTextFile(outputPath, content) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, content, "utf8");
}

function createVerboseLogger(enabled, startedAt) {
  return (message) => {
    if (!enabled) return;
    const elapsedMs = Date.now() - startedAt;
    console.error(`verbose: +${elapsedMs}ms ${message}`);
  };
}

function formatPresentationError(inputPath, stage, error) {
  const inputName = path.basename(inputPath || "input.pptx");
  const message = error instanceof Error ? error.message : String(error);
  return `[${inputName}] ${stage}: ${message}`;
}

function createSummaryJsonText(result) {
  return JSON.stringify(createPptx2MdSummaryJsonData(result), null, 2) + "\n";
}

async function writeBinaryFile(outputPath, content) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, content);
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function resolveAssetOutputPath(assetsRootDir, packagePath) {
  const outputPath = path.resolve(assetsRootDir, ...getSafePptxPackagePathParts(packagePath));
  const relativePath = path.relative(assetsRootDir, outputPath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`PPTX asset path escapes assets directory: ${packagePath}`);
  }
  return outputPath;
}

function createAssetsManifestText(assets) {
  return JSON.stringify(createPptx2MdAssetsManifestData(assets), null, 2) + "\n";
}

async function readInputBytes(inputPath) {
  try {
    return await fs.readFile(inputPath);
  } catch (error) {
    throw new Error(formatPresentationError(inputPath, "read failed", error));
  }
}

function createImagePathResolver(resolvedAssetsDir, resolvedOutputPath) {
  if (!resolvedAssetsDir) {
    return undefined;
  }
  return (asset) => {
    const outputPath = resolveAssetOutputPath(resolvedAssetsDir, asset.sourcePath);
    const relativeBase = resolvedOutputPath ? path.dirname(resolvedOutputPath) : process.cwd();
    return toPosixPath(path.relative(relativeBase, outputPath) || path.basename(outputPath));
  };
}

function convertInputPresentation(inputBytes, options, resolvedAssetsDir, resolvedOutputPath, inputPath, packageVersion) {
  try {
    const inputStem = path.basename(options.inputPath).replace(/\.[^.]+$/, "");
    return convertPptxToMarkdown(inputBytes, {
      fallbackTitle: inputStem,
      frontMatter: options.frontMatter,
      toolVersion: packageVersion,
      includeNotes: options.includeNotes,
      includeUnsupportedComments: options.includeUnsupportedComments,
      imagePathResolver: createImagePathResolver(resolvedAssetsDir, resolvedOutputPath)
    });
  } catch (error) {
    throw new Error(formatPresentationError(inputPath, "parse failed", error));
  }
}

async function writeAssets(result, resolvedAssetsDir, inputPath) {
  if (!resolvedAssetsDir) {
    return;
  }

  try {
    await writeTextFile(path.join(resolvedAssetsDir, "manifest.json"), createAssetsManifestText(result.assets));
    for (const asset of result.assets) {
      await writeBinaryFile(resolveAssetOutputPath(resolvedAssetsDir, asset.sourcePath), asset.bytes);
    }
  } catch (error) {
    throw new Error(formatPresentationError(inputPath, "asset write failed", error));
  }
}

async function writeSummaryTextOutputs(result, options) {
  const summaryText = createPptx2MdSummaryText(result);

  if (options.summary) {
    console.log(summaryText);
  }
  if (options.summaryOutPath) {
    await writeTextFile(path.resolve(options.summaryOutPath), summaryText + "\n");
  }
}

async function writeSummaryJsonOutput(result, options) {
  if (options.summaryJsonOutPath) {
    await writeTextFile(path.resolve(options.summaryJsonOutPath), createSummaryJsonText(result));
  }
}

async function writeMarkdownOutput(result, resolvedOutputPath) {
  if (resolvedOutputPath) {
    await writeTextFile(resolvedOutputPath, result.markdown);
  } else {
    process.stdout.write(result.markdown);
  }
}

async function main() {
  const startedAt = Date.now();
  const options = parseArgs(process.argv.slice(2));
  const verbose = createVerboseLogger(options.verbose, startedAt);

  if (options.version) {
    const version = await readPackageVersion();
    console.log(`miku-pptx2md ${version}`);
    process.exit(0);
  }

  if (options.help || !options.inputPath) {
    printHelp();
    process.exit(options.help ? 0 : 1);
  }

  const inputPath = path.resolve(options.inputPath);
  const resolvedOutputPath = options.outPath ? path.resolve(options.outPath) : null;
  const resolvedAssetsDir = options.assetsDir ? path.resolve(options.assetsDir) : null;
  const packageVersion = await readPackageVersion();

  try {
    verbose(`input=${options.inputPath}`);
    verbose(`output=${options.outPath || "stdout"}`);
    verbose(`summary=${options.summaryOutPath || (options.summary ? "stdout" : "disabled")}`);
    verbose(`summary-json=${options.summaryJsonOutPath || "disabled"}`);
    verbose(`assets=${options.assetsDir || "disabled"}`);

    const inputBytes = await readInputBytes(inputPath);
    verbose(`input-bytes=${inputBytes.byteLength}`);

    const result = convertInputPresentation(inputBytes, options, resolvedAssetsDir, resolvedOutputPath, inputPath, packageVersion);
    verbose(`converted slides=${result.summary.slides} textBlocks=${result.summary.textBlocks} imageAssets=${result.summary.imageAssets}`);

    await writeAssets(result, resolvedAssetsDir, inputPath);
    if (resolvedAssetsDir) {
      verbose(`assets-written count=${result.assets.length}`);
    }

    try {
      await writeSummaryTextOutputs(result, options);
    } catch (error) {
      throw new Error(formatPresentationError(inputPath, "summary write failed", error));
    }
    if (options.summary) {
      verbose("summary-written stdout");
    }
    if (options.summaryOutPath) {
      verbose(`summary-written ${options.summaryOutPath}`);
    }

    try {
      await writeSummaryJsonOutput(result, options);
    } catch (error) {
      throw new Error(formatPresentationError(inputPath, "summary JSON write failed", error));
    }
    if (options.summaryJsonOutPath) {
      verbose(`summary-json-written ${options.summaryJsonOutPath}`);
    }

    try {
      await writeMarkdownOutput(result, resolvedOutputPath);
    } catch (error) {
      throw new Error(formatPresentationError(inputPath, "markdown write failed", error));
    }
    if (resolvedOutputPath) {
      verbose(`markdown-written ${options.outPath}`);
    } else {
      verbose("markdown-written stdout");
    }
    verbose(`done total-ms=${Date.now() - startedAt}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith(`[${path.basename(inputPath)}] `)) {
      throw error;
    }
    throw new Error(formatPresentationError(inputPath, "failed", error));
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
