export function getSafePptxPackagePathParts(packagePath: string): string[] {
  if (!packagePath || packagePath.startsWith("/") || packagePath.includes("\\")) {
    throw new Error(`Unsafe PPTX asset path: ${packagePath}`);
  }

  const parts = packagePath.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) {
    throw new Error(`Unsafe PPTX asset path: ${packagePath}`);
  }
  return parts;
}
