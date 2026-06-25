import { readOfficePackage } from "../vendor/miku-ms-office-core-0.5.1.mjs";

export interface ZipEntry {
  path: string;
  data: Uint8Array;
}

export function readZipEntries(bytes: Uint8Array): Map<string, Uint8Array> {
  const officePackage = readOfficePackage(bytes);
  const errors = officePackage.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  if (errors.length > 0) {
    throw new Error(errors.map(formatOfficeDiagnostic).join("\n"));
  }

  const entries = new Map<string, Uint8Array>();
  for (const entry of officePackage.entries) {
    entries.set(entry.path, entry.data);
  }
  return entries;
}

function formatOfficeDiagnostic(diagnostic: { code: string; message: string; path?: string }): string {
  if (diagnostic.code === "zip.eocd.missing") {
    return "ZIP end of central directory was not found.";
  }
  return diagnostic.path ? `${diagnostic.path}: ${diagnostic.message}` : diagnostic.message;
}
