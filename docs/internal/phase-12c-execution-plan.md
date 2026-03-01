# Phase 12C Execution Plan

**Status**: IN PROGRESS  
**Started**: 2026-02-17  
**Estimated Effort**: Large (22-32 hours)  
**Branch**: `phase-12c-product-parity`

## Overview

Phase 12C focuses on Product Parity Completion - closing the gap between transitional UI and full Gutenberg parity. The foundation (block parity architecture with 11 core blocks) is complete from Phase 12B.

## Execution Order

| Order | Slice | Status | Started | Completed |
|-------|-------|--------|---------|-----------|
| 0 | [Editor DevTools](#slice-0-editor-devtools) | [x] Complete | 2026-02-17 | 2026-02-17 |
| 1 | [Block Hardening](#slice-1-block-hardening) | [x] Complete | 2026-02-17 | 2026-02-17 |
| 2 | [Featured Image/Media Parity](#slice-2-featured-imagemedia-parity) | [x] Complete | 2026-02-17 | 2026-02-17 |
| 3 | [Navigation Block Parity](#slice-3-navigation-block-parity) | [x] Complete | 2026-02-17 | 2026-02-17 |
| 4 | [Templates/Patterns Lifecycle](#slice-4-templatespatterns-lifecycle) | [x] Complete | 2026-02-17 | 2026-02-17 |
| 5 | [Theme Parity Completion](#slice-5-theme-parity-completion) | [x] Complete | 2026-02-17 | 2026-02-17 |
| 6 | [Parity Gap Closeout](#slice-6-parity-gap-closeout) | [x] Complete | 2026-02-17 | 2026-03-01 |

---

## Slice 0: Editor DevTools

**Objective**: Add developer tooling for inspecting, debugging, and verifying block parity transformations.

**Why First**: Makes all subsequent slices easier to verify, provides real-time feedback during development.

**Estimate**: 4-6 hours

### Tasks

- [x] 0.1 Create `features/editor/devtools/DevToolsPanel.jsx` - Collapsible devtools panel component
- [x] 0.2 Create `features/editor/devtools/BlockTreeInspector.jsx` - Visual tree of blocks with canonical state
- [x] 0.3 Create `features/editor/devtools/DiagnosticsInspector.jsx` - Shows parity diagnostics (transformed/partial/fallback)
- [x] 0.4 Create `features/editor/devtools/TransformTracer.jsx` - Step-through view of WP→canonical→render pipeline
- [x] 0.5 Create `features/editor/devtools/ThemeTokenInspector.jsx` - Shows resolved theme tokens and CSS vars
- [x] 0.6 Create `features/editor/devtools/useDevToolsState.js` - Hook managing devtools state
- [x] 0.7 Create `features/editor/devtools/index.js` - Feature export barrel
- [x] 0.8 Integrate DevToolsPanel in `scenes/content/Scene.jsx`
- [x] 0.9 Create `test/editor.devtools.test.js` - Devtools state/helper tests

### Success Criteria

- [x] DevTools panel toggle works (Ctrl/Cmd+Shift+D)
- [x] Block tree shows WP → canonical mapping with lossiness indicators
- [x] Diagnostics panel shows transformation counts and issues
- [x] Transform tracer allows step-through debugging
- [x] Theme tokens panel shows resolved CSS variables
- [x] DevTools disabled in production build

### Design Note

**Keep DevTools thin** - it's a lens, not a new surface. ThemeTokenInspector should work with whatever tokens exist today (pre-Slice 5) and get richer once `renderShell` lands. Don't let this become an app inside an app.

### Files

| Action | Path |
|--------|------|
| CREATE | `apps/admin-web/src/features/editor/devtools/DevToolsPanel.jsx` |
| CREATE | `apps/admin-web/src/features/editor/devtools/BlockTreeInspector.jsx` |
| CREATE | `apps/admin-web/src/features/editor/devtools/DiagnosticsInspector.jsx` |
| CREATE | `apps/admin-web/src/features/editor/devtools/TransformTracer.jsx` |
| CREATE | `apps/admin-web/src/features/editor/devtools/ThemeTokenInspector.jsx` |
| CREATE | `apps/admin-web/src/features/editor/devtools/useDevToolsState.js` |
| CREATE | `apps/admin-web/src/features/editor/devtools/index.js` |
| MODIFY | `apps/admin-web/src/scenes/content/Scene.jsx` |
| CREATE | `apps/admin-web/test/editor.devtools.test.js` |

---

## Slice 1: Block Hardening

**Objective**: Tighten canonical validation/normalization for rich text, image captions, and embeds. Make "invalid but salvageable" states explicit in diagnostics.

**Estimate**: 4-6 hours

### Tasks

- [x] 1.1 Create `parity/sanitize.js` - HTML sanitizer module for rich text content
- [x] 1.2 Add embed validation policy in `mappings/coreContent.js` - provider whitelist, URL normalization
- [x] 1.3 Tighten caption handling in `mappings/coreImage.js` - sanitize HTML, add partial lossiness
- [x] 1.4 Wire sanitizer into `pipeline.js` with configurable policy
- [x] 1.5 Create `test/editor.parity.sanitize.test.js` - Golden fixtures for sanitization
- [x] 1.6 Add regression tests for caption persistence in `test/editor.parity.transforms.test.js`

### Success Criteria

- [x] Golden tests for 5+ sanitization scenarios
- [x] Embed provider whitelist with diagnostic output for unsupported providers
- [x] Caption persistence regression test passes
- [x] No breaking changes to existing transform tests

### Design Note

**Sanitiser as policy, not opinion**. `sanitize.js` and `embedPolicy.js` are versioned policy levers:
- Each policy module exports a `schemaVersion`
- Policy changes are documented in changelogs
- Future you shouldn't wonder why YouTube v3 stopped working when a regex changed

### Files

| Action | Path |
|--------|------|
| CREATE | `apps/admin-web/src/features/editor/parity/sanitize.js` |
| CREATE | `apps/admin-web/src/features/editor/parity/embedPolicy.js` |
| MODIFY | `apps/admin-web/src/features/editor/parity/mappings/coreContent.js` |
| MODIFY | `apps/admin-web/src/features/editor/parity/mappings/coreImage.js` |
| MODIFY | `apps/admin-web/src/features/editor/parity/pipeline.js` |
| CREATE | `apps/admin-web/test/editor.parity.sanitize.test.js` |
| MODIFY | `apps/admin-web/test/editor.parity.transforms.test.js` |

---

## Slice 2: Featured Image/Media Parity

**Objective**: Replace raw `featuredImageId` text input with media picker that uses block-parity media selection primitives.

**Estimate**: 2-3 hours

### Tasks

- [x] 2.1 Create `features/media/components/MediaPicker.jsx` - Reusable media picker component
- [x] 2.2 Replace text input in `ContentSettingsPanel.jsx` with MediaPicker
- [x] 2.3 Ensure media picker selection persists correctly in `useContentActions.js`
- [x] 2.4 Add interaction tests in `test/admin.shell.test.js`
- [x] 2.5 Add acceptance test in `test/api.flow.acceptance.test.js`

### Success Criteria

- [x] No raw ID input visible in UI
- [x] Media picker shows thumbnail preview of selected image
- [x] Clear/remove button to unset featured image
- [x] Acceptance test proves end-to-end flow works

### Files

| Action | Path |
|--------|------|
| CREATE | `apps/admin-web/src/features/media/components/MediaPicker.jsx` |
| MODIFY | `apps/admin-web/src/features/content/components/ContentSettingsPanel.jsx` |
| MODIFY | `apps/admin-web/src/scenes/content/Scene.jsx` |
| MODIFY | `apps/admin-web/src/scenes/root/Scene.jsx` |
| MODIFY | `apps/admin-web/src/features/content/hooks/useContentActions.js` |
| MODIFY | `apps/admin-web/test/admin.shell.test.js` |
| MODIFY | `apps/api/test/api.flow.acceptance.test.js` |

---

## Slice 3: Navigation Block Parity

**Objective**: Implement Gutenberg navigation block parity that references menu entities, with render-time resolution in preview/publish.

**Architectural Decision**: Keep menus as separate entities + add navigation block that references them (render-time resolution).

**Estimate**: 6-8 hours

### Tasks

- [x] 3.1 Create `parity/mappings/coreNavigation.js` - Import transform: `core/navigation` → `ep/navigation`
- [x] 3.2 Add renderer for navigation block in same file
- [x] 3.3 Add menu resolution to preview context in `packages/content/src/previews.js`
- [x] 3.4 Add menu resolution + revision snapshotting in `apps/api/src/orchestration/release-workflow.js`
- [x] 3.5 Add menu dependencies to `sourceRevisionSet` in `packages/domain/src/entities.js`
- [x] 3.6 Add golden tests in `test/editor.parity.transforms.test.js`
- [x] 3.7 Add acceptance test in `test/api.flow.acceptance.test.js`

### Canonical Node Design

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

### Success Criteria

- [x] `core/navigation` block imports to `ep/navigation` canonical node
- [x] Menu resolution works in preview and publish
- [x] Menu changes trigger new publish (deterministic releases)
- [x] Nested menu items render correctly
- [x] Internal links resolve to correct slugs

### Design Note

**Release determinism paranoia**: Every render-time resolution must answer "yes" to:
> "Is this resolution purely based on the frozen revision set for this release?"

If the answer is "it depends on live DB", you've mixed concerns. Menu resolution MUST use the snapshotted menu state from `sourceRevisionSet.menus`, not a live query.

### Files

| Action | Path |
|--------|------|
| CREATE | `apps/admin-web/src/features/editor/parity/mappings/coreNavigation.js` |
| MODIFY | `apps/admin-web/src/features/editor/parity/packs/core.js` |
| MODIFY | `packages/content/src/previews.js` |
| MODIFY | `apps/api/src/orchestration/release-workflow.js` |
| MODIFY | `packages/domain/src/entities.js` |
| MODIFY | `apps/admin-web/test/editor.parity.transforms.test.js` |
| MODIFY | `apps/api/test/api.flow.acceptance.test.js` |

---

## Slice 4: Templates/Patterns Lifecycle

**Objective**: Implement templates/patterns as document-backed registries to satisfy WP facade endpoints.

**Architectural Decision**: Document-backed registry - patterns and templates are `Document.type = 'pattern'` or `'template'`.

**Estimate**: 4-5 hours

### Tasks

- [x] 4.1 Add `pattern` and `template` to valid `Document.type` in `packages/domain/src/entities.js`
- [x] 4.2 Create `apps/api/src/adapters/http/controllers/content/patterns.js` - Pattern CRUD endpoints
- [x] 4.3 Wire facade to real queries in `apps/api/src/adapters/http/controllers/wp-core/meta.js`
- [x] 4.4 Create `packages/content/src/patterns.js` - Pattern domain logic
- [x] 4.5 Add tests in `test/api.wp-core.test.js`
- [x] 4.6 Update `docs/reference/wp-compatibility-profile.md`

### Success Criteria

- [x] Patterns insertable in Gutenberg editor
- [x] Pattern categories list populated
- [x] `/templates/lookup` returns matching template
- [x] All patterns have block JSON source of truth

### Design Note

**Don't overfit to WP**. The mental model is:
- **Behavior**: Patterns are blocks with metadata (document-backed, revisioned)
- **Facade**: WP sees pattern endpoints it recognizes

The facade serves compatibility. The model serves EP. Don't let WP's implementation details leak into domain logic.

### Files

| Action | Path |
|--------|------|
| MODIFY | `packages/domain/src/entities.js` |
| CREATE | `apps/api/src/adapters/http/controllers/content/patterns.js` |
| MODIFY | `apps/api/src/adapters/http/controllers/wp-core/meta.js` |
| CREATE | `packages/content/src/patterns.js` |
| MODIFY | `apps/api/test/api.wp-core.test.js` |
| MODIFY | `docs/reference/wp-compatibility-profile.md` |

---

## Slice 5: Theme Parity Completion

**Objective**: Apply one shared theme token contract across admin editor canvas, preview HTML, and publish HTML.

**Estimate**: 4-6 hours

### Tasks

- [x] 5.1 Create `packages/content/src/renderShell.js` - Unified HTML wrapper factory
- [x] 5.2 Create `apps/admin-web/src/features/theme/tokenExport.js` - Token-to-CSS-vars converter
- [x] 5.3 Use renderShell in `packages/content/src/previews.js`
- [x] 5.4 Use renderShell in `apps/api/src/orchestration/release-workflow.js`
- [x] 5.5 Inject site tokens into editor canvas in `features/editor/components/Canvas.jsx`
- [x] 5.6 Create `test/admin.theme.shell-parity.test.js` - Contract test

### Token Isolation

```text
Admin Chrome:    --ep-admin-*
Site Rendering:  --ep-site-*
```

### Success Criteria

- [x] Same theme tokens produce identical CSS vars in editor, preview, publish
- [x] Admin chrome tokens don't leak into content
- [x] Site tokens drive all three content targets
- [x] Block-level style refs resolve consistently

### Files

| Action | Path |
|--------|------|
| CREATE | `packages/content/src/renderShell.js` |
| CREATE | `apps/admin-web/src/features/theme/tokenExport.js` |
| MODIFY | `packages/content/src/previews.js` |
| MODIFY | `apps/api/src/orchestration/release-workflow.js` |
| MODIFY | `apps/admin-web/src/features/editor/components/Canvas.jsx` |
| CREATE | `apps/admin-web/test/admin.theme.shell-parity.test.js` |

---

## Slice 6: Parity Gap Closeout

**Objective**: Run systematic parity audit and close remaining gaps with test-first additions.

**Estimate**: 3-4 hours

### Tasks

- [x] 6.1 Create `scripts/parity-audit.js` - Run diagnostics on sample WP exports
- [x] 6.2 Update `docs/reference/wp-compatibility-profile.md` with findings
- [x] 6.3 Add mappings for identified high-priority blocks
- [x] 6.4 Add tests for each new mapping

### Audit Checklist

- [x] All core WP blocks have either transform or documented exclusion
- [x] All `partial` lossiness cases have documented reason
- [x] All `fallback` cases preserve sufficient data for future recovery
- [x] Diagnostics capture actionable information

### Files

| Action | Path |
|--------|------|
| CREATE | `scripts/parity-audit.js` |
| MODIFY | `docs/reference/wp-compatibility-profile.md` |
| MODIFY | `apps/admin-web/src/features/editor/parity/mappings/*.js` |
| MODIFY | `apps/admin-web/test/editor.parity.transforms.test.js` |

---

## Verification Gates

### Per-Slice Verification

```bash
bun run lint
bun run test:unit

# Targeted parity suites
bun test apps/admin-web/test/editor.parity.transforms.test.js
bun test apps/admin-web/test/admin.theme.editor-settings.test.js
bun test apps/api/test/api.flow.acceptance.test.js
bun test apps/api/test/api.wp-core.test.js
```

### Phase Close Gate

```bash
bun run test:coverage       # Maintain >95%
bun run check:boundaries    # No CF imports outside adapters

# Manual smoke test
# 1. Authoring loop: create doc → edit → preview → publish
# 2. Media flow: upload → select featured → publish → verify
# 3. Navigation: create menu → add nav block → publish → verify
# 4. Templates: insert pattern → publish → verify
# 5. DevTools: verify all inspectors work
```

---

## Watch Points

1. **Deterministic Releases**: Any render-time lookup (menus, templates, theme tokens) must be resolvable from the publish job's frozen revision set.

2. **Boundary Discipline**: Keep WP/Gutenberg-specific facade logic in admin/API layers. Domain sees only ports + pure models.

3. **Embed Validation Config**: Prefer versioned, stored policy over env-only config.

4. **Schema Evolution**: Resist schema v2 until Slice 6 data shows exact failure modes.

5. **Plugin System Dogfooding**: These slices are implicitly "core plugins":
   - DevTools = first-party admin extension pattern
   - Navigation/Patterns = suite behaviors (multi-entity coordination)
   - When `definePlugin()` is formalized, these become reference implementations of "powerful but safe".

---

## Escalation Triggers

| Trigger | Current Plan | Escalation |
|---------|--------------|------------|
| Per-route template resolution | Slug lookup only | Revisit with routing engine |
| Rich inline navigation editing | Reference-only nav blocks | Consider inline block mapping |
| Environment-specific embed policies | Static whitelist | Add stored policy document |

---

## Completion Log

<!-- Add entries as slices complete -->

| Date | Slice | Notes | Commit |
|------|-------|-------|--------|
| 2026-02-17 | 0 | DevTools integrated into content scene, editor barrel export added, state helpers + tests added, lint/test/build verified | |
| 2026-02-17 | 1 | Added rich-text sanitizer + embed policy modules, hardened image/embed transforms, surfaced import diagnostics, and added sanitize/caption regression tests | |
| 2026-02-17 | 2 | Replaced featured-image raw-id workflow with media picker UX and persisted featured image metadata in end-to-end flows | |
| 2026-02-17 | 3 | Landed navigation block parity with menu snapshot resolution in preview/publish and deterministic release behavior | |
| 2026-02-17 | 4 | Added document-backed pattern/template lifecycle and wired wp-core facade endpoints + tests | |
| 2026-02-17 | 5 | Unified theme shell/token contract across editor, preview, and publish targets with parity tests | |
| 2026-03-01 | 6 | Closed parity-gap audit loop: refreshed compatibility profile, completed high-priority mapping/tests, and finalized audit checklist | 65cfcfc |

---

## References

- `PLANNING.md` (repository root) - Master phase tracker
- [Block Content Model](/reference/content-model-v2)
- [WP Compatibility Profile](/reference/wp-compatibility-profile)
- [Frontend Slice Architecture](/architecture/frontend-slice-structure)
