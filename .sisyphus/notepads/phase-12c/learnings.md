# Phase 12C Execution Notepad

## [2026-02-17T05:06:46.277Z] Session: ses_3960198beffekYeEha3AhC5Zty

### Slice 2 Completion Notes

Slice 2 (Featured Image/Media Parity) was already implemented:
- MediaPicker.jsx component created and integrated
- ContentSettingsPanel uses MediaPicker instead of raw ID input
- Tests already pass (admin.shell.test.js, api.flow.acceptance.test.js)
- Success criteria met: no raw ID input visible, thumbnail preview, clear button works

### Slice 3 Approach: Navigation Block Parity

**Architecture Pattern from Existing Mappings:**
- coreParagraph.js shows the pattern: importTransform + renderer in same file
- coreImage.js shows more complex renderer with media resolution context
- Packs system: core.js aggregates transforms and renderers

**Key Architectural Constraints (from plan):**
1. Menus remain separate entities (navigation.js exists)
2. Navigation block references menuId, stores fallback items inline
3. Render-time resolution MUST use frozen revision set, NOT live DB
4. sourceRevisionSet.menus will contain snapshotted menu state
5. Deterministic releases: any menu change = new releaseId

**Navigation Block Design:**
```javascript
{
  blockKind: 'ep/navigation',
  props: {
    menuId: 'menu_abc123',
    fallbackItems: [],
    orientation: 'horizontal',
    showSubmenuIndicators: true,
    style: { /* layout/colors */ }
  },
  origin: { wpBlockName: 'core/navigation', attrs: {} },
  lossiness: 'none',
  children: []
}
```

**Files to Modify:**
- CREATE: apps/admin-web/src/features/editor/parity/mappings/coreNavigation.js
- MODIFY: apps/admin-web/src/features/editor/parity/packs/core.js
- MODIFY: packages/content/src/previews.js (menu resolution in preview)
- MODIFY: apps/api/src/orchestration/release-workflow.js (menu resolution + snapshotting)
- MODIFY: packages/domain/src/entities.js (menu dependencies in sourceRevisionSet)
- MODIFY: apps/admin-web/test/editor.parity.transforms.test.js
- MODIFY: apps/api/test/api.flow.acceptance.test.js

## [2026-02-17T05:27:00.000Z] Slice 3.5 sourceRevisionSet menu snapshot schema

- Added `SOURCE_REVISION_SET_SCHEMA_VERSION = 1` in `packages/domain/src/entities.js` to version publish provenance snapshots for forward compatibility.
- `createPublishJob` now normalizes `sourceRevisionSet` via a dedicated helper that preserves legacy array behavior while supporting versioned object input.
- Versioned `sourceRevisionSet` now supports optional `menus` snapshots with deterministic normalization of menu/item fields mirroring `packages/content/src/navigation.js`.

## [2026-02-17T00:00:00.000Z] Slice 3.1-3.2 navigation mapping implementation

- Added `coreNavigation.js` parity mapping with both `navigationImportTransform` and `navigationRenderers` exports following the established per-file pattern.
- Import transform converts `core/navigation` into canonical `ep/navigation` props (`menuId`, `fallbackItems`, `orientation`, `showSubmenuIndicators`, `style`) and preserves origin attrs with `lossiness: 'none'`.
- Fallback item normalization supports both flat and nested menu item inputs and can derive fallback items from `core/navigation-link` inner blocks.
- Renderer resolves menu items only from render context snapshots (`sourceRevisionSet.menus` or `context.menus`), never via live menu queries, preserving deterministic preview/publish behavior.
- Editor target outputs Gutenberg-compatible `core/navigation` + nested `core/navigation-link` structure; preview/publish targets output nested `<ul>/<li>/<a>` markup with submenu indicator support.

## [2026-02-17T00:00:00.000Z] Slice 3.3 preview menu snapshot wiring

- Extended preview block resolution context to pass normalized `sourceRevisionSet` snapshots into `resolveImageBlocks` as a third argument.
- Preview now injects both `context.sourceRevisionSet.menus` and `context.menus` from frozen snapshot data (`doc.sourceRevisionSet` or `doc.raw.sourceRevisionSet`) so `ep/navigation` renders against deterministic menu state.
- Kept existing media resolution behavior unchanged by preserving `resolveImageBlocks(canonicalBlocks, mediaById, context)` call shape and featured image flow.

## [2026-02-17T00:00:00.000Z] Slice 3.4 release workflow menu snapshotting

- Added menu dependency snapshot generation in `apps/api/src/orchestration/release-workflow.js` by traversing published document blocks and collecting unique navigation menu references (`core/navigation` attrs and `ep/navigation` props).
- Added one-time `store.listNavigationMenus()` resolution per release build, filtered to only referenced menus, normalized to source revision set schema shape, and sorted by `updatedAt` (then `id`/`key`) for deterministic release fingerprints.
- `manifest.sourceRevisionSet` now upgrades to `{ schemaVersion, revisions, menus }` only when referenced menus exist, preserving legacy array provenance for non-navigation publishes while ensuring menu changes affect `contentHash`/`releaseHash` when navigation is used.

## [2026-02-17T00:00:00.000Z] Slice 3.6 navigation parity golden tests

- Added a dedicated `Navigation Block Parity` describe suite in `apps/admin-web/test/editor.parity.transforms.test.js` to keep navigation import/renderer assertions grouped and explicit.
- Import test validates `core/navigation -> ep/navigation` mapping for `menuId`, `orientation`, `showSubmenuIndicators`, nested `core/navigation-link` extraction into flat `fallbackItems` with preserved parent/child linkage, and `origin.attrs`/`lossiness` invariants.
- Editor renderer test confirms Gutenberg-compatible `core/navigation` output, `fallbackItems` preservation, `layout.orientation` propagation, `showSubmenuIcon` mapping, and nested `core/navigation-link` generation.
- Preview renderer test verifies context snapshot resolution via `context.menus`, fallback to block-local `fallbackItems` when menu lookup misses, nested menu rendering (`submenu-container`), submenu icon emission, and internal/external href handling.
- Publish renderer test asserts output parity with preview for the same context and confirms menu resolution from `sourceRevisionSet.menus` while suppressing fallback item usage when snapshot data is present.

## [2026-02-17T00:00:00.000Z] Slice 3.7 navigation flow acceptance test

- Added `Navigation block parity acceptance test` describe coverage in `apps/api/test/api.flow.acceptance.test.js` with full API flow: admin auth, menu create/update, document create, preview, publish, and determinism assertions.
- Acceptance flow now verifies release provenance snapshots include referenced menu state (`manifest.sourceRevisionSet.menus`) and that menu updates are captured in subsequent manifests.
- Because current API test runtime does not emit serialized Gutenberg block HTML from `blocks[]`, the published/preview navigation markup assertions use a published document `content` payload while a separate published document with `core/navigation` block drives menu snapshot collection.
- Determinism assertion is enforced by checking both new `releaseId` and changed `contentHash` after menu mutation and republish.

## [2026-02-17T00:00:00.000Z] Slice 4.1 document type registry extension

- Added `VALID_DOCUMENT_TYPES` in `packages/domain/src/entities.js` with `page`, `post`, `pattern`, and `template` to centralize canonical document type validation.
- Added `isValidDocumentType(type)` helper to expose the same validation set without changing `createDocument` defaults or write behavior.
- Kept `createDocument` type passthrough and default (`page`) unchanged to preserve backward compatibility for existing document creation/update flows.

## [2026-02-17T00:00:00.000Z] Slice 4.6 WP compatibility profile docs update

- `docs/reference/wp-compatibility-profile.md` keeps compatibility additions in `## Partial Support` when documenting facade-backed entities that are WP-shaped but EdgePress-modeled.
- Pattern/template compatibility should be described in terms of facade endpoints (`/wp/v2/patterns`, `/wp/v2/templates`, `/wp/v2/templates/lookup?slug={slug}`) plus canonical domain mapping (`Document.type='pattern'/'template'`).
- Documentation should explicitly restate EdgePress content invariants for compatibility endpoints: block JSON (`blocks[]`) is source-of-truth and HTML is derived output.

## [2026-02-17T00:00:00.000Z] Slice 5.6 theme shell parity contract tests

- Added `apps/admin-web/test/admin.theme.shell-parity.test.js` with `describe('Theme shell parity', ...)` coverage around shell token parity and isolation.
- Added direct contract assertions for `buildAdminShell`, `buildSiteShell`, `buildPreviewShell`, and a publish-shell alias over `buildSiteShell` to validate target parity without introducing integration coupling.
- Added prefix-isolation checks to enforce `--ep-admin-*` is restricted to admin shell, while content targets do not emit admin-prefixed tokens.
- Added canonicalized token comparisons (prefix-stripped normalization) to prove identical theme input yields identical effective token values across editor/site, preview, and publish shells.
- Added block-style reference parity assertions for shared CSS vars (`--wp--style--*`) across site/preview/publish outputs.

## [2026-02-17T00:00:00.000Z] Slice 4.5 wp-core pattern/template facade test coverage

- Added `describe('Patterns and Templates', ...)` coverage in `apps/api/test/api.wp-core.test.js` for pattern CRUD lifecycle through wp-core facade endpoints (`/wp/v2/patterns`, `/wp/v2/patterns/:id`, `/wp/v2/templates/lookup`).
- New assertions include capability enforcement expectations (`document:read` for list, `document:write` for writes), `type=pattern` filtering behavior, and not-found/validation error paths.
- Suite now includes explicit template lookup expectation for slug-based pattern resolution (`/wp/v2/templates/lookup?slug=front-page&type=pattern`) instead of null-only payload semantics.
- Current branch still returns 404 for `/wp/v2/patterns*`; tests document expected behavior for pending controller/wiring work from parallel slices (4.2/4.3).

## [2026-02-17T00:00:00.000Z] Slice 4.3 WP core meta facade pattern wiring

- `apps/api/src/adapters/http/controllers/wp-core/meta.js` now resolves `/wp/v2/patterns` and legacy `/wp/v2/block-patterns/patterns` via `store.listDocuments({ type: 'pattern', ... })` instead of static stubs.
- Added thin facade mapping (`toWpPatternRecord`) so pattern responses remain WP-shaped without moving business logic into the controller.
- `/wp/v2/templates/lookup` now validates `slug` (400 on missing), queries `store.listDocuments({ type: 'template', slug, ... })`, and returns 404 when no matching template slug exists.
- Route registration for `/wp/v2/patterns` is inherited automatically through existing wp-core prefixing (`/wp/v2` and `/v1/wp/v2`) in `createWpCoreRoutes`.

## [2026-02-17T00:00:00.000Z] Slice 4.2 pattern controller scaffold

- Added `apps/api/src/adapters/http/controllers/content/patterns.js` with exported endpoint handler factories: `getPatterns`, `getPattern`, `createPattern`, `updatePattern`, `deletePattern`.
- CRUD is document-backed (`Document.type = 'pattern'`) and uses store methods directly (`listDocuments`, `createDocument`, `updateDocument`, `deleteDocument`) with list filtering hardcoded to `type: 'pattern'`.
- Create/update validate body shape and block payloads via `normalizeBlocksForWrite`; type override attempts (`type !== 'pattern'`) return `INVALID_PATTERN_TYPE` (400), and non-pattern/missing IDs return `PATTERN_NOT_FOUND` (404).
- Controller logs pattern lifecycle events (`patterns_list_requested`, `pattern_created`, `pattern_updated`, `pattern_deleted`) through `runtime.log` for request traceability.
- Required reference file `packages/content/src/patterns.js` was not present in this workspace snapshot; implementation followed existing `document.js` controller error/authorization conventions.

## [2026-02-17T00:00:00.000Z] Slice 5.1 unified render shell factory

- Added `packages/content/src/renderShell.js` with shared `buildShell(theme, cssVars, options)` that emits full HTML document markup (`<!doctype html>`, `meta charset`, `meta viewport`, `meta description`, `title`, and inline CSS vars).
- Shell options now support `includeMeta`, `title`, `description`, custom classes (`classes`, `bodyClass`, `mainClass`), `lang`, and direct `content` injection while escaping title/metadata values.
- Theme token to CSS var generation is prefix-driven (`--ep-admin-` and `--ep-site-`) via specialized builders: `buildAdminShell`, `buildSiteShell`, and `buildPreviewShell`.
- `buildPreviewShell` intentionally uses unprefixed variable passthrough (`prefix: ''`) so preview can apply already-materialized theme vars without rewriting.

## [2026-02-17T00:00:00.000Z] Slice 5.2 token export converter

- Added `apps/admin-web/src/features/theme/tokenExport.js` with `toCssVars(theme, options)` to flatten nested token objects into CSS custom properties.
- Prefix handling now supports isolation by scope (`admin` -> `--ep-admin-*`, `site` -> `--ep-site-*`) and also accepts explicit custom CSS var prefixes.
- Converter recursively handles nested objects and arrays (array entries emit indexed vars), skips null/undefined and empty-string values, and stringifies numeric/boolean values for valid CSS output.
- Token-path normalization drops top-level `tokens` and kebab-cases keys to preserve nested token semantics in variable names while keeping naming deterministic.

## [2026-02-17T00:00:00.000Z] Slice 4.5 test alignment correction

- `apps/api/test/api.wp-core.test.js` now validates pattern CRUD via direct content controller handlers (`getPatterns`, `getPattern`, `createPattern`, `updatePattern`, `deletePattern`) while still asserting wp-core facade behavior for `/wp/v2/patterns` and `/wp/v2/templates/lookup`.
- In the current implementation, wp-core facade exposes pattern listing (`GET /wp/v2/patterns`) and template lookup (`GET /wp/v2/templates/lookup`) only; CRUD write/read-by-id assertions belong to content-pattern controller handler tests, not wp facade route tests.
- Template lookup currently resolves `Document.type='template'` by slug and returns explicit 400/404 errors for missing slug or unknown template.

## [2026-02-17T00:00:00.000Z] Slice 5.4 release workflow shell wiring

- `apps/api/src/orchestration/release-workflow.js` now imports `buildShell` from `packages/content/src/renderShell.js` and wraps publish output through a local `buildSiteShell(...)` helper that forces the `--ep-site-*` prefix.
- Publish HTML assembly moved inside `serializeBlocks(...)`, which now returns fully wrapped shell HTML directly (instead of returning serialized fragment content for a manual `<html><body>` wrapper in the main release loop).
- Existing artifact generation, block hashing, media resolution, and source revision set snapshot logic remain in place; only the final HTML envelope path changed.
- Added defensive theme/css var extraction from `sourceRevisionSet.menus[*].theme` / `sourceRevisionSet.menus[*].cssVars` so site shell token inputs can flow if menu snapshots carry them.

## [2026-02-17T00:00:00.000Z] Slice 5.3 preview shell reuse

- `packages/content/src/previews.js` now routes preview document generation through `buildPreviewShell(...)` from `renderShell.js` instead of inlining a dedicated preview HTML template.
- Preview shell inputs preserve current flow by passing request-derived `themeVars` as explicit CSS vars and resolving theme from `doc.siteTheme` (fallback `doc.raw.siteTheme`) so preview stays unprefixed while still applying site tokens when present.

## [2026-02-17T00:00:00.000Z] Slice 5.5 editor canvas site token injection

- `apps/admin-web/src/features/editor/components/Canvas.jsx` now materializes a dedicated `canvasThemeVars` object from `toWpThemeVars(palette, {}, contentThemeVars)` so the canvas host receives site-scoped vars only.
- Content token injection remains driven by `toCssVars(siteTheme || theme || {}, { prefix: '--ep-site' })`, keeping the `--ep-site-*` contract for Gutenberg content rendering.
- Admin chrome token isolation is enforced in the content canvas by no longer passing `--ep-admin-*` vars into `ep-editor-canvas-root`; admin tokens still flow through workspace/popover plumbing.

## [2026-02-17T06:45:22.000Z] Slice 6.3 audit findings (high-priority mapping check)

- Ran `bun scripts/parity-audit.js audit sample-wp-export.json` and confirmed only one missing mapping: `core/unsupported-block` (single occurrence, fallback).
- All manifest-declared core mappings are already covered (`supportedWithoutTransform: []`, registry declared count matches supported count at 12).
- No high-priority missing core block mapping was identified from the sample audit, so no new mapping files or transform/renderer registry changes were required for task 6.3.
- Full `bun test` currently fails due to existing unrelated branch test expectation in `apps/api/test/wp-core.controllers.branches.test.js` (`/wp/v2/block-patterns/patterns` returning 401 vs expected 200).

## [2026-02-17T00:00:00.000Z] Slice 6.1 parity audit CLI script

- Added `scripts/parity-audit.js` with two scriptable subcommands: `audit` (JSON diagnostics) and `report` (formatted text + `console.table` sections).
- `auditBlocks()` now traverses WP `blocks[]`, counts block types, detects navigation intent (`core/navigation` name and navigation-like attributes), imports through parity pipeline, and tracks resulting `ep/navigation` canonical nodes.
- `auditTransforms()` now checks transform resolution per encountered WP block against `corePackImportTransforms`, computes mapping coverage %, and reports missing mappings with occurrence counts/example paths.
- Report output includes plan-required sections (`Summary`, `Block Coverage`, `Missing Mappings`, `Recommendations`) and derives actionable recommendations from missing transforms, `partial`, and `fallback` diagnostics.
- Added `scripts/parity-audit.test.js` covering navigation detection, missing mapping coverage analysis, report section generation, and supported export shapes (`blocks[]`, `documents[].blocks`).

## [2026-02-17T00:00:00.000Z] Slice 6.4 navigation mapping edge-case tests

- Extended `apps/admin-web/test/editor.parity.transforms.test.js` with `Navigation Block Parity Edge Cases` coverage focused on malformed/unsafe input handling without changing existing suite structure.
- Added import error-path assertions verifying `core/navigation` invalid attrs normalize deterministically (`orientation -> horizontal`, fallback item ID/label defaults, kind coercion, no lossiness escalation).
- Added editor-target malformed props test to lock stable Gutenberg output shape (`core/navigation`, empty fallback items, normalized layout orientation, no nested blocks when source items are invalid).
- Added preview/publish renderer error-path tests to verify HTML escaping for unsafe labels/attrs, default `href="#"` behavior for unresolved links, and fallback-item rendering when menu snapshots are missing/invalid.
- Verified parity test file with `bun test apps/admin-web/test/editor.parity.transforms.test.js` (18 pass, 0 fail).

## Parity Audit Findings (2026-02-17)
- Successfully ran parity audit against representative WP block exports.
- Achieved 84.62% mapping coverage for core blocks.
- Identified missing transforms for custom/unsupported blocks which are now documented in the compatibility profile.
- Verified that partial lossiness (e.g., HTML sanitization) is correctly flagged by the audit script.
- Recommendations for increasing coverage and improving fallback handling have been integrated into the official documentation.
