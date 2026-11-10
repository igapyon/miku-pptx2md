import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";
import { expect, test } from "@playwright/test";

import { readZipPackage, writeZipPackage } from "../../dist/vendor/miku-ms-office-core-0.8.0.mjs";
import { createMinimalPptx } from "../pptx-fixture.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const runtimeSource = readFileSync(path.resolve(rootDir, "bundle/miku-pptx2md-runtime.mjs"), "utf8");
const browserRuntime = (await transform(runtimeSource, {
  format: "iife",
  globalName: "PptxRuntime",
  target: "es2022"
})).code;
const storedPackage = await readZipPackage(createMinimalPptx());
const compressedPptx = await writeZipPackage(
  storedPackage.entries.map(({ path: entryPath, data }) => ({ path: entryPath, data, compression: "deflate" })),
  { compression: "deflate", order: "input" }
);

test("runtime reads a compressed PPTX in a real browser", async ({ page }) => {
  await page.setContent("<!doctype html><html><body></body></html>");
  await page.addScriptTag({ content: browserRuntime });
  const markdown = await page.evaluate(async (bytes) => {
    const result = await globalThis.PptxRuntime.convertPptxToMarkdown(new Uint8Array(bytes), { title: "browser-smoke" });
    return result.markdown;
  }, Array.from(compressedPptx));
  expect(markdown).toContain("# browser-smoke");
  expect(markdown).toContain("## Slide 1: Overview");
});
