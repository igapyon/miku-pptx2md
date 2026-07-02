import { collectTagBlocks, collectTextValues, decodeXmlEntities, getAttribute, normalizePackagePath, stripXmlTags } from "./xml-utils.js";
import { readZipEntries } from "./zip-io.js";
import type { Pptx2MdAsset, Pptx2MdDiagnostic, Pptx2MdMetadata, Pptx2MdResult, Pptx2MdSummary } from "./artifacts.js";

export interface Pptx2MdOptions {
  title?: string;
  fallbackTitle?: string;
  frontMatter?: "include" | "exclude" | string | null;
  toolVersion?: string;
  includeNotes?: boolean;
  includeUnsupportedComments?: boolean;
  imagePathResolver?: (asset: Pptx2MdAsset) => string;
}

export type { Pptx2MdAsset, Pptx2MdDiagnostic, Pptx2MdMetadata, Pptx2MdResult, Pptx2MdSummary } from "./artifacts.js";
export { createPptx2MdAssetsManifestData, createPptx2MdSummaryJsonData, createPptx2MdSummaryText } from "./artifacts.js";

interface SlideModel {
  index: number;
  path: string;
  title?: string;
  blocks: SlideBlock[];
  notes: TextParagraph[];
  comments: SlideComment[];
}

interface ParagraphBlock {
  kind: "paragraph";
  paragraph: TextParagraph;
}

interface ShapeTextBlock {
  kind: "shape-text";
  shapeType: string;
  paragraphs: TextParagraph[];
}

interface TableBlock {
  kind: "table";
  rows: string[][];
  diagnostic?: Pptx2MdDiagnostic;
}

interface ImageBlock {
  kind: "image";
  asset: Pptx2MdAsset;
}

interface TextParagraph {
  text: string;
  markdown: string;
  hyperlinkCount: number;
  listKind?: "bullet" | "ordered";
  level: number;
}

interface SlideComment {
  label: string;
  text: string;
  authorId?: string;
  date?: string;
}

export function convertPptxToMarkdown(bytes: Uint8Array, options: Pptx2MdOptions = {}): Pptx2MdResult {
  const entries = readZipEntries(bytes);
  const diagnostics: Pptx2MdDiagnostic[] = [];
  const metadata = parseCoreProperties(entries);
  const contentTypes = parseContentTypes(entries);
  const slides = parseSlides(entries, diagnostics, contentTypes);
  const assets = collectAssets(slides);
  const markdownTitle = options.title || metadata.title || options.fallbackTitle || "presentation";
  const markdown = renderMarkdown(markdownTitle, slides, diagnostics, options);
  const summary = createSummary(slides, assets, diagnostics);

  return {
    markdown,
    metadata,
    summary,
    diagnostics,
    assets
  };
}

function createSummary(
  slides: SlideModel[],
  assets: Pptx2MdAsset[],
  diagnostics: Pptx2MdDiagnostic[]
): Pptx2MdSummary {
  return {
    slides: slides.length,
    slidesWithTitles: slides.filter((slide) => Boolean(slide.title)).length,
    textBlocks: slides.reduce((sum, slide) => sum + countTextBlocks(slide), 0),
    listItems: slides.reduce((sum, slide) => sum + countListItems(slide), 0),
    tables: slides.reduce((sum, slide) => sum + countTables(slide), 0),
    hyperlinks: slides.reduce((sum, slide) => sum + countHyperlinks(slide), 0),
    imageAssets: assets.length,
    notesSlides: slides.filter((slide) => slide.notes.length > 0).length,
    comments: slides.reduce((sum, slide) => sum + slide.comments.length, 0),
    warnings: diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length,
    errors: diagnostics.filter((diagnostic) => diagnostic.severity === "error").length,
    diagnostics: diagnostics.length
  };
}

type SlideBlock = ParagraphBlock | ShapeTextBlock | TableBlock | ImageBlock;

interface ContentTypes {
  defaults: Map<string, string>;
  overrides: Map<string, string>;
}

function parseCoreProperties(entries: Map<string, Uint8Array>): Pptx2MdMetadata {
  const xml = readTextEntry(entries, "docProps/core.xml");
  if (!xml) {
    return {};
  }

  return removeEmptyMetadata({
    title: readElementText(xml, "title"),
    subject: readElementText(xml, "subject"),
    creator: readElementText(xml, "creator"),
    description: readElementText(xml, "description"),
    keywords: readElementText(xml, "keywords"),
    lastModifiedBy: readElementText(xml, "lastModifiedBy"),
    revision: readElementText(xml, "revision"),
    category: readElementText(xml, "category"),
    created: readElementText(xml, "created"),
    modified: readElementText(xml, "modified")
  });
}

function removeEmptyMetadata(metadata: Pptx2MdMetadata): Pptx2MdMetadata {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => typeof value === "string" && value.length > 0)
  ) as Pptx2MdMetadata;
}

function readElementText(xml: string, localName: string): string | undefined {
  const block = collectTagBlocks(xml, localName)[0];
  if (!block) {
    return undefined;
  }
  const value = decodeXmlEntities(stripXmlTags(block)).replace(/\s+/g, " ").trim();
  return value.length > 0 ? value : undefined;
}

function parseSlides(
  entries: Map<string, Uint8Array>,
  diagnostics: Pptx2MdDiagnostic[],
  contentTypes: ContentTypes
): SlideModel[] {
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
      return { index: index + 1, path: "", blocks: [], notes: [], comments: [] };
    }

    const slideXml = readTextEntry(entries, slidePath);
    if (!slideXml) {
      diagnostics.push({
        severity: "warning",
        code: "missing-slide-part",
        message: `Slide part was not found: ${slidePath}`,
        source: slidePath
      });
      return { index: index + 1, path: slidePath, blocks: [], notes: [], comments: [] };
    }

    const slideRelationships = parseSlideRelationships(entries, slidePath);
    const comments = parseSlideComments(entries, slidePath, slideRelationships, diagnostics);
    const notes = parseSlideNotes(entries, slidePath, slideRelationships, diagnostics);
    return parseSlideXml(slideXml, slidePath, index + 1, notes, comments, slideRelationships, entries, contentTypes, diagnostics);
  });
}

function parseSlideComments(
  entries: Map<string, Uint8Array>,
  slidePath: string,
  slideRelationships: RelationshipEntry[],
  diagnostics: Pptx2MdDiagnostic[]
): SlideComment[] {
  const slideRelsPath = buildRelationshipsPath(slidePath);
  const comments: SlideComment[] = [];
  const commentRels = slideRelationships.filter((relationship) => relationship.type.endsWith("/comments"));

  for (const rel of commentRels) {
    const commentsXml = readTextEntry(entries, rel.target);
    if (!commentsXml) {
      diagnostics.push({
        severity: "warning",
        code: "missing-comments-part",
        message: `Slide comments part was not found: ${rel.target}`,
        source: slideRelsPath
      });
      continue;
    }
    comments.push(...parseSlideCommentsXml(commentsXml, comments.length));
  }

  return comments;
}

function parseSlideCommentsXml(xml: string, offset: number): SlideComment[] {
  return collectTagBlocks(xml, "cm")
    .map((commentXml, index) => {
      const commentTag = getFirstTag(commentXml, "cm");
      const authorId = commentTag ? getAttribute(commentTag, "authorId") : undefined;
      const date = commentTag ? getAttribute(commentTag, "dt") : undefined;
      return {
        label: `comment-${offset + index + 1}`,
        text: readElementText(commentXml, "text") || "",
        ...(authorId ? { authorId } : {}),
        ...(date ? { date } : {})
      };
    })
    .filter((comment) => comment.text.length > 0);
}

function getRelationshipId(tag: string): string | undefined {
  const relMatch = tag.match(/\sr:(?:id|embed)="([^"]*)"/);
  if (relMatch) {
    return relMatch[1];
  }
  return undefined;
}

function parseRelationships(xml: string, baseDir: string): Map<string, string> {
  const rels = new Map<string, string>();
  for (const rel of parseRelationshipEntries(xml, baseDir)) {
    rels.set(rel.id, rel.target);
  }
  return rels;
}

interface RelationshipEntry {
  id: string;
  type: string;
  target: string;
  targetMode?: string;
}

function parseRelationshipEntries(xml: string, baseDir: string): RelationshipEntry[] {
  const rels: RelationshipEntry[] = [];
  const pattern = /<[^<\s:]*:?Relationship\b[^>]*>/g;
  for (const match of xml.matchAll(pattern)) {
    const tag = match[0];
    const id = getAttribute(tag, "Id");
    const type = getAttribute(tag, "Type") || "";
    const target = getAttribute(tag, "Target");
    const targetMode = getAttribute(tag, "TargetMode");
    if (id && target) {
      rels.push({
        id,
        type,
        target: targetMode === "External" ? target : normalizePackagePath(baseDir, target),
        ...(targetMode ? { targetMode } : {})
      });
    }
  }
  return rels;
}

function parseSlideRelationships(entries: Map<string, Uint8Array>, slidePath: string): RelationshipEntry[] {
  const slideRelsPath = buildRelationshipsPath(slidePath);
  const slideRelsXml = readTextEntry(entries, slideRelsPath);
  if (!slideRelsXml) {
    return [];
  }
  return parseRelationshipEntries(slideRelsXml, getPackageDir(slidePath));
}

function parseSlideNotes(
  entries: Map<string, Uint8Array>,
  slidePath: string,
  slideRelationships: RelationshipEntry[],
  diagnostics: Pptx2MdDiagnostic[]
): TextParagraph[] {
  const slideRelsPath = buildRelationshipsPath(slidePath);
  const notesRel = slideRelationships.find((rel) => rel.type.endsWith("/notesSlide"));
  if (!notesRel) {
    return [];
  }

  const notesXml = readTextEntry(entries, notesRel.target);
  if (!notesXml) {
    diagnostics.push({
      severity: "warning",
      code: "missing-notes-part",
      message: `Notes slide part was not found: ${notesRel.target}`,
      source: slideRelsPath
    });
    return [];
  }

  return parseNotesXml(notesXml);
}

function buildRelationshipsPath(partPath: string): string {
  const dir = getPackageDir(partPath);
  const fileName = partPath.slice(dir.length ? dir.length + 1 : 0);
  return dir ? `${dir}/_rels/${fileName}.rels` : `_rels/${fileName}.rels`;
}

function getPackageDir(partPath: string): string {
  const index = partPath.lastIndexOf("/");
  return index >= 0 ? partPath.slice(0, index) : "";
}

function parseNotesXml(xml: string): TextParagraph[] {
  return collectTagBlocks(xml, "sp")
    .filter((shapeXml) => !isNotesSlideImageShape(shapeXml))
    .flatMap((shapeXml) => extractShapeParagraphs(shapeXml));
}

function isNotesSlideImageShape(shapeXml: string): boolean {
  const placeholderMatch = shapeXml.match(/<[^<\s:]*:?ph\b[^>]*>/);
  return placeholderMatch ? getAttribute(placeholderMatch[0], "type") === "sldImg" : false;
}

function parseSlideXml(
  xml: string,
  slidePath: string,
  index: number,
  notes: TextParagraph[],
  comments: SlideComment[],
  slideRelationships: RelationshipEntry[],
  entries: Map<string, Uint8Array>,
  contentTypes: ContentTypes,
  diagnostics: Pptx2MdDiagnostic[]
): SlideModel {
  const elements = collectSlideContentElements(xml);
  const blocks: SlideBlock[] = [];
  let title: string | undefined;

  for (const element of elements) {
    if (element.kind === "graphicFrame") {
      const table = parseGraphicFrameTable(element.xml);
      if (table) {
        if (table.diagnostic) {
          diagnostics.push({
            ...table.diagnostic,
            source: slidePath
          });
        }
        blocks.push(table);
      } else {
        diagnostics.push(createUnsupportedGraphicFrameDiagnostic(element.xml, slidePath));
      }
      continue;
    }

    if (element.kind === "pic") {
      const image = parsePictureImage(element.xml, slideRelationships, entries, contentTypes, slidePath, index, blocks.length, diagnostics);
      if (image) {
        blocks.push(image);
      } else {
        const unsupportedPicture = createUnsupportedPictureDiagnostic(element.xml, slidePath);
        if (unsupportedPicture) {
          diagnostics.push(unsupportedPicture);
        }
      }
      continue;
    }

    const paragraphs = extractShapeParagraphs(element.xml, slideRelationships, diagnostics, slidePath);
    if (paragraphs.length === 0) {
      continue;
    }

    if (!title && isTitleShape(element.xml)) {
      title = paragraphs.map((paragraph) => paragraph.text).join(" ").trim();
      continue;
    }

    const shapeType = getOrdinaryShapeType(element.xml);
    if (shapeType) {
      blocks.push({
        kind: "shape-text",
        shapeType,
        paragraphs
      });
    } else {
      blocks.push(...paragraphs.map((paragraph) => ({
        kind: "paragraph" as const,
        paragraph
      })));
    }
  }

  if (!title && blocks.length > 0) {
    title = undefined;
  }

  return {
    index,
    path: slidePath,
    title,
    blocks,
    notes,
    comments
  };
}

function collectSlideContentElements(xml: string): Array<{ kind: "sp" | "graphicFrame" | "pic"; xml: string }> {
  const pattern = /<[^<\s:]*:?(sp|graphicFrame|pic)\b[\s\S]*?<\/[^<\s:]*:?\1>/g;
  return Array.from(xml.matchAll(pattern), (match) => ({
    kind: match[1] as "sp" | "graphicFrame" | "pic",
    xml: match[0]
  }));
}

function extractShapeParagraphs(
  shapeXml: string,
  relationships: RelationshipEntry[] = [],
  diagnostics?: Pptx2MdDiagnostic[],
  source?: string
): TextParagraph[] {
  const paragraphBlocks = collectTagBlocks(shapeXml, "p");
  return paragraphBlocks
    .map((paragraphXml) => parseTextParagraph(paragraphXml, relationships, diagnostics, source))
    .filter((paragraph) => paragraph.text.length > 0);
}

function parseTextParagraph(
  paragraphXml: string,
  relationships: RelationshipEntry[],
  diagnostics?: Pptx2MdDiagnostic[],
  source?: string
): TextParagraph {
  const runs = collectTextRuns(paragraphXml, relationships, diagnostics, source);
  const text = runs.map((run) => run.text).join("").replace(/\s+/g, " ").trim();
  const markdown = runs.map((run) => run.markdown).join("").replace(/\s+/g, " ").trim();
  const hyperlinkCount = runs.filter((run) => run.isHyperlink).length;
  const paragraphPropertiesTag = getFirstTag(paragraphXml, "pPr");
  const level = paragraphPropertiesTag ? parseListLevel(paragraphPropertiesTag) : 0;
  const listKind = detectListKind(paragraphXml);
  return {
    text,
    markdown,
    hyperlinkCount,
    level,
    ...(listKind ? { listKind } : {})
  };
}

interface TextRun {
  text: string;
  markdown: string;
  isHyperlink: boolean;
}

function collectTextRuns(
  paragraphXml: string,
  relationships: RelationshipEntry[],
  diagnostics?: Pptx2MdDiagnostic[],
  source?: string
): TextRun[] {
  const runBlocks = collectTagBlocks(paragraphXml, "r");
  if (runBlocks.length === 0) {
    const text = collectTextValues(paragraphXml).join("");
    return [{ text, markdown: text, isHyperlink: false }];
  }

  return runBlocks.map((runXml) => {
    const text = collectTextValues(runXml).join("");
    const hyperlinkRelId = getHyperlinkRelationshipId(runXml);
    if (!hyperlinkRelId || text.length === 0) {
      return { text, markdown: applyInlineFormatting(text, runXml), isHyperlink: false };
    }

    const hyperlinkRel = relationships.find((rel) => rel.id === hyperlinkRelId && rel.type.endsWith("/hyperlink"));
    if (!hyperlinkRel) {
      diagnostics?.push({
        severity: "warning",
        code: "missing-hyperlink-relationship",
        message: `Hyperlink relationship was not found: ${hyperlinkRelId}`,
        ...(source ? { source } : {})
      });
      return { text, markdown: text, isHyperlink: false };
    }

    const linkLabel = applyInlineFormatting(escapeMarkdownLinkLabel(text), runXml);
    return {
      text,
      markdown: `[${linkLabel}](${escapeMarkdownLinkDestination(hyperlinkRel.target)})`,
      isHyperlink: true
    };
  });
}

function getHyperlinkRelationshipId(runXml: string): string | undefined {
  const hyperlinkTag = getFirstTag(runXml, "hlinkClick");
  return hyperlinkTag ? getRelationshipId(hyperlinkTag) : undefined;
}

function applyInlineFormatting(text: string, runXml: string): string {
  const runPropertiesTag = getFirstTag(runXml, "rPr");
  if (!runPropertiesTag) {
    return text;
  }
  const bold = getAttribute(runPropertiesTag, "b") === "1";
  const italic = getAttribute(runPropertiesTag, "i") === "1";
  const underline = isUnderlinedRun(runPropertiesTag);
  let formatted = text;
  if (bold && italic) {
    formatted = `***${formatted}***`;
  } else if (bold) {
    formatted = `**${formatted}**`;
  } else if (italic) {
    formatted = `*${formatted}*`;
  }
  if (underline) {
    return `<u>${formatted}</u>`;
  }
  return formatted;
}

function isUnderlinedRun(runPropertiesTag: string): boolean {
  const underline = getAttribute(runPropertiesTag, "u");
  return underline !== undefined && underline !== "none";
}

function getFirstTag(xml: string, localName: string): string | undefined {
  const pattern = new RegExp(`<[^<\\s:]*:?${localName}\\b[^>]*>`);
  return xml.match(pattern)?.[0];
}

function parseListLevel(paragraphPropertiesTag: string): number {
  const rawLevel = getAttribute(paragraphPropertiesTag, "lvl");
  if (!rawLevel) {
    return 0;
  }
  const level = Number.parseInt(rawLevel, 10);
  if (!Number.isFinite(level) || level < 0) {
    return 0;
  }
  return Math.min(level, 8);
}

function detectListKind(paragraphXml: string): "bullet" | "ordered" | undefined {
  if (/<[^<\s:]*:?buAutoNum\b[^>]*>/.test(paragraphXml)) {
    return "ordered";
  }
  if (/<[^<\s:]*:?buChar\b[^>]*>/.test(paragraphXml)) {
    return "bullet";
  }
  return undefined;
}

function parseGraphicFrameTable(graphicFrameXml: string): TableBlock | undefined {
  const tableBlocks = collectTagBlocks(graphicFrameXml, "tbl");
  if (tableBlocks.length === 0) {
    return undefined;
  }

  const rows = collectTagBlocks(tableBlocks[0], "tr")
    .map((rowXml) => collectTagBlocks(rowXml, "tc")
      .map((cellXml) => collectTextValues(cellXml).join(" ").replace(/\s+/g, " ").trim()));

  if (rows.length === 0 || rows.every((row) => row.length === 0)) {
    return undefined;
  }

  return {
    kind: "table",
    rows,
    ...(hasMergedTableCells(tableBlocks[0]) ? {
      diagnostic: {
        severity: "warning" as const,
        code: "limited-table-merged-cells",
        message: "PowerPoint table contains merged cells; Markdown table output is an approximate flattened representation."
      }
    } : {})
  };
}

function hasMergedTableCells(tableXml: string): boolean {
  return /<[^<\s:]*:?tc\b[^>]*(?:gridSpan|rowSpan|hMerge|vMerge)="[^"]*"/.test(tableXml)
    || /<[^<\s:]*:?(?:hMerge|vMerge)\b/.test(tableXml);
}

function createUnsupportedGraphicFrameDiagnostic(graphicFrameXml: string, slidePath: string): Pptx2MdDiagnostic {
  const kind = detectUnsupportedGraphicFrameKind(graphicFrameXml);
  return {
    severity: "warning",
    code: `unsupported-${kind}`,
    message: `Unsupported PowerPoint ${kind} graphic frame was omitted from Markdown output.`,
    source: slidePath
  };
}

function detectUnsupportedGraphicFrameKind(graphicFrameXml: string): string {
  const graphicDataTag = getFirstTag(graphicFrameXml, "graphicData");
  const uri = graphicDataTag ? getAttribute(graphicDataTag, "uri") || "" : "";
  if (uri.includes("/chart")) {
    return "chart";
  }
  if (uri.includes("/diagram")) {
    return "smartart";
  }
  if (/<[^<\s:]*:?chart\b/.test(graphicFrameXml)) {
    return "chart";
  }
  if (/<[^<\s:]*:?relIds\b/.test(graphicFrameXml)) {
    return "smartart";
  }
  return "graphic-frame";
}

function parsePictureImage(
  pictureXml: string,
  slideRelationships: RelationshipEntry[],
  entries: Map<string, Uint8Array>,
  contentTypes: ContentTypes,
  slidePath: string,
  slideIndex: number,
  blockIndex: number,
  diagnostics: Pptx2MdDiagnostic[]
): ImageBlock | undefined {
  const blipTag = getFirstTag(pictureXml, "blip");
  if (!blipTag) {
    return undefined;
  }
  const relId = getRelationshipId(blipTag);
  if (!relId) {
    return undefined;
  }

  const imageRel = slideRelationships.find((rel) => rel.id === relId && rel.type.endsWith("/image"));
  if (!imageRel) {
    diagnostics.push({
      severity: "warning",
      code: "missing-image-relationship",
      message: `Image relationship was not found: ${relId}`,
      source: slidePath
    });
    return undefined;
  }

  const bytes = entries.get(imageRel.target);
  if (!bytes) {
    diagnostics.push({
      severity: "warning",
      code: "missing-image-part",
      message: `Image part was not found: ${imageRel.target}`,
      source: slidePath
    });
    return undefined;
  }

  const nonVisualDrawingProps = getFirstTag(pictureXml, "cNvPr");
  const altText = nonVisualDrawingProps
    ? getAttribute(nonVisualDrawingProps, "descr") || getAttribute(nonVisualDrawingProps, "name") || imageRel.target
    : imageRel.target;

  return {
    kind: "image",
    asset: {
      kind: "image",
      sourcePath: imageRel.target,
      mediaType: getContentType(contentTypes, imageRel.target),
      altText,
      sourceTrace: `picture:image(${imageRel.target}):alt(${altText})`,
      slideIndex,
      blockIndex,
      relationshipId: relId,
      bytes
    }
  };
}

function createUnsupportedPictureDiagnostic(pictureXml: string, slidePath: string): Pptx2MdDiagnostic | undefined {
  const kind = detectUnsupportedPictureKind(pictureXml);
  if (!kind) {
    return undefined;
  }
  return {
    severity: "warning",
    code: `unsupported-${kind}`,
    message: `Unsupported PowerPoint ${kind} picture object was omitted from Markdown output.`,
    source: slidePath
  };
}

function detectUnsupportedPictureKind(pictureXml: string): string | undefined {
  if (/<[^<\s:]*:?videoFile\b/.test(pictureXml)) {
    return "video";
  }
  if (/<[^<\s:]*:?audioFile\b/.test(pictureXml)) {
    return "audio";
  }
  if (/<[^<\s:]*:?oleObj\b/.test(pictureXml)) {
    return "ole-object";
  }
  return undefined;
}

function parseContentTypes(entries: Map<string, Uint8Array>): ContentTypes {
  const contentTypesXml = readTextEntry(entries, "[Content_Types].xml");
  const defaults = new Map<string, string>();
  const overrides = new Map<string, string>();
  if (!contentTypesXml) {
    return { defaults, overrides };
  }

  for (const match of contentTypesXml.matchAll(/<[^<\s:]*:?Default\b[^>]*>/g)) {
    const tag = match[0];
    const extension = getAttribute(tag, "Extension");
    const contentType = getAttribute(tag, "ContentType");
    if (extension && contentType) {
      defaults.set(extension.toLowerCase(), contentType);
    }
  }

  for (const match of contentTypesXml.matchAll(/<[^<\s:]*:?Override\b[^>]*>/g)) {
    const tag = match[0];
    const partName = getAttribute(tag, "PartName");
    const contentType = getAttribute(tag, "ContentType");
    if (partName && contentType) {
      overrides.set(partName.replace(/^\//, ""), contentType);
    }
  }

  return { defaults, overrides };
}

function getContentType(contentTypes: ContentTypes, packagePath: string): string {
  const override = contentTypes.overrides.get(packagePath);
  if (override) {
    return override;
  }
  const extension = packagePath.split(".").pop()?.toLowerCase() || "";
  return contentTypes.defaults.get(extension) || inferImageContentType(packagePath);
}

function inferImageContentType(packagePath: string): string {
  const extension = packagePath.split(".").pop()?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg") {
    return "image/jpeg";
  }
  if (extension === "gif") {
    return "image/gif";
  }
  if (extension === "webp") {
    return "image/webp";
  }
  if (extension === "svg") {
    return "image/svg+xml";
  }
  return "image/png";
}

function isTitleShape(shapeXml: string): boolean {
  const placeholderMatch = shapeXml.match(/<[^<\s:]*:?ph\b[^>]*>/);
  if (!placeholderMatch) {
    return false;
  }
  const type = getAttribute(placeholderMatch[0], "type");
  return type === "title" || type === "ctrTitle";
}

function getOrdinaryShapeType(shapeXml: string): string | undefined {
  if (hasPlaceholder(shapeXml) || isTextBoxShape(shapeXml)) {
    return undefined;
  }

  const presetGeometryMatch = shapeXml.match(/<[^<\s:]*:?prstGeom\b[^>]*>/);
  if (!presetGeometryMatch) {
    return undefined;
  }

  return getAttribute(presetGeometryMatch[0], "prst") || "shape";
}

function hasPlaceholder(shapeXml: string): boolean {
  return /<[^<\s:]*:?ph\b[^>]*>/.test(shapeXml);
}

function isTextBoxShape(shapeXml: string): boolean {
  const nonVisualShapePropsMatch = shapeXml.match(/<[^<\s:]*:?cNvSpPr\b[^>]*>/);
  return nonVisualShapePropsMatch ? getAttribute(nonVisualShapePropsMatch[0], "txBox") === "1" : false;
}

function countTextBlocks(slide: SlideModel): number {
  return slide.blocks.reduce((sum, block) => {
    if (block.kind === "paragraph") {
      return sum + 1;
    }
    if (block.kind === "table") {
      return sum + block.rows.flat().filter((cell) => cell.length > 0).length;
    }
    if (block.kind === "image") {
      return sum;
    }
    return sum + block.paragraphs.length;
  }, slide.notes.length + slide.comments.length);
}

function collectAssets(slides: SlideModel[]): Pptx2MdAsset[] {
  return slides.flatMap((slide) => slide.blocks.flatMap((block) => block.kind === "image" ? [block.asset] : []));
}

function countListItems(slide: SlideModel): number {
  const blockItems = slide.blocks.reduce((sum, block) => {
    if (block.kind === "paragraph") {
      return sum + (block.paragraph.listKind ? 1 : 0);
    }
    if (block.kind === "shape-text") {
      return sum + block.paragraphs.filter((paragraph) => paragraph.listKind).length;
    }
    return sum;
  }, 0);
  return blockItems + slide.notes.filter((paragraph) => paragraph.listKind).length;
}

function countTables(slide: SlideModel): number {
  return slide.blocks.filter((block) => block.kind === "table").length;
}

function countHyperlinks(slide: SlideModel): number {
  const blockLinks = slide.blocks.reduce((sum, block) => {
    if (block.kind === "paragraph") {
      return sum + block.paragraph.hyperlinkCount;
    }
    if (block.kind === "shape-text") {
      return sum + block.paragraphs.reduce((paragraphSum, paragraph) => paragraphSum + paragraph.hyperlinkCount, 0);
    }
    return sum;
  }, 0);
  return blockLinks + slide.notes.reduce((sum, paragraph) => sum + paragraph.hyperlinkCount, 0);
}

function renderMarkdown(
  title: string,
  slides: SlideModel[],
  diagnostics: Pptx2MdDiagnostic[],
  options: Pptx2MdOptions = {}
): string {
  const lines: string[] = [`# ${escapeMarkdownText(title)}`, ""];

  for (const slide of slides) {
    const heading = slide.title
      ? `## Slide ${slide.index}: ${escapeMarkdownText(slide.title)}`
      : `## Slide ${slide.index}`;
    lines.push(heading, "");

    for (const block of slide.blocks) {
      if (block.kind === "shape-text") {
        lines.push(...renderShapeTextBlock(block), "");
      } else if (block.kind === "table") {
        lines.push(...renderTableBlock(block), "");
      } else if (block.kind === "image") {
        lines.push(renderImageBlock(block, options), "");
      } else {
        lines.push(renderParagraph(block.paragraph), "");
      }
    }

    if (options.includeNotes !== false && slide.notes.length > 0) {
      lines.push("### Speaker Notes", "");
      for (const note of slide.notes) {
        lines.push(renderParagraph(note), "");
      }
    }

    if (slide.comments.length > 0) {
      lines.push("### Comments", "");
      for (const comment of slide.comments) {
        lines.push(renderSlideComment(comment), "");
      }
    }
  }

  if (options.includeUnsupportedComments && diagnostics.length > 0) {
    lines.push("## Diagnostics", "");
    for (const diagnostic of diagnostics) {
      const source = diagnostic.source ? ` source=${diagnostic.source}` : "";
      lines.push(`<!-- ${diagnostic.severity}: ${diagnostic.code}${source}: ${diagnostic.message} -->`, "");
    }
  }

  const body = lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
  return shouldIncludeFrontMatter(options)
    ? `${createFrontMatter(title, options)}\n\n${body}\n`
    : `${body}\n`;
}

function shouldIncludeFrontMatter(options: Pptx2MdOptions): boolean {
  return String(options.frontMatter || "exclude") !== "exclude";
}

function createFrontMatter(title: string, options: Pptx2MdOptions): string {
  return [
    "---",
    `title: ${quoteYamlString(title)}`,
    "type: converted",
    "conversion:",
    "  tool: miku-pptx2md",
    `  version: ${quoteYamlString(String(options.toolVersion || "unknown"))}`,
    `  notes: ${options.includeNotes === false ? "exclude" : "include"}`,
    `  unsupported_comments: ${options.includeUnsupportedComments ? "include" : "exclude"}`,
    "---"
  ].join("\n");
}

function quoteYamlString(value: string): string {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\r/g, "\\r").replace(/\n/g, "\\n")}"`;
}

function renderSlideComment(comment: SlideComment): string {
  return `- [${escapeMarkdownText(comment.label)}] ${escapeMarkdownText(comment.text)}`;
}

function renderTableBlock(block: TableBlock): string[] {
  const columnCount = Math.max(0, ...block.rows.map((row) => row.length));
  if (columnCount === 0) {
    return [];
  }

  const normalizedRows = block.rows.map((row) => normalizeTableRow(row, columnCount));
  const header = normalizedRows[0] || Array.from({ length: columnCount }, () => "");
  const bodyRows = normalizedRows.slice(1);
  const separator = Array.from({ length: columnCount }, () => "---");
  return [
    renderMarkdownTableRow(header),
    renderMarkdownTableRow(separator),
    ...bodyRows.map((row) => renderMarkdownTableRow(row))
  ];
}

function renderImageBlock(block: ImageBlock, options: Pptx2MdOptions): string {
  const altText = escapeMarkdownText(block.asset.altText || "Image");
  const resolvedPath = options.imagePathResolver ? options.imagePathResolver(block.asset) : "";
  if (resolvedPath) {
    return `![${escapeMarkdownImageAlt(altText)}](${resolvedPath})`;
  }
  return `[Image: ${altText}]`;
}

function escapeMarkdownImageAlt(text: string): string {
  return text.replace(/\]/g, "\\]");
}

function normalizeTableRow(row: string[], columnCount: number): string[] {
  return Array.from({ length: columnCount }, (_, index) => row[index] || "");
}

function renderMarkdownTableRow(row: string[]): string {
  return `| ${row.map(escapeMarkdownTableCell).join(" | ")} |`;
}

function escapeMarkdownTableCell(text: string): string {
  return escapeMarkdownText(text).replace(/\|/g, "\\|");
}

function renderShapeTextBlock(block: ShapeTextBlock): string[] {
  return block.paragraphs.map((paragraph, index) => {
    const prefix = index === 0 ? `[Shape: ${block.shapeType}] ` : "";
    return `> ${prefix}${renderParagraph(paragraph)}`;
  });
}

function renderParagraph(paragraph: TextParagraph): string {
  const text = escapeMarkdownText(paragraph.markdown);
  if (!paragraph.listKind) {
    return text;
  }
  const indent = "  ".repeat(paragraph.level);
  const marker = paragraph.listKind === "ordered" ? "1." : "-";
  return `${indent}${marker} ${text}`;
}

function escapeMarkdownText(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

function escapeMarkdownLinkLabel(text: string): string {
  return escapeMarkdownText(text).replace(/([\\\[\]])/g, "\\$1");
}

function escapeMarkdownLinkDestination(text: string): string {
  return text.replace(/\)/g, "%29").replace(/\s/g, "%20");
}

function readTextEntry(entries: Map<string, Uint8Array>, path: string): string | undefined {
  const data = entries.get(path);
  return data ? Buffer.from(data).toString("utf8") : undefined;
}
