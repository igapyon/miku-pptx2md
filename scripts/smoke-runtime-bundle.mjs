import { pathToFileURL } from "node:url";

import { createMinimalPptx } from "../tests/pptx-fixture.mjs";

const runtime = await import(pathToFileURL("bundle/miku-pptx2md-runtime.mjs"));

if (runtime.version !== "0.4.0") {
  throw new Error(`Unexpected runtime version: ${runtime.version}`);
}

if (typeof runtime.convertPptxToMarkdown !== "function") {
  throw new Error("Runtime bundle does not export convertPptxToMarkdown.");
}

const result = runtime.convertPptxToMarkdown(createMinimalPptx(), { title: "runtime-smoke" });
if (!result.markdown.includes("# runtime-smoke") || !result.markdown.includes("## Slide 1: Overview")) {
  throw new Error("Runtime bundle conversion smoke output did not include expected Markdown.");
}

console.log("[smoke:runtime] runtime bundle conversion passed");
