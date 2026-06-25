import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_FILES = [
  "src/ts/xml-utils.ts",
  "src/ts/zip-io.ts",
  "src/ts/core.ts"
];

const tsModule = await loadTypeScriptModule();

for (const relTsPath of SOURCE_FILES) {
  transpileTypeScript(relTsPath, tsModule);
}

console.log("[build:miku-pptx2md] generated dist/js modules");

async function loadTypeScriptModule() {
  try {
    const module = await import("typescript");
    return module.default || module;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      "TypeScript is required for build. Install dependencies before running `npm run build`.\n" +
      `Cause: ${reason}`
    );
  }
}

function transpileTypeScript(relTsPath, tsModule) {
  const tsPath = path.resolve(ROOT, relTsPath);
  const jsPath = path.resolve(ROOT, relTsPath.replace(/^src\/ts\//, "dist/js/").replace(/\.ts$/, ".js"));
  const source = fs.readFileSync(tsPath, "utf8");
  const result = tsModule.transpileModule(source, {
    compilerOptions: {
      target: tsModule.ScriptTarget.ES2022,
      module: tsModule.ModuleKind.ES2022,
      moduleResolution: tsModule.ModuleResolutionKind.Bundler,
      strict: true,
      skipLibCheck: true
    },
    reportDiagnostics: true,
    fileName: tsPath
  });

  if (result.diagnostics && result.diagnostics.length > 0) {
    const errors = result.diagnostics
      .filter((diagnostic) => diagnostic.category === tsModule.DiagnosticCategory.Error)
      .map((diagnostic) => tsModule.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
    if (errors.length > 0) {
      throw new Error(`TypeScript transpile error in ${relTsPath}:\n${errors.join("\n")}`);
    }
  }

  fs.mkdirSync(path.dirname(jsPath), { recursive: true });
  fs.writeFileSync(jsPath, result.outputText, "utf8");
}
