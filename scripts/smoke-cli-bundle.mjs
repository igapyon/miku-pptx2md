import assert from "node:assert/strict";
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createMinimalPptx } from "../tests/pptx-fixture.mjs";

const cliPath = path.resolve("bundle/miku-pptx2md.mjs");
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const expectedVersionOutput = `${packageJson.version}\n`;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pptx2md-release-cli-"));

try {
  fs.writeFileSync(path.join(tempDir, "sample.pptx"), createMinimalPptx());
  for (const assetName of [
    `${packageJson.name}-${packageJson.version}.mjs`,
    `${packageJson.name}-${packageJson.version}.2.mjs`,
    "renamed cli's file.mjs"
  ]) {
    fs.copyFileSync(cliPath, path.join(tempDir, assetName));
    const options = { cwd: tempDir, encoding: "utf8" };
    const helpOutput = execFileSync(process.execPath, [assetName, "--help"], options);
    assert.match(helpOutput, /miku-pptx2md - lightweight local PPTX intake for AI agents/);
    assert.doesNotMatch(helpOutput, /scripts\/miku-pptx2md-cli\.mjs/);

    const usage = helpOutput.split("\n").find((line) => line.endsWith(" <input.pptx> [options]"));
    assert.ok(usage, "Help must contain the conversion usage command.");
    const command = usage.trim().replace(/ <input\.pptx> \[options\]$/, "");
    if (assetName.startsWith(packageJson.name)) {
      assert.equal(command, `node ${assetName}`);
    }
    const commandLines = helpOutput.split("\n").filter((line) => /^\s+node /.test(line));
    assert.ok(commandLines.every((line) => line.trim().startsWith(command + " ")),
      "Every example must use the same runtime filename.");
    assert.ok(helpOutput.includes(`${command} --help`));
    assert.ok(helpOutput.includes(`${command} --version`));

    // Run the literal examples in a directory containing no source checkout.
    assert.equal(execSync(`${command} --version`, options), expectedVersionOutput);
    assert.equal(execSync(`${command} --help`, options), helpOutput);
    const conversion = commandLines.find((line) => line.endsWith(" ./sample.pptx --out ./sample.md"));
    assert.ok(conversion, "Help must contain a runnable Markdown output example.");
    assert.equal(execSync(conversion.trim(), options), "");
    const markdown = fs.readFileSync(path.join(tempDir, "sample.md"), "utf8");
    assert.match(markdown, /## Slide 1: Overview/);
    assert.match(markdown, /First paragraph/);
  }
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log("[smoke:bundle] renamed release CLI help, version, and printed conversion examples passed");
