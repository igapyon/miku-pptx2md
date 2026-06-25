import assert from "node:assert/strict";
import test from "node:test";

import { convertPptxToMarkdown } from "../dist/js/core.js";
import { createMinimalPptx } from "./pptx-fixture.mjs";

test("converts the first slide into a Markdown level-2 section", () => {
  const result = convertPptxToMarkdown(createMinimalPptx(), { title: "sample" });

  assert.match(result.markdown, /^# sample\n\n## Slide 1: Overview/m);
  assert.match(result.markdown, /First paragraph/);
  assert.match(result.markdown, /Second paragraph/);
  assert.equal(result.summary.slides, 1);
  assert.equal(result.summary.slidesWithTitles, 1);
  assert.equal(result.summary.textBlocks, 2);
});
