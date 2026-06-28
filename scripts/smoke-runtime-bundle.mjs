import { pathToFileURL } from "node:url";

import { createMinimalPptx } from "../tests/pptx-fixture.mjs";

const runtime = await import(pathToFileURL("bundle/miku-pptx2md-runtime.mjs"));

if (runtime.version !== "0.4.2") {
  throw new Error(`Unexpected runtime version: ${runtime.version}`);
}

if (typeof runtime.convertPptxToMarkdown !== "function") {
  throw new Error("Runtime bundle does not export convertPptxToMarkdown.");
}
if (typeof runtime.createPptx2MdSummaryText !== "function") {
  throw new Error("Runtime bundle does not export createPptx2MdSummaryText.");
}
if (typeof runtime.createPptx2MdSummaryJsonData !== "function") {
  throw new Error("Runtime bundle does not export createPptx2MdSummaryJsonData.");
}
if (typeof runtime.createPptx2MdAssetsManifestData !== "function") {
  throw new Error("Runtime bundle does not export createPptx2MdAssetsManifestData.");
}

const result = runtime.convertPptxToMarkdown(createMinimalPptx(), { title: "runtime-smoke" });
if (!result.markdown.includes("# runtime-smoke") || !result.markdown.includes("## Slide 1: Overview")) {
  throw new Error("Runtime bundle conversion smoke output did not include expected Markdown.");
}

const summaryJson = runtime.createPptx2MdSummaryJsonData(result);
if (summaryJson.version !== 1 || summaryJson.summary.slides !== 1) {
  throw new Error("Runtime bundle summary projection did not include expected counts.");
}

const summaryText = runtime.createPptx2MdSummaryText(result);
if (!summaryText.includes("slides: 1") || !summaryText.includes("textBlocks: 2")) {
  throw new Error("Runtime bundle summary text projection did not include expected counts.");
}

const manifest = runtime.createPptx2MdAssetsManifestData(result.assets);
if (manifest.version !== 1 || manifest.assets.length !== 0) {
  throw new Error("Runtime bundle asset manifest projection did not include expected assets.");
}

console.log("[smoke:runtime] runtime bundle conversion and artifact projections passed");
