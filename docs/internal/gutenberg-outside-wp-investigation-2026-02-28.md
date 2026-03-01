# EdgePress Branch Pivot: IBE-Aligned Stable Editor Runtime (2026-02-28)

## Context
Branch: `phase12c-execution-plan`

This branch already ships useful parity/usability improvements, but it was not built as a runtime-ownership stabilization branch. The editor surface still had mixed ownership (`EditorProvider` + core-data seeding + `initializeEditor`) and remained brittle under real authoring interactions.

This document replaces the earlier generic investigation with a branch-specific, decision-complete pivot for moving toward a stable IBE-inspired runtime model.

## Diff Truth Map

### Keep (already valuable in this branch)
1. Empty state and authoring UX improvements
- `apps/admin-web/src/features/editor/hooks/useEditorState.js` (starter paragraph fallback)
- `apps/admin-web/src/features/editor/components/canvas.web.css` (title wrapping, canvas spacing)

2. Block parity improvements
- `apps/admin-web/src/features/editor/registerBlocks.js` (`core/navigation` registration)

3. Media workflow improvements
- `apps/admin-web/src/features/media/components/MediaPicker.jsx`
- `apps/admin-web/src/features/content/components/ContentSettingsPanel.jsx`
- `apps/admin-web/src/scenes/content/Scene.jsx`

4. Devtools resilience improvements
- `apps/admin-web/src/features/editor/devtools/useDevToolsState.js`
- `apps/admin-web/src/features/editor/devtools/DevToolsPanel.jsx`
- `apps/admin-web/src/features/editor/devtools/BlockTreeInspector.jsx`

### Replace/Discard (runtime ownership fixes)
1. Mixed bootstrap ownership in the editor canvas
- Replace editor runtime path in `apps/admin-web/src/features/editor/components/Canvas.jsx`
- Remove dependence on `@wordpress/edit-post initializeEditor` in active canvas path
- Remove overlapping manual entity boot path from render lifecycle

2. Ad-hoc bootstrap behavior without feature-local service contract
- Replace with explicit feature-local bootstrap preload service and hook

## Exact IBE Patterns Adopted (and where)

1. Per-instance editor registry lifecycle
- `apps/admin-web/src/features/editor/state/createEditorRegistry.js`
- `apps/admin-web/src/features/editor/state/storeHotSwapPlugin.js`

2. Focus-based editor store routing (hot swap)
- `apps/admin-web/src/features/editor/state/storeHotSwapPlugin.js`

3. Bootstrap preload contract for required wp-core endpoints
- `apps/admin-web/src/features/editor/services/registerBootstrapPreload.js`

4. Single bootstrap entrypoint for editor initialization
- `apps/admin-web/src/features/editor/hooks/useEditorBootstrap.js`

5. Single-surface editor component with deterministic lifecycle
- `apps/admin-web/src/features/editor/components/EditorSurface.jsx`
- `apps/admin-web/src/features/editor/components/Canvas.jsx`

## Frontend Slice Compliance

This pivot keeps runtime work inside the editor feature and exports only stable front-door APIs:
- `apps/admin-web/src/features/editor/index.js`

Scene composition remains thin and consumes feature surfaces (`@features/editor`) without deep-importing internals.

Boundary guardrail added:
- `scripts/check-boundaries.js`
  - Scenes under `apps/admin-web/src/scenes/*` cannot deep-import `@features/<feature>/*` internals.

## Backend Slice Compliance

No route sprawl or controller business logic migration was introduced. Existing wp-core adapters remain thin.

Deterministic facade ordering hardening:
- `apps/api/src/adapters/http/controllers/wp-core/meta.js`
  - list responses now have deterministic tie-break sorting (`updatedAt` desc, then `id` asc).

Capability data ownership remains in packages and app orchestration remains separate.

## Admin Chrome vs Public Theme Contract

The editor now has explicit token separation:

1. Admin chrome token channel
- `--ep-admin-*`
- Mapped to Gutenberg admin/chrome variables through admin var generation in canvas runtime

2. Site content token channel
- `--ep-site-*`
- Applied to editor content wrapper only (`.editor-styles-wrapper` path)

Contract goal:
- Admin rails/chrome remain admin-themed
- Content canvas mimics public site theme
- No token bleed between channels

## Phased Checklist and Acceptance Criteria

### Phase A: Freeze and boundaries
- [x] Pin Gutenberg package versions (no `^` ranges)
- [x] Add Gutenberg matrix check script (`scripts/check-gutenberg-version-matrix.js`)
- [x] Add scene->feature deep import boundary check

### Phase B: Feature-local IBE runtime patterns
- [x] Per-instance registry creator
- [x] Hot-swap plugin
- [x] Bootstrap preload service
- [x] Unified bootstrap hook

### Phase C: Replace mixed canvas ownership
- [x] Canvas routes to single-surface `EditorSurface`
- [x] Remove `initializeEditor` ownership path from active canvas runtime
- [x] Keep source fallback for true runtime failure only

### Phase D: Theme split hardening
- [x] Separate admin vars and site vars in canvas runtime
- [x] Keep site-theme application scoped to content wrapper
- [ ] Expand CSS pruning to remove stale edit-post shell selectors now unused by the new surface

### Phase E: Backend bootstrap determinism
- [x] Deterministic ordering for wp-core registry list endpoint responses
- [ ] Add explicit tests for deterministic tie-break behavior under same timestamps

### Phase F: Reliability test suite expansion
- [ ] Add focused editor interaction e2e
- [ ] Add theming isolation e2e
- [ ] Add explicit bootstrap endpoint shape assertions for editor init paths

## Risk Register

1. Runtime ownership conflicts
- Risk: hidden call sites still initializing competing editor stores
- Mitigation: keep runtime initialization behind `EditorSurface` + `useEditorBootstrap` only

2. Gutenberg version drift
- Risk: accidental floating range upgrades
- Mitigation: exact pins + matrix check script in CI

3. CSS scope bleed
- Risk: old edit-post shell selectors unexpectedly target new surface
- Mitigation: progressively prune stale selectors and keep content style scopes explicit

4. Bootstrap endpoint drift
- Risk: wp-core responses shift and break editor assumptions
- Mitigation: deterministic sorting + dedicated endpoint shape tests

## Done Definition for Pivot Completion

The pivot is complete when all are true:
1. Editor startup and interaction are controlled by one runtime ownership path (`EditorSurface`).
2. No active canvas dependency on `initializeEditor` remains.
3. Gutenberg package matrix is exact and CI-guarded.
4. Scene imports respect feature public APIs only.
5. Admin-vs-site token split is verified by tests.
6. Editor interaction regression tests pass for placeholder, inserter, selection, post/page switches, and refresh restore.
