import { execFileSync } from "node:child_process";

const cliPath = "bundle/miku-pptx2md.mjs";

const versionOutput = execFileSync(process.execPath, [cliPath, "--version"], { encoding: "utf8" });
if (versionOutput !== "miku-pptx2md 0.4.2\n") {
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
