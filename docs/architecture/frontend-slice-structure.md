---
title: Frontend Slice Structure
---

# Frontend Slice Structure

This document defines how frontend code is organized so folders can be extracted into standalone packages with minimal rewrite.

## Contracts

### `components/*`
- Single export per file.
- No feature workflow state.
- May be UI, pure function, or pure utility object.
- Reusable across scenes/features.

### `hooks/*`
- Global/shared hooks only.
- Cross-feature concerns (theme/session/shared API helpers).
- Do not place feature-local workflow hooks here.
- If a concern has no dedicated feature UI yet (example: temporary auth state hook), keep it in top-level `hooks/*` until that feature exists.

### `features/*`
- Standalone feature modules.
- Can include local `components/*` and `hooks/*`.
- Own internal state and child-route logic.
- Export public surface via `features/<feature>/index.js`.
- `index.js` is the only public import contract for the feature.

### `scenes/web`, `scenes/native`
- Shell pages and top-level route composition.
- Compose one or more features with layout.
- Keep top-level orchestration in scenes, not inside leaf components.
- Prefer one scene file per top-level route and keep parent scenes thin (route selection + shell layout only).

## Packaging principle

Design each `components/*`, `hooks/*`, `features/*`, and `scenes/*` subtree as if it may receive its own `package.json` later.

## Practical guidance

1. If code has feature-specific state/behavior, it belongs under `features/<name>`.
2. If code stitches app sections/routes, it belongs under `scenes/*`.
3. Split each top-level route into a dedicated scene module (for example `scenes/web/routes/ContentScene.jsx`).
4. If code is generic/presentational and stateless, keep it in global `components/*`.
5. Keep imports directional: scenes -> features -> components/hooks.
6. Import features only from feature root paths (for example `from '@features/editor'`), never from feature internals like `features/editor/hooks/*` or `features/editor/components/*`.
