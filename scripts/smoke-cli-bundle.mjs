import { execFileSync } from "node:child_process";
import fs from "node:fs";

const cliPath = "bundle/miku-pptx2md.mjs";
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const expectedVersionOutput = `miku-pptx2md ${packageJson.version}\n`;

const versionOutput = execFileSync(process.execPath, [cliPath, "--version"], { encoding: "utf8" });
if (versionOutput !== expectedVersionOutput) {
  throw new Error(`Unexpected CLI bundle version output: ${JSON.stringify(versionOutput)}`);
}

const helpOutput = execFileSync(process.execPath, [cliPath, "--help"], { encoding: "utf8" });
if (!helpOutput.includes("miku-pptx2md - local-first PPTX to Markdown converter")) {
  throw new Error("CLI bundle help output did not include the expected title.");
}
if (!helpOutput.includes("--version")) {
  throw new Error("CLI bundle help output did not include --version.");
}

console.log("[smoke:bundle] CLI bundle metadata commands passed");
