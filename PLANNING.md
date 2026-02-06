# Phase Tracker

This file turns the architectural story from `idea.md` into concrete phases with whitespace for completion tracking and dependency notes.

## Phase 0 – Contracts & Platform Skeleton (complete)
- [x] Define ports (`packages/ports/src/index.js`) and domain invariants (`packages/domain/src`).
- [x] Build canonical API scaffolding with edge runtime helpers (`apps/api-edge/src/{http,auth,app}.js`).
- [x] In-memory platform + boundary tests (`packages/testing/src`).
- [x] Contract validator (`packages/contracts/src/index.js`) covering required response keys (Phase 0 placeholder).
- [x] Reference Cloudflare adapter stub (`packages/adapters-cloudflare/src/index.js`).
- [x] Publish + release invariants (`packages/publish/src/publisher.js`).

## Phase 1 – Content + Admin Integration (in progress/outstanding)
- [ ] Harden canonical SDK client (`packages/sdk/src/client.js`) and connect to `apps/admin-web/src/gutenberg-integration.js`.
- [ ] Wire Gutenberg UI (`apps/admin-web`) to use `@wordpress/block-editor` with `@wordpress/api-fetch` middlewares and canonical stores.
- [ ] Ensure `apps/api-edge` implements auth, docs, media, publish routes plus preview/tokenized URL behavior (`apps/api-edge/src/app.js`).
- [ ] Add targeted tests for document/media/publish flows (already in `packages/testing/test`).
- [ ] Document open work: mention `packages/contracts` is a key validator until replaced with OpenAPI.

## Phase 2 – Publishing + Delivery
- [ ] Implement release activation history + pointer logic (currently tracked in `packages/testing/src/inMemoryPlatform.js`).
- [ ] Build real artifact generation + release manifest storage (adapt `packages/adapters-cloudflare` to D1/R2/KV).
- [ ] Add preview-release token enforcement + private read caching logic (already exercised by tests; document requirements in this tracker).
- [ ] Expand `packages/publish` to emit provenance data (`sourceRevisionId`, `publishedBy`, `schemaVersion`, hash list).

## Phase 3 – WP Compatibility Layer
- [ ] Layer in a WP REST façade and `wp.*` compatibility runtime adapters (separate package until API stable).
- [ ] Add compatibility stores hooking into `@wordpress/core-data` only where a screen demands it.
- [ ] Swap the placeholder contracts file for true OpenAPI/JSON Schema definitions and regenerate the SDK.

## Dependencies & Notes
- Ports + Domain must not depend on infrastructure; only `packages/adapters-cloudflare` uses Cloudflare-specific APIs. (`scripts/check-boundaries.js` enforces this.)
- Canonical API tests currently validate required keys only. Replace `packages/contracts` with full schema before releasing Phase 3.
- Bun tooling now drives installs/tests; `bun.lock` (Bun’s lockfile) keeps dependencies consistent across workspaces.
- Keep `PLANNING.md` updated as phases complete: mark boxes, add dates/owners, link follow-up issues.
