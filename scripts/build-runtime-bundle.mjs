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

function stripVendorExports(source) {
  const scopedSource = source
    .replace(/\nexport \{[\s\S]*?\};\n\/\/# sourceMappingURL=.*\n?$/, "\n")
    .replace(/^\/\/# sourceMappingURL=.*\n?$/gm, "");
  return `const __mikuMsOfficeCore = (() => {
${scopedSource}
return {
  readOfficePackage
};
})();
const { readOfficePackage } = __mikuMsOfficeCore;
`;
}

async function createRuntimeSource() {
  const packageJson = JSON.parse(await readText("package.json"));
  const msOfficeCoreSource = stripVendorExports(await readText("dist/vendor/miku-ms-office-core-0.5.1.mjs"));
  const xmlUtilsSource = stripEsmBoundary(await readText("dist/js/xml-utils.js"));
  const zipIoSource = stripEsmBoundary(await readText("dist/js/zip-io.js"));
  const coreSource = stripEsmBoundary(await readText("dist/js/core.js"));

  return `/*
 * ${productName} runtime bundle
 * Version: ${packageJson.version}
 */
export const version = ${JSON.stringify(packageJson.version)};

${msOfficeCoreSource}

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
