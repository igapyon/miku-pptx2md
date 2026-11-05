# Product Message

`miku-pptx2md` is a lightweight, local, deterministic PPTX-to-Markdown intake tool for AI agents. Its text-focused intermediate output supports search, summaries, and initial review. The source presentation remains necessary for visual interpretation.

This wording follows the direction in [Issue #12](https://github.com/igapyon/miku-pptx2md/issues/12) and the [Office family message](https://github.com/igapyon/miku-ms-office-skills/issues/16). It describes this product's implemented behavior without claiming family-wide rollout or performance measurements.

| Shared term | Meaning in this product |
| --- | --- |
| lightweight | Content extraction takes priority over complete visual reconstruction. |
| local | Normal conversion reads local files and needs no external AI service. |
| deterministic | The same input, runtime, version, and options do not depend on model-generated results. |
| AI-oriented, not AI-dependent | Agents can use the output; no LLM or AI API performs conversion. |
| text-focused | Directly readable text and structure become Markdown; resolved images can be exported as sidecar assets. |
| not layout-faithful | Layout, style, image placement, shapes, and chart meaning have limited preservation. |

Conversion itself consumes no inference tokens. Agent orchestration and later model analysis of the Markdown can consume tokens separately. No claim is made about identical output across different runtimes or versions, complete Office / Markdown round trips, or preservation of every visual object.

## Public Description Review

Checked on 2026-11-04:

- README: updated the opening purpose, token boundary, deterministic behavior, limitations, and Java relationship.
- CLI: updated its title and description to the same intake purpose, token boundary, and limitations.
- GitHub About: the public repository API currently returns `miku-pptx2md`, which does not explain its purpose. An update is recommended using the text below.

### GitHub About — English

Lightweight local PPTX-to-Markdown intake for AI agents. Deterministic, text-focused conversion without LLM/API use.

### GitHub About — Japanese Reference

AIエージェント向けの軽量なローカルPPTXインテーク。LLM・AI APIを使わず、テキスト中心のMarkdownへ決定論的に変換します。

The proposed About text is prepared here for the repository's publishing workflow. This review checks update necessity; it does not claim the hosted description has been changed.

## Java Comparison

Reviewed the local `miku-pptx2md-java` README at commit `2f1c13fc12270dda0f804e0be75283f8be7eaee2`. That snapshot documents Java `0.5.1`, treats Node as the semantic source, reads local PPTX ZIP/XML parts, and produces Markdown, image sidecars, summaries, and diagnostics. It explicitly limits parity claims to checked representative fixtures.

The common vocabulary above applies to that purpose. Runtime packaging and invocation differ (`node <file>.mjs` versus `java -jar <file>.jar`). Neither product description should promise byte-identical output without comparing the relevant versions and fixtures. This is a documentation comparison against the recorded Java snapshot, not a new Node / Java parity test.

The maintainer confirmed that Node updates propagate into the Java maintenance workflow. Node remains the source for these changes; this repository's README and CLI carry the updated vocabulary for that downstream flow.
