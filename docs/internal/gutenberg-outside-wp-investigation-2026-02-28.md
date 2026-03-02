# EdgePress Editor Stabilization Execution Notes (2026-03-02)

## Context
Execution branch: `feat/editor-runtime-stability-ibe-phase1` (from `origin/main`).

This document replaces the prior investigation-only note with executed architecture decisions and implementation outcomes for the IBE-aligned editor runtime pivot.

## Implemented Decisions

### 1) Single-owner isolated registry contract
Implemented in:
- `apps/admin-web/src/features/editor/state/createEditorRegistry.js`
- `apps/admin-web/src/features/editor/components/EditorSurface.jsx`

What changed:
- The editor registry now explicitly registers the required Gutenberg stores for isolated runtime ownership:
  - `@wordpress/preferences`
  - `@wordpress/interface`
  - `@wordpress/keyboard-shortcuts`
  - `@wordpress/notices`
  - `@wordpress/blocks`
  - `@wordpress/rich-text`
  - `@wordpress/block-editor`
  - `@wordpress/editor`
- `BlockEditorProvider` now uses `useSubRegistry={false}` so the prepared isolated registry remains the active runtime source.

Why:
- Prevents missing-store failures in embedded runtime paths (`registerShortcut` null dispatch path and `getFormatTypes` undefined selector path).

### 2) Dependency cohesion for Gutenberg store/runtime
Implemented in:
- `package.json`
- `bun.lock`

What changed:
- Added explicit direct dependencies required by runtime store registration:
  - `@wordpress/keyboard-shortcuts@5.39.0`
  - `@wordpress/notices@5.39.0`
  - `@wordpress/rich-text@7.39.0`
- Gutenberg package versions remain exact-pinned.
- React overrides remain single-version.

Why:
- Ensures the isolated registry can register all referenced stores and avoids runtime drift from transitive-only resolution.

### 3) Bootstrap ownership and determinism
Validated in:
- `apps/admin-web/src/features/editor/hooks/useEditorBootstrap.js`
- `apps/admin-web/src/features/editor/services/registerBootstrapPreload.js`

What remains true:
- Bootstrap remains feature-local and idempotent per editor identity.
- Deterministic preload includes:
  - `/wp/v2/settings`
  - `/wp/v2/themes`
  - `/wp/v2/types?context=edit`
  - current post/page entity endpoint

### 4) Admin chrome vs site canvas styling contract
Implemented in:
- `apps/admin-web/src/features/editor/components/canvas.web.css`

What changed:
- Removed stale, high-coupling shell selectors from prior mixed edit-post assumptions.
- Scoped editor styling contract to:
  - `.ep-editor-canvas-root` (embedded editor surface)
  - `#ep-editor-popovers` (editor popover surface)
- Kept explicit split:
  - admin channel (`--wp-components-*` sourced from admin vars)
  - content channel (`--ep-site-*` applied in `.editor-styles-wrapper`)

Why:
- Reduces CSS bleed between admin chrome and site content surface.
- Preserves placeholder, inserter, inspector, and popover interactivity.

### 5) Site theme source correctness
Implemented in:
- `apps/admin-web/src/features/settings/hooks/useAdminSettingsState.js`
- `apps/admin-web/src/scenes/root/Scene.jsx`

What changed:
- Settings state schema now explicitly includes `siteTheme`.
- Storage read/write preserves `siteTheme`, `siteTitle`, and `tagline` alongside permalink settings.
- Root scene now uses `settings?.siteTheme ?? theme` for explicit site-theme fallback semantics.

Why:
- Removes implicit coupling where site theme was inferred only from admin theme.

### 6) Backend deterministic ordering guard
Implemented in:
- `apps/api/test/wp-core.controllers.branches.test.js`

What changed:
- Added coverage ensuring `/patterns` responses are deterministic under same-timestamp ties (updatedAt desc, id tie-break).

Why:
- Hardens wp-core bootstrap parity assumptions and prevents nondeterministic ordering regressions.

## Architecture-slice compliance

### Frontend slice compliance
- Editor runtime logic remains feature-local (`features/editor/*`).
- Scene-level composition continues to consume feature front doors, not deep feature internals.

### Backend slice compliance
- WP-core controllers stay adapter-thin.
- Cross-capability sequencing remains outside controller code.

## Remaining Follow-ups (explicit)
1. Add e2e coverage for editor interaction stability:
- empty post placeholder
- repeated inserter interactions
- selection + inspector changes
- post/page switching and refresh rehydrate

2. Add e2e coverage for theme isolation:
- admin chrome unaffected by site-theme changes
- canvas styles tracking site-theme updates

3. Capture and track browser console assertions in admin-web e2e to fail on known crash signatures.

## Done Definition for this phase
This phase is complete when all are true:
1. Isolated editor registry includes rich-text and keyboard/notices stores.
2. Block editor runs on that registry (`useSubRegistry={false}`).
3. Editor canvas renders without store-missing runtime crashes.
4. Style scope is constrained to editor surface and popovers.
5. Settings state can persist an explicit `siteTheme` without losing existing settings fields.
6. Controller test coverage guards deterministic `/patterns` ordering.
