import assert from "node:assert/strict";
import test from "node:test";

import { getSafePptxPackagePathParts } from "../dist/js/asset-path.js";
import {
  convertPptxToMarkdown,
  createPptx2MdAssetsManifestData,
  createPptx2MdSummaryJsonData,
  createPptx2MdSummaryText
} from "../dist/js/core.js";
import {
  createAudioPptx,
  createChartPptx,
  createCommentsPptx,
  createFormattedTextPptx,
  createHyperlinkPptx,
  createImagePptx,
  createListPptx,
  createMergedTablePptx,
  createMetadataPptx,
  createMissingImagePptx,
  createMinimalPptx,
  createNotesPptx,
  createOleObjectPptx,
  createShapeTextPptx,
  createSmartArtPptx,
  createTablePptx,
  createVideoPptx
} from "./pptx-fixture.mjs";

test("validates safe PPTX package asset path parts", () => {
  assert.deepEqual(getSafePptxPackagePathParts("ppt/media/image1.png"), ["ppt", "media", "image1.png"]);

  for (const unsafePath of [
    "",
    "/ppt/media/image1.png",
    "ppt\\media\\image1.png",
    "ppt//media/image1.png",
    "ppt/./media/image1.png",
    "ppt/media/../image1.png"
  ]) {
    assert.throws(
      () => getSafePptxPackagePathParts(unsafePath),
      /Unsafe PPTX asset path:/
    );
  }
});

test("converts the first slide into a Markdown level-2 section", () => {
  const result = convertPptxToMarkdown(createMinimalPptx(), { title: "sample" });

  assert.match(result.markdown, /^# sample\n\n## Slide 1: Overview/m);
  assert.match(result.markdown, /First paragraph/);
  assert.match(result.markdown, /Second paragraph/);
  assert.equal(result.summary.slides, 1);
  assert.equal(result.summary.slidesWithTitles, 1);
  assert.equal(result.summary.textBlocks, 2);
  assert.equal(result.summary.listItems, 0);
  assert.equal(result.summary.tables, 0);
  assert.equal(result.summary.hyperlinks, 0);
  assert.equal(result.summary.imageAssets, 0);
  assert.equal(result.summary.notesSlides, 0);
  assert.equal(result.summary.warnings, 0);
  assert.equal(result.summary.errors, 0);
});

test("can include YAML front matter when requested", () => {
  const result = convertPptxToMarkdown(createMinimalPptx(), {
    title: "sample.pptx",
    frontMatter: "include",
    toolVersion: "0.5.1",
    includeUnsupportedComments: true
  });

  assert.match(result.markdown, /^---\ntitle: "sample\.pptx"\ntype: converted\nconversion:\n  tool: miku-pptx2md\n  version: "0\.5\.1"\n  notes: include\n  unsupported_comments: include\n---\n\n# sample\.pptx\n\n## Slide 1: Overview/m);
});

test("extracts core presentation metadata and uses title as fallback heading", () => {
  const result = convertPptxToMarkdown(createMetadataPptx(), { fallbackTitle: "file-stem" });

  assert.match(result.markdown, /^# Roadmap & Review\n\n## Slide 1: Metadata Slide/m);
  assert.equal(result.metadata.title, "Roadmap & Review");
  assert.equal(result.metadata.subject, "Planning");
  assert.equal(result.metadata.creator, "Alice");
  assert.equal(result.metadata.description, "Quarterly deck");
  assert.equal(result.metadata.keywords, "pptx, markdown");
  assert.equal(result.metadata.lastModifiedBy, "Bob");
  assert.equal(result.metadata.revision, "7");
  assert.equal(result.metadata.category, "Engineering");
  assert.equal(result.metadata.created, "2026-06-24T10:00:00Z");
  assert.equal(result.metadata.modified, "2026-06-25T11:30:00Z");

  const overridden = convertPptxToMarkdown(createMetadataPptx(), { title: "explicit-title" });
  assert.match(overridden.markdown, /^# explicit-title\n\n## Slide 1: Metadata Slide/m);
});

test("marks text inside ordinary shapes while preserving textbox text as plain paragraphs", () => {
  const result = convertPptxToMarkdown(createShapeTextPptx(), { title: "shape-sample" });

  assert.match(result.markdown, /^# shape-sample\n\n## Slide 1: Shape Slide/m);
  assert.match(result.markdown, /> \[Shape: rect\] Decision box/);
  assert.match(result.markdown, /> Keep this label/);
  assert.match(result.markdown, /\nPlain textbox\n/);
  assert.doesNotMatch(result.markdown, /\[Shape: rect\] Plain textbox/);
  assert.equal(result.summary.textBlocks, 3);
});

test("converts clear bullet and numbered paragraphs to Markdown lists", () => {
  const result = convertPptxToMarkdown(createListPptx(), { title: "list-sample" });

  assert.match(result.markdown, /^# list-sample\n\n## Slide 1: List Slide/m);
  assert.match(result.markdown, /\n- Bullet item\n/);
  assert.match(result.markdown, /\n  - Nested bullet\n/);
  assert.match(result.markdown, /\n1\. Numbered item\n/);
  assert.match(result.markdown, /\nPlain after list\n/);
  assert.equal(result.summary.textBlocks, 4);
  assert.equal(result.summary.listItems, 3);
});

test("preserves simple bold, italic, and underline text runs as Markdown formatting", () => {
  const result = convertPptxToMarkdown(createFormattedTextPptx(), { title: "format-sample" });

  assert.match(result.markdown, /^# format-sample\n\n## Slide 1: Formatted Slide/m);
  assert.match(result.markdown, /Use \*\*bold\*\* and \*italic\* plus \*\*\*both\*\*\* and <u>underlined<\/u>/);
  assert.equal(result.summary.textBlocks, 1);
  assert.equal(result.summary.warnings, 0);
});

test("converts slide text hyperlinks to Markdown links", () => {
  const result = convertPptxToMarkdown(createHyperlinkPptx(), { title: "link-sample" });

  assert.match(result.markdown, /^# link-sample\n\n## Slide 1: Hyperlink Slide/m);
  assert.match(result.markdown, /See \[\*\*project site\*\*\]\(https:\/\/example\.com\/project\?from=pptx\) for details/);
  assert.equal(result.summary.textBlocks, 1);
  assert.equal(result.summary.hyperlinks, 1);
  assert.equal(result.summary.warnings, 0);
});

test("converts simple PowerPoint tables to Markdown tables", () => {
  const result = convertPptxToMarkdown(createTablePptx(), { title: "table-sample" });

  assert.match(result.markdown, /^# table-sample\n\n## Slide 1: Table Slide/m);
  assert.match(result.markdown, /\| Name \| Status \|/);
  assert.match(result.markdown, /\| --- \| --- \|/);
  assert.match(result.markdown, /\| Parser \| In progress \|/);
  assert.match(result.markdown, /\nAfter table\n/);
  assert.equal(result.summary.textBlocks, 5);
  assert.equal(result.summary.tables, 1);
});

test("warns when converting merged PowerPoint tables as flattened Markdown", () => {
  const result = convertPptxToMarkdown(createMergedTablePptx(), { title: "merged-table-sample" });

  assert.match(result.markdown, /^# merged-table-sample\n\n## Slide 1: Merged Table Slide/m);
  assert.match(result.markdown, /\| Combined Header \|  \|/);
  assert.match(result.markdown, /\| Left \| Right \|/);
  assert.equal(result.summary.tables, 1);
  assert.equal(result.summary.diagnostics, 1);
  assert.equal(result.summary.warnings, 1);
  assert.equal(result.diagnostics[0].code, "limited-table-merged-cells");
  assert.equal(result.diagnostics[0].source, "ppt/slides/slide1.xml");

  const debug = convertPptxToMarkdown(createMergedTablePptx(), {
    title: "merged-table-sample",
    includeUnsupportedComments: true
  });
  assert.match(debug.markdown, /<!-- warning: limited-table-merged-cells source=ppt\/slides\/slide1\.xml:/);
});

test("reports unsupported chart graphic frames as diagnostics", () => {
  const result = convertPptxToMarkdown(createChartPptx(), { title: "chart-sample" });

  assert.match(result.markdown, /^# chart-sample\n\n## Slide 1: Chart Slide/m);
  assert.equal(result.summary.diagnostics, 1);
  assert.equal(result.summary.warnings, 1);
  assert.equal(result.diagnostics[0].code, "unsupported-chart");
  assert.equal(result.diagnostics[0].source, "ppt/slides/slide1.xml");
  assert.doesNotMatch(result.markdown, /unsupported-chart/);

  const debug = convertPptxToMarkdown(createChartPptx(), {
    title: "chart-sample",
    includeUnsupportedComments: true
  });
  assert.match(debug.markdown, /<!-- warning: unsupported-chart source=ppt\/slides\/slide1\.xml:/);
});

test("reports unsupported SmartArt graphic frames as diagnostics", () => {
  const result = convertPptxToMarkdown(createSmartArtPptx(), { title: "smartart-sample" });

  assert.match(result.markdown, /^# smartart-sample\n\n## Slide 1: SmartArt Slide/m);
  assert.equal(result.summary.diagnostics, 1);
  assert.equal(result.summary.warnings, 1);
  assert.equal(result.diagnostics[0].code, "unsupported-smartart");
  assert.equal(result.diagnostics[0].source, "ppt/slides/slide1.xml");
  assert.doesNotMatch(result.markdown, /unsupported-smartart/);

  const debug = convertPptxToMarkdown(createSmartArtPptx(), {
    title: "smartart-sample",
    includeUnsupportedComments: true
  });
  assert.match(debug.markdown, /<!-- warning: unsupported-smartart source=ppt\/slides\/slide1\.xml:/);
});

test("emits speaker notes by default and honors includeNotes false", () => {
  const result = convertPptxToMarkdown(createNotesPptx(), { title: "notes-sample" });

  assert.match(result.markdown, /^# notes-sample\n\n## Slide 1: Notes Slide/m);
  assert.match(result.markdown, /\nSlide body\n/);
  assert.match(result.markdown, /\n### Speaker Notes\n/);
  assert.match(result.markdown, /\nSpeaker note line one\n/);
  assert.match(result.markdown, /\nSpeaker note line two\n/);
  assert.doesNotMatch(result.markdown, /Slide thumbnail placeholder/);
  assert.equal(result.summary.textBlocks, 3);
  assert.equal(result.summary.notesSlides, 1);

  const withoutNotes = convertPptxToMarkdown(createNotesPptx(), {
    title: "notes-sample",
    includeNotes: false
  });
  assert.doesNotMatch(withoutNotes.markdown, /Speaker Notes/);
  assert.doesNotMatch(withoutNotes.markdown, /Speaker note line one/);
});

test("extracts resolved image assets and renders placeholders or links", () => {
  const result = convertPptxToMarkdown(createImagePptx(), { title: "image-sample" });

  assert.match(result.markdown, /^# image-sample\n\n## Slide 1: Image Slide/m);
  assert.match(result.markdown, /\[Image: Diagram alt\]/);
  assert.equal(result.assets.length, 1);
  assert.equal(result.assets[0].sourcePath, "ppt/media/image1.png");
  assert.equal(result.assets[0].mediaType, "image/png");
  assert.equal(result.assets[0].altText, "Diagram alt");
  assert.equal(result.assets[0].sourceTrace, "picture:image(ppt/media/image1.png):alt(Diagram alt)");
  assert.equal(result.assets[0].slideIndex, 1);
  assert.equal(result.assets[0].blockIndex, 0);
  assert.equal(result.assets[0].relationshipId, "rIdImage1");
  assert.deepEqual(Array.from(result.assets[0].bytes), [137, 80, 78, 71]);
  assert.equal(result.summary.imageAssets, 1);

  const linked = convertPptxToMarkdown(createImagePptx(), {
    title: "image-sample",
    imagePathResolver: (asset) => `assets/${asset.sourcePath}`
  });
  assert.match(linked.markdown, /!\[Diagram alt\]\(assets\/ppt\/media\/image1\.png\)/);
});

test("projects structured summary JSON and asset manifest data", () => {
  const result = convertPptxToMarkdown(createImagePptx(), { title: "image-sample" });

  assert.equal(createPptx2MdSummaryText(result), [
    "slides: 1",
    "slidesWithTitles: 1",
    "textBlocks: 0",
    "listItems: 0",
    "tables: 0",
    "hyperlinks: 0",
    "imageAssets: 1",
    "notesSlides: 0",
    "comments: 0",
    "warnings: 0",
    "errors: 0",
    "diagnostics: 0"
  ].join("\n"));

  assert.deepEqual(createPptx2MdSummaryJsonData(result), {
    version: 1,
    metadata: {},
    summary: result.summary,
    diagnostics: [],
    assets: [
      {
        kind: "image",
        sourcePath: "ppt/media/image1.png",
        mediaType: "image/png",
        altText: "Diagram alt",
        sourceTrace: "picture:image(ppt/media/image1.png):alt(Diagram alt)",
        slideIndex: 1,
        blockIndex: 0,
        relationshipId: "rIdImage1",
        size: 4
      }
    ]
  });

  assert.deepEqual(createPptx2MdAssetsManifestData(result.assets), {
    version: 1,
    assets: [
      {
        kind: "image",
        sourcePath: "ppt/media/image1.png",
        mediaType: "image/png",
        altText: "Diagram alt",
        sourceTrace: "picture:image(ppt/media/image1.png):alt(Diagram alt)",
        slideIndex: 1,
        blockIndex: 0,
        relationshipId: "rIdImage1",
        size: 4,
        documentPosition: {
          slideIndex: 1,
          blockIndex: 0,
          blockKind: "image"
        }
      }
    ]
  });
});

test("reports unsupported video picture objects as diagnostics", () => {
  const result = convertPptxToMarkdown(createVideoPptx(), { title: "video-sample" });

  assert.match(result.markdown, /^# video-sample\n\n## Slide 1: Video Slide/m);
  assert.equal(result.assets.length, 0);
  assert.equal(result.summary.diagnostics, 1);
  assert.equal(result.summary.warnings, 1);
  assert.equal(result.diagnostics[0].code, "unsupported-video");
  assert.equal(result.diagnostics[0].source, "ppt/slides/slide1.xml");
  assert.doesNotMatch(result.markdown, /unsupported-video/);

  const debug = convertPptxToMarkdown(createVideoPptx(), {
    title: "video-sample",
    includeUnsupportedComments: true
  });
  assert.match(debug.markdown, /<!-- warning: unsupported-video source=ppt\/slides\/slide1\.xml:/);
});

test("reports unsupported audio picture objects as diagnostics", () => {
  const result = convertPptxToMarkdown(createAudioPptx(), { title: "audio-sample" });

  assert.match(result.markdown, /^# audio-sample\n\n## Slide 1: Audio Slide/m);
  assert.equal(result.assets.length, 0);
  assert.equal(result.summary.diagnostics, 1);
  assert.equal(result.summary.warnings, 1);
  assert.equal(result.diagnostics[0].code, "unsupported-audio");
  assert.equal(result.diagnostics[0].source, "ppt/slides/slide1.xml");

  const debug = convertPptxToMarkdown(createAudioPptx(), {
    title: "audio-sample",
    includeUnsupportedComments: true
  });
  assert.match(debug.markdown, /<!-- warning: unsupported-audio source=ppt\/slides\/slide1\.xml:/);
});

test("reports unsupported OLE picture objects as diagnostics", () => {
  const result = convertPptxToMarkdown(createOleObjectPptx(), { title: "ole-sample" });

  assert.match(result.markdown, /^# ole-sample\n\n## Slide 1: OLE Slide/m);
  assert.equal(result.assets.length, 0);
  assert.equal(result.summary.diagnostics, 1);
  assert.equal(result.summary.warnings, 1);
  assert.equal(result.diagnostics[0].code, "unsupported-ole-object");
  assert.equal(result.diagnostics[0].source, "ppt/slides/slide1.xml");

  const debug = convertPptxToMarkdown(createOleObjectPptx(), {
    title: "ole-sample",
    includeUnsupportedComments: true
  });
  assert.match(debug.markdown, /<!-- warning: unsupported-ole-object source=ppt\/slides\/slide1\.xml:/);
});

test("renders slide comments as Markdown comments section", () => {
  const result = convertPptxToMarkdown(createCommentsPptx(), { title: "comment-sample" });

  assert.match(result.markdown, /^# comment-sample\n\n## Slide 1: Comment Slide/m);
  assert.match(result.markdown, /Visible slide body/);
  assert.match(result.markdown, /### Comments\n\n- \[comment-1\] Review note/);
  assert.equal(result.summary.comments, 1);
  assert.equal(result.summary.diagnostics, 0);
  assert.equal(result.summary.warnings, 0);
  assert.deepEqual(result.diagnostics, []);

  const debug = convertPptxToMarkdown(createCommentsPptx(), {
    title: "comment-sample",
    includeUnsupportedComments: true
  });
  assert.doesNotMatch(debug.markdown, /unsupported-comments/);
});

test("tracks diagnostics and can render diagnostic comments in debug mode", () => {
  const result = convertPptxToMarkdown(createMissingImagePptx(), { title: "diagnostic-sample" });

  assert.equal(result.summary.diagnostics, 1);
  assert.equal(result.summary.warnings, 1);
  assert.equal(result.summary.errors, 0);
  assert.equal(result.diagnostics[0].code, "missing-image-part");
  assert.doesNotMatch(result.markdown, /<!-- warning:/);

  const debug = convertPptxToMarkdown(createMissingImagePptx(), {
    title: "diagnostic-sample",
    includeUnsupportedComments: true
  });
  assert.match(debug.markdown, /## Diagnostics/);
  assert.match(debug.markdown, /<!-- warning: missing-image-part source=ppt\/slides\/slide1\.xml:/);
});
