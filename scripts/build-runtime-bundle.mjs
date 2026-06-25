import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const bundleDir = path.resolve(rootDir, "bundle");
const productName = "miku-pptx2md";

async function readText(relPath) {
  return fs.readFile(path.resolve(rootDir, relPath), "utf8");
}

function stripEsmBoundary(source) {
  return source
    .replace(/^import .*?;\n/gm, "")
    .replace(/^export /gm, "");
}

async function createRuntimeSource() {
  const packageJson = JSON.parse(await readText("package.json"));
  const xmlUtilsSource = stripEsmBoundary(await readText("dist/js/xml-utils.js"));
  const zipIoSource = stripEsmBoundary(await readText("dist/js/zip-io.js"));
  const coreSource = stripEsmBoundary(await readText("dist/js/core.js"));

  return `/*
 * ${productName} runtime bundle
 * Version: ${packageJson.version}
 */
import { inflateRawSync } from "node:zlib";

export const version = ${JSON.stringify(packageJson.version)};

${xmlUtilsSource}

${zipIoSource}

${coreSource}

export { convertPptxToMarkdown };

export default {
  version,
  convertPptxToMarkdown
};
`;
}

async function main() {
  await fs.mkdir(bundleDir, { recursive: true });
  const outputPath = path.resolve(bundleDir, `${productName}-runtime.mjs`);
  await fs.writeFile(outputPath, await createRuntimeSource(), "utf8");
  console.log(`[build:runtime] generated ${path.relative(rootDir, outputPath)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
