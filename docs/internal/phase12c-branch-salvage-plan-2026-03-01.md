# Phase12C Branch Salvage and Retirement Plan (2026-03-01)

## Purpose
Define a no-data-loss path for retiring `phase12c-execution-plan` and closing PR #15 while preserving all still-relevant Phase 12C work.

## Current Branch/PR Truth
- PR #15: `phase12c-execution-plan -> main` is open and conflicting.
- PR #16: `feat/phase12c-ibe-editor-pivot -> phase12c-execution-plan` is open and clean.
- `phase12c-execution-plan` is ahead of `main` by 17 commits.
- `feat/phase12c-ibe-editor-pivot` contains `phase12c-execution-plan` as an ancestor and adds 3 commits.

Implication:
- Closing/deleting `phase12c-execution-plan` is only safe after all required deltas are preserved on a branch rooted on `main` and merged.

## Data Preservation Inventory
Comparison basis:
- Phase12C delta set: `origin/phase12c-backend-issues...origin/phase12c-execution-plan` = 46 files.
- Files touched in PR #16: 30 files.
- Overlap: 14 files.
- Not covered by PR #16: 32 files.

### Covered by PR #16 (14 files)
These are already in the IBE-pivot branch and should move forward with that PR path:
- `apps/admin-web/src/features/content/components/ContentSettingsPanel.jsx`
- `apps/admin-web/src/features/editor/components/Canvas.jsx`
- `apps/admin-web/src/features/editor/devtools/BlockTreeInspector.jsx`
- `apps/admin-web/src/features/editor/devtools/DevToolsPanel.jsx`
- `apps/admin-web/src/features/editor/devtools/useDevToolsState.js`
- `apps/admin-web/src/features/editor/index.js`
- `apps/admin-web/src/features/media/components/MediaPicker.jsx`
- `apps/admin-web/src/scenes/content/Scene.jsx`
- `apps/admin-web/test/admin.theme.shell-parity.test.js`
- `apps/admin-web/test/editor.parity.transforms.test.js`
- `apps/api/src/adapters/http/controllers/wp-core/meta.js`
- `apps/api/src/orchestration/release-workflow.js`
- `docs/internal/manual-validation-12c.md`
- `docs/internal/phase-12c-execution-plan.md`

### Not Covered by PR #16 (32 files)
These need explicit disposition before retirement.

#### A) Keep and forward-port (high-value parity/runtime)
Editor parity and shell behavior:
- `apps/admin-web/src/App.jsx`
- `apps/admin-web/src/features/content/components/PublishPanel.jsx`
- `apps/admin-web/src/features/editor/devtools/DiagnosticsInspector.jsx`
- `apps/admin-web/src/features/editor/devtools/ThemeTokenInspector.jsx`
- `apps/admin-web/src/features/editor/devtools/TransformTracer.jsx`
- `apps/admin-web/src/features/editor/devtools/index.js`
- `apps/admin-web/src/features/editor/parity/embedPolicy.js`
- `apps/admin-web/src/features/editor/parity/mappings/coreContent.js`
- `apps/admin-web/src/features/editor/parity/mappings/coreImage.js`
- `apps/admin-web/src/features/editor/parity/mappings/coreNavigation.js`
- `apps/admin-web/src/features/editor/parity/packs/core.js`
- `apps/admin-web/src/features/editor/parity/pipeline.js`
- `apps/admin-web/src/features/editor/parity/sanitize.js`
- `apps/admin-web/src/features/media/index.js`
- `apps/admin-web/src/features/theme/tokenExport.js`
- `apps/admin-web/src/scenes/root/Scene.jsx`

Backend/content determinism and compatibility:
- `apps/api/src/adapters/http/controllers/content/patterns.js`
- `apps/api/test/api.flow.acceptance.test.js`
- `apps/api/test/api.wp-core.test.js`
- `apps/api/test/wp-core.controllers.branches.test.js`
- `packages/content/src/previews.js`
- `packages/content/src/renderShell.js`
- `packages/domain/src/entities.js`
- `docs/reference/wp-compatibility-profile.md`

Quality/tooling:
- `apps/admin-web/test/admin.shell.test.js`
- `apps/admin-web/test/editor.devtools.test.js`
- `apps/admin-web/test/editor.parity.sanitize.test.js`
- `scripts/parity-audit.js`
- `scripts/parity-audit.test.js`

#### B) Archive only / do not ship to main
Local notes and planner artifacts:
- `.sisyphus/boulder.json`
- `.sisyphus/notepads/phase-12c/learnings.md`
- `PLANNING.md` (only if this specific diff is branch-note drift and not required roadmap updates)

## Slice-Architecture Aligned Migration Path

### Frontend lane (feature-slice)
- Keep editor runtime ownership under `features/editor` public surface only.
- Preserve parity transforms and devtools as `features/editor` internals.
- Keep scene composition thin (`scenes/*` consume `features/*/index.js` only).

### Backend lane (backend-slice)
- Keep capability behavior in packages/controllers as currently shaped.
- Keep cross-capability sequence in `apps/api/src/orchestration/*` only.
- Preserve deterministic `/wp/v2` behavior and parity tests before branch retirement.

## Execution Checklist (No-Data-Loss)
1. Create a new integration branch from `origin/main` (not from `phase12c-execution-plan`).
2. Cherry-pick or patch-port the 3 IBE pivot commits from `feat/phase12c-ibe-editor-pivot`.
3. Forward-port the high-value 32-file backlog in grouped PRs:
   - Group 1: editor parity + devtools files.
   - Group 2: backend patterns/wp-core + package render/entity changes.
   - Group 3: tests + parity audit tooling + compatibility docs.
4. Verify with CI and targeted manual checks:
   - editor placeholder/inserter/selection stability.
   - document switching and refresh rehydrate.
   - media/featured image operations during editing.
   - wp-core bootstrap endpoint consistency.
5. Merge replacement PR(s) into `main`.
6. Close PR #15 with note: superseded by replacement PR(s).
7. Delete `phase12c-execution-plan` only after step 5 and an explicit tag/snapshot exists.

## Safe-to-Close Gate
PR #15 and branch `phase12c-execution-plan` are safe to close/delete only when all conditions are true:
- All files in section A are present in merged `main` commits (or consciously dropped with rationale).
- PR #16 changes are merged through a `main`-based branch path.
- Section B files are either archived or intentionally excluded.
- CI is green on the replacement branch.

## Immediate Recommendation
Do not close/delete `phase12c-execution-plan` yet.
First, cut a `main`-based salvage branch and move the retained deltas there; then retire PR #15 as superseded.
