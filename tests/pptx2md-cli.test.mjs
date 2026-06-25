import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createImagePptx, createMetadataPptx, createMinimalPptx, createMissingImagePptx } from "./pptx-fixture.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");

test("prints agent-readable help without requiring an input file", () => {
  const helpOutput = execFileSync(
    process.execPath,
    [
      "scripts/miku-pptx2md-cli.mjs",
      "--help"
    ],
    {
      cwd: REPO_ROOT,
      encoding: "utf8"
    }
  );

  assert.match(helpOutput, /miku-pptx2md - local-first PPTX to Markdown converter/);
  assert.match(helpOutput, /USAGE/);
  assert.match(helpOutput, /CONTRACT/);
  assert.match(helpOutput, /OPTIONS/);
  assert.match(helpOutput, /OUTPUTS/);
  assert.match(helpOutput, /EXAMPLES/);
  assert.match(helpOutput, /EXIT CODES/);
  assert.match(helpOutput, /Input is exactly one local \.pptx file path\./);
  assert.match(helpOutput, /If --out is omitted, Markdown is written to stdout\./);
  assert.match(helpOutput, /--verbose writes progress and timing diagnostics to stderr\./);
  assert.match(helpOutput, /--help and --version are metadata commands and must be used without other arguments\./);
  assert.match(helpOutput, /Core metadata plus text, list, table, hyperlink, image, notes, and diagnostics counts\./);
  assert.match(helpOutput, /--summary-json-out <file>/);
  assert.match(helpOutput, /Omit speaker notes from Markdown output\./);
  assert.match(helpOutput, /--include-unsupported-comments/);
  assert.match(helpOutput, /manifest\.json/);
});

test("prints package version with product name", () => {
  const packageJson = JSON.parse(readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"));
  const versionOutput = execFileSync(
    process.execPath,
    [
      "scripts/miku-pptx2md-cli.mjs",
      "--version"
    ],
    {
      cwd: REPO_ROOT,
      encoding: "utf8"
    }
  );

  assert.equal(versionOutput, `miku-pptx2md ${packageJson.version}\n`);
});

test("rejects metadata commands mixed with other arguments", () => {
  for (const args of [
    ["sample.pptx", "--version"],
    ["--help", "--version"]
  ]) {
    const result = spawnSync(
      process.execPath,
      [
        "scripts/miku-pptx2md-cli.mjs",
        ...args
      ],
      {
        cwd: REPO_ROOT,
        encoding: "utf8"
      }
    );

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /Use --help or --version without other arguments\./);
  }
});

test("reports read failures with the input presentation name and stage", () => {
  const result = spawnSync(
    process.execPath,
    [
      "scripts/miku-pptx2md-cli.mjs",
      "does-not-exist.pptx"
    ],
    {
      cwd: REPO_ROOT,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /\[does-not-exist\.pptx\] read failed:/);
});

test("writes markdown, summary, and verbose diagnostics", () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "pptx2md-cli-"));
  try {
    const inputPath = path.join(tempDir, "sample.pptx");
    const outputPath = path.join(tempDir, "sample.md");
    const summaryPath = path.join(tempDir, "sample.summary.txt");
    writeFileSync(inputPath, createMinimalPptx());

    const result = spawnSync(
      process.execPath,
      [
        "scripts/miku-pptx2md-cli.mjs",
        inputPath,
        "--out",
        outputPath,
        "--summary-out",
        summaryPath,
        "--verbose"
      ],
      {
        cwd: REPO_ROOT,
        encoding: "utf8"
      }
    );

    assert.equal(result.status, 0);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /verbose:/);
    assert.match(result.stderr, new RegExp(`input=${escapeRegExp(inputPath)}`));
    assert.match(result.stderr, new RegExp(`output=${escapeRegExp(outputPath)}`));
    assert.match(result.stderr, new RegExp(`summary=${escapeRegExp(summaryPath)}`));
    assert.match(result.stderr, /assets=disabled/);
    assert.match(result.stderr, /input-bytes=/);
    assert.match(result.stderr, /converted slides=1 textBlocks=2/);
    assert.match(result.stderr, new RegExp(`summary-written ${escapeRegExp(summaryPath)}`));
    assert.match(result.stderr, new RegExp(`markdown-written ${escapeRegExp(outputPath)}`));
    assert.match(result.stderr, /done total-ms=/);
    assert.match(readFileSync(outputPath, "utf8"), /## Slide 1: Overview/);
    assert.match(readFileSync(summaryPath, "utf8"), /slides: 1/);
    assert.match(readFileSync(summaryPath, "utf8"), /listItems: 0/);
    assert.match(readFileSync(summaryPath, "utf8"), /tables: 0/);
    assert.match(readFileSync(summaryPath, "utf8"), /hyperlinks: 0/);
    assert.match(readFileSync(summaryPath, "utf8"), /warnings: 0/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("uses core metadata title and writes metadata summary lines", () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "pptx2md-cli-metadata-"));
  try {
    const inputPath = path.join(tempDir, "fallback-name.pptx");
    const outputPath = path.join(tempDir, "metadata.md");
    const summaryPath = path.join(tempDir, "metadata.summary.txt");
    writeFileSync(inputPath, createMetadataPptx());

    const result = spawnSync(
      process.execPath,
      [
        "scripts/miku-pptx2md-cli.mjs",
        inputPath,
        "--out",
        outputPath,
        "--summary-out",
        summaryPath
      ],
      {
        cwd: REPO_ROOT,
        encoding: "utf8"
      }
    );

    assert.equal(result.status, 0);
    assert.match(readFileSync(outputPath, "utf8"), /^# Roadmap & Review\n\n## Slide 1: Metadata Slide/m);
    const summary = readFileSync(summaryPath, "utf8");
    assert.match(summary, /metadata.title: Roadmap & Review/);
    assert.match(summary, /metadata.creator: Alice/);
    assert.match(summary, /metadata.modified: 2026-06-25T11:30:00Z/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("writes structured summary JSON", () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "pptx2md-cli-summary-json-"));
  try {
    const inputPath = path.join(tempDir, "metadata.pptx");
    const outputPath = path.join(tempDir, "metadata.md");
    const summaryJsonPath = path.join(tempDir, "metadata.summary.json");
    writeFileSync(inputPath, createMetadataPptx());

    const result = spawnSync(
      process.execPath,
      [
        "scripts/miku-pptx2md-cli.mjs",
        inputPath,
        "--out",
        outputPath,
        "--summary-json-out",
        summaryJsonPath,
        "--verbose"
      ],
      {
        cwd: REPO_ROOT,
        encoding: "utf8"
      }
    );

    assert.equal(result.status, 0);
    assert.match(result.stderr, new RegExp(`summary-json=${escapeRegExp(summaryJsonPath)}`));
    assert.match(result.stderr, new RegExp(`summary-json-written ${escapeRegExp(summaryJsonPath)}`));

    const summaryJson = JSON.parse(readFileSync(summaryJsonPath, "utf8"));
    assert.equal(summaryJson.version, 1);
    assert.equal(summaryJson.metadata.title, "Roadmap & Review");
    assert.equal(summaryJson.metadata.creator, "Alice");
    assert.equal(summaryJson.summary.slides, 1);
    assert.equal(summaryJson.summary.slidesWithTitles, 1);
    assert.deepEqual(summaryJson.diagnostics, []);
    assert.deepEqual(summaryJson.assets, []);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("includes diagnostic comments in markdown when debug is set", () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "pptx2md-cli-debug-"));
  try {
    const inputPath = path.join(tempDir, "sample.pptx");
    const outputPath = path.join(tempDir, "sample.md");
    writeFileSync(inputPath, createMissingImagePptx());

    const result = spawnSync(
      process.execPath,
      [
        "scripts/miku-pptx2md-cli.mjs",
        inputPath,
        "--out",
        outputPath,
        "--debug"
      ],
      {
        cwd: REPO_ROOT,
        encoding: "utf8"
      }
    );

    assert.equal(result.status, 0);
    assert.match(readFileSync(outputPath, "utf8"), /<!-- warning: missing-image-part source=ppt\/slides\/slide1\.xml:/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("writes image assets and manifest when assets-dir is set", () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "pptx2md-cli-assets-"));
  try {
    const inputPath = path.join(tempDir, "sample.pptx");
    const outputPath = path.join(tempDir, "sample.md");
    const assetsDir = path.join(tempDir, "sample.assets");
    writeFileSync(inputPath, createImagePptx());

    const result = spawnSync(
      process.execPath,
      [
        "scripts/miku-pptx2md-cli.mjs",
        inputPath,
        "--out",
        outputPath,
        "--assets-dir",
        assetsDir
      ],
      {
        cwd: REPO_ROOT,
        encoding: "utf8"
      }
    );

    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
    assert.match(readFileSync(outputPath, "utf8"), /!\[Diagram alt\]\(sample\.assets\/ppt\/media\/image1\.png\)/);
    assert.deepEqual(Array.from(readFileSync(path.join(assetsDir, "ppt/media/image1.png"))), [137, 80, 78, 71]);
    assert.deepEqual(JSON.parse(readFileSync(path.join(assetsDir, "manifest.json"), "utf8")), {
      version: 1,
      assets: [
        {
          kind: "image",
          sourcePath: "ppt/media/image1.png",
          mediaType: "image/png",
          altText: "Diagram alt",
          sourceTrace: "picture:image(ppt/media/image1.png):alt(Diagram alt)",
          slideIndex: 1,
          blockIndex: 0,
          relationshipId: "rIdImage1",
          documentPosition: {
            slideIndex: 1,
            blockIndex: 0,
            blockKind: "image"
          },
          size: 4
        }
      ]
    });
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
