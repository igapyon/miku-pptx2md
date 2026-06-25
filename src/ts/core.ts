import { collectTagBlocks, collectTextValues, getAttribute, normalizePackagePath } from "./xml-utils.js";
import { readZipEntries } from "./zip-io.js";

export interface Pptx2MdOptions {
  title?: string;
  includeNotes?: boolean;
}

export interface Pptx2MdResult {
  markdown: string;
  summary: Pptx2MdSummary;
  diagnostics: Pptx2MdDiagnostic[];
}

export interface Pptx2MdSummary {
  slides: number;
  slidesWithTitles: number;
  textBlocks: number;
  diagnostics: number;
}

export interface Pptx2MdDiagnostic {
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  source?: string;
}

interface SlideModel {
  index: number;
  path: string;
  title?: string;
  paragraphs: string[];
}

export function convertPptxToMarkdown(bytes: Uint8Array, options: Pptx2MdOptions = {}): Pptx2MdResult {
  const entries = readZipEntries(bytes);
  const diagnostics: Pptx2MdDiagnostic[] = [];
  const slides = parseSlides(entries, diagnostics);
  const markdown = renderMarkdown(options.title || "presentation", slides);
  const summary: Pptx2MdSummary = {
    slides: slides.length,
    slidesWithTitles: slides.filter((slide) => Boolean(slide.title)).length,
    textBlocks: slides.reduce((sum, slide) => sum + slide.paragraphs.length, 0),
    diagnostics: diagnostics.length
  };

  return {
    markdown,
    summary,
    diagnostics
  };
}

function parseSlides(entries: Map<string, Uint8Array>, diagnostics: Pptx2MdDiagnostic[]): SlideModel[] {
  const presentationXml = readTextEntry(entries, "ppt/presentation.xml");
  const presentationRelsXml = readTextEntry(entries, "ppt/_rels/presentation.xml.rels");
  if (!presentationXml || !presentationRelsXml) {
    throw new Error("Required PPTX presentation parts were not found.");
  }

  const rels = parseRelationships(presentationRelsXml, "ppt");
  const slideIds = Array.from(presentationXml.matchAll(/<[^<\s:]*:?sldId\b[^>]*>/g))
    .map((match) => getRelationshipId(match[0]))
    .filter((value): value is string => Boolean(value));

  return slideIds.map((relId, index) => {
    const slidePath = rels.get(relId);
    if (!slidePath) {
      diagnostics.push({
        severity: "warning",
        code: "missing-slide-relationship",
        message: `Slide relationship was not found: ${relId}`,
        source: "ppt/presentation.xml"
      });
      return { index: index + 1, path: "", paragraphs: [] };
    }

    const slideXml = readTextEntry(entries, slidePath);
    if (!slideXml) {
      diagnostics.push({
        severity: "warning",
        code: "missing-slide-part",
        message: `Slide part was not found: ${slidePath}`,
        source: slidePath
      });
      return { index: index + 1, path: slidePath, paragraphs: [] };
    }

    return parseSlideXml(slideXml, slidePath, index + 1);
  });
}

function getRelationshipId(tag: string): string | undefined {
  const relMatch = tag.match(/\sr:id="([^"]*)"/);
  if (relMatch) {
    return relMatch[1];
  }
  return undefined;
}

function parseRelationships(xml: string, baseDir: string): Map<string, string> {
  const rels = new Map<string, string>();
  const pattern = /<[^<\s:]*:?Relationship\b[^>]*>/g;
  for (const match of xml.matchAll(pattern)) {
    const tag = match[0];
    const id = getAttribute(tag, "Id");
    const target = getAttribute(tag, "Target");
    if (id && target) {
      rels.set(id, normalizePackagePath(baseDir, target));
    }
  }
  return rels;
}

function parseSlideXml(xml: string, slidePath: string, index: number): SlideModel {
  const shapes = collectTagBlocks(xml, "sp");
  const paragraphs: string[] = [];
  let title: string | undefined;

  for (const shape of shapes) {
    const text = extractShapeParagraphs(shape);
    if (text.length === 0) {
      continue;
    }

    if (!title && isTitleShape(shape)) {
      title = text.join(" ").trim();
      continue;
    }

    paragraphs.push(...text);
  }

  if (!title && paragraphs.length > 0) {
    title = undefined;
  }

  return {
    index,
    path: slidePath,
    title,
    paragraphs
  };
}

function extractShapeParagraphs(shapeXml: string): string[] {
  const paragraphBlocks = collectTagBlocks(shapeXml, "p");
  return paragraphBlocks
    .map((paragraphXml) => collectTextValues(paragraphXml).join(""))
    .map((text) => text.replace(/\s+/g, " ").trim())
    .filter((text) => text.length > 0);
}

function isTitleShape(shapeXml: string): boolean {
  const placeholderMatch = shapeXml.match(/<[^<\s:]*:?ph\b[^>]*>/);
  if (!placeholderMatch) {
    return false;
  }
  const type = getAttribute(placeholderMatch[0], "type");
  return type === "title" || type === "ctrTitle";
}

function renderMarkdown(title: string, slides: SlideModel[]): string {
  const lines: string[] = [`# ${escapeMarkdownText(title)}`, ""];

  for (const slide of slides) {
    const heading = slide.title
      ? `## Slide ${slide.index}: ${escapeMarkdownText(slide.title)}`
      : `## Slide ${slide.index}`;
    lines.push(heading, "");

    for (const paragraph of slide.paragraphs) {
      lines.push(escapeMarkdownText(paragraph), "");
    }
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

function escapeMarkdownText(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

function readTextEntry(entries: Map<string, Uint8Array>, path: string): string | undefined {
  const data = entries.get(path);
  return data ? Buffer.from(data).toString("utf8") : undefined;
}
