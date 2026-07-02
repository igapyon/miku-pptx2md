import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
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
    .replace(/^export \{[\s\S]*?\} from .*?;\n/gm, "")
    .replace(/^import .*?;\n/gm, "")
    .replace(/^export /gm, "");
}

function stripCliImports(source) {
  return source
    .replace(/^#!.*\n/, "")
    .replace(/^import .*?;\n/gm, "")
    .replace(/^import \{[\s\S]*?\} from .*?;\n/gm, "")
    .replace(
      /async function readPackageVersion\(\) \{[\s\S]*?\n\}/,
      "async function readPackageVersion() {\n  return version;\n}"
    );
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
  const artifactsSource = stripEsmBoundary(await readText("dist/js/artifacts.js"));
  const xmlUtilsSource = stripEsmBoundary(await readText("dist/js/xml-utils.js"));
  const zipIoSource = stripEsmBoundary(await readText("dist/js/zip-io.js"));
  const coreSource = stripEsmBoundary(await readText("dist/js/core.js"));

  return `/*
 * ${productName} runtime bundle
 * Version: ${packageJson.version}
 */
export const version = ${JSON.stringify(packageJson.version)};

${msOfficeCoreSource}

${artifactsSource}

${xmlUtilsSource}

${zipIoSource}

${coreSource}

export { convertPptxToMarkdown, createPptx2MdSummaryText, createPptx2MdSummaryJsonData, createPptx2MdAssetsManifestData };

export default {
  version,
  convertPptxToMarkdown,
  createPptx2MdSummaryText,
  createPptx2MdSummaryJsonData,
  createPptx2MdAssetsManifestData
};
`;
}

async function createCliSource(runtimeSource) {
  const assetPathSource = stripEsmBoundary(await readText("dist/js/asset-path.js"));
  const cliSource = stripCliImports(await readText("scripts/miku-pptx2md-cli.mjs"));

  return `#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

${runtimeSource}

${assetPathSource}

${cliSource}
`;
}

async function createSourceArchive() {
  const outputPath = path.resolve(bundleDir, `${productName}-sources.tgz`);
  execFileSync("git", [
    "archive",
    "--format=tar.gz",
    `--prefix=${productName}-sources/`,
    "-o",
    outputPath,
    "HEAD"
  ], { cwd: rootDir, stdio: "inherit" });
  return outputPath;
}

async function main() {
  await fs.mkdir(bundleDir, { recursive: true });
  const runtimeSource = await createRuntimeSource();
  const runtimeOutputPath = path.resolve(bundleDir, `${productName}-runtime.mjs`);
  const cliOutputPath = path.resolve(bundleDir, `${productName}.mjs`);
  const sourceArchivePath = await createSourceArchive();

  await fs.writeFile(runtimeOutputPath, runtimeSource, "utf8");
  await fs.writeFile(cliOutputPath, await createCliSource(runtimeSource), { encoding: "utf8", mode: 0o755 });

  console.log(`[build:runtime] generated ${path.relative(rootDir, runtimeOutputPath)}`);
  console.log(`[build:runtime] generated ${path.relative(rootDir, cliOutputPath)}`);
  console.log(`[build:runtime] generated ${path.relative(rootDir, sourceArchivePath)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
