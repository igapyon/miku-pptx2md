export interface Pptx2MdMetadata {
  title?: string;
  subject?: string;
  creator?: string;
  description?: string;
  keywords?: string;
  lastModifiedBy?: string;
  revision?: string;
  category?: string;
  created?: string;
  modified?: string;
}

export interface Pptx2MdSummary {
  slides: number;
  slidesWithTitles: number;
  textBlocks: number;
  listItems: number;
  tables: number;
  hyperlinks: number;
  imageAssets: number;
  notesSlides: number;
  comments: number;
  warnings: number;
  errors: number;
  diagnostics: number;
}

export interface Pptx2MdDiagnostic {
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  source?: string;
}

export interface Pptx2MdAsset {
  kind: "image";
  sourcePath: string;
  mediaType: string;
  altText: string;
  sourceTrace: string;
  slideIndex: number;
  blockIndex: number;
  relationshipId: string;
  bytes: Uint8Array;
}

export interface Pptx2MdResult {
  markdown: string;
  metadata: Pptx2MdMetadata;
  summary: Pptx2MdSummary;
  diagnostics: Pptx2MdDiagnostic[];
  assets: Pptx2MdAsset[];
}

export interface Pptx2MdAssetSummary {
  kind: Pptx2MdAsset["kind"];
  sourcePath: string;
  mediaType: string;
  altText: string;
  sourceTrace: string;
  slideIndex: number;
  blockIndex: number;
  relationshipId: string;
  size: number;
}

export interface Pptx2MdAssetsManifestAsset extends Pptx2MdAssetSummary {
  documentPosition: {
    slideIndex: number;
    blockIndex: number;
    blockKind: Pptx2MdAsset["kind"];
  };
}

export interface Pptx2MdSummaryJsonData {
  version: 1;
  metadata: Pptx2MdMetadata;
  summary: Pptx2MdSummary;
  diagnostics: Pptx2MdDiagnostic[];
  assets: Pptx2MdAssetSummary[];
}

export interface Pptx2MdAssetsManifestData {
  version: 1;
  assets: Pptx2MdAssetsManifestAsset[];
}

const SUMMARY_FIELDS: Array<keyof Pptx2MdSummary> = [
  "slides",
  "slidesWithTitles",
  "textBlocks",
  "listItems",
  "tables",
  "hyperlinks",
  "imageAssets",
  "notesSlides",
  "comments",
  "warnings",
  "errors",
  "diagnostics"
];

export function createPptx2MdSummaryJsonData(result: Pptx2MdResult): Pptx2MdSummaryJsonData {
  return {
    version: 1,
    metadata: result.metadata,
    summary: result.summary,
    diagnostics: result.diagnostics,
    assets: result.assets.map(createAssetSummary)
  };
}

export function createPptx2MdSummaryText(result: Pptx2MdResult): string {
  const metadataLines = Object.entries(result.metadata)
    .map(([key, value]) => `metadata.${key}: ${value}`);
  const summaryLines = SUMMARY_FIELDS.map((field) => `${field}: ${result.summary[field]}`);
  return [
    ...metadataLines,
    ...(metadataLines.length > 0 ? [""] : []),
    ...summaryLines
  ].join("\n");
}

export function createPptx2MdAssetsManifestData(assets: readonly Pptx2MdAsset[]): Pptx2MdAssetsManifestData {
  return {
    version: 1,
    assets: assets.map((asset) => ({
      ...createAssetSummary(asset),
      documentPosition: {
        slideIndex: asset.slideIndex,
        blockIndex: asset.blockIndex,
        blockKind: asset.kind
      }
    }))
  };
}

function createAssetSummary(asset: Pptx2MdAsset): Pptx2MdAssetSummary {
  return {
    kind: asset.kind,
    sourcePath: asset.sourcePath,
    mediaType: asset.mediaType,
    altText: asset.altText,
    sourceTrace: asset.sourceTrace,
    slideIndex: asset.slideIndex,
    blockIndex: asset.blockIndex,
    relationshipId: asset.relationshipId,
    size: asset.bytes.byteLength
  };
}
