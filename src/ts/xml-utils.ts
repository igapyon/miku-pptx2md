export function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export function stripXmlTags(text: string): string {
  return text.replace(/<[^>]+>/g, "");
}

export function collectTagBlocks(xml: string, localName: string): string[] {
  const pattern = new RegExp(`<[^<\\s:]*:?${localName}\\b[\\s\\S]*?<\\/[^<\\s:]*:?${localName}>`, "g");
  return Array.from(xml.matchAll(pattern), (match) => match[0]);
}

export function collectTextValues(xml: string): string[] {
  const values: string[] = [];
  const pattern = /<[^<\s:]*:?t\b[^>]*>([\s\S]*?)<\/[^<\s:]*:?t>/g;
  for (const match of xml.matchAll(pattern)) {
    values.push(decodeXmlEntities(stripXmlTags(match[1])));
  }
  return values;
}

export function getAttribute(tag: string, localName: string): string | undefined {
  const pattern = new RegExp(`(?:^|\\s)(?:[^\\s:=]+:)?${localName}="([^"]*)"`);
  const match = tag.match(pattern);
  return match ? decodeXmlEntities(match[1]) : undefined;
}

export function normalizePackagePath(baseDir: string, target: string): string {
  const parts = `${baseDir}/${target}`.split("/");
  const normalized: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") {
      continue;
    }
    if (part === "..") {
      normalized.pop();
      continue;
    }
    normalized.push(part);
  }
  return normalized.join("/");
}
