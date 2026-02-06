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
- [x] Harden canonical SDK client (`packages/sdk/src/client.js`) and connect to `apps/admin-web/src/gutenberg-integration.js`.  
  Completed: structured `ApiRequestError`, single-flight refresh retry, auth-failure callback, and SDK/admin-shell integration tests for token rotation/error propagation.
- [ ] Wire Gutenberg UI (`apps/admin-web`) to use `@wordpress/block-editor` with `@wordpress/api-fetch` middlewares and canonical stores.  
  Current baseline: minimal runnable admin shell is wired to canonical SDK stores (`apps/admin-web/src/editor-shell.js`) without `@wordpress/core-data` CRUD.
- [x] Ensure `apps/api-edge` implements auth, docs, media, publish routes plus preview/tokenized URL behavior (`apps/api-edge/src/app.js`).  
  Added preview TTL runtime controls, canonical error envelope handling, preview expiry responses, and base64url helpers behind the runtime port.
- [x] Add targeted tests for document/media/publish flows (already in `packages/testing/test`).  
  Includes negative-path checks for auth refresh/logout, media finalize token/not-found, release activation/publish job errors, preview TTL parsing clamp/fallback, and forms rate limiting (`packages/testing/test/api.behavior.test.js`).
- [x] Document open work: mention `packages/contracts` is a key validator until replaced with OpenAPI.

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
- Coverage note: `packages/testing/src/inMemoryPlatform.js` still has intentionally uncovered branches for adapter fallback/error paths. Keep adding targeted tests as runtime and adapter behaviors are finalized.
- Keep `PLANNING.md` updated as phases complete: mark boxes, add dates/owners, link follow-up issues.
- Context guardrail: run `bun run context:gutenberg` before Gutenberg integration changes to pin branch/commit and verify key docs/package surfaces are still present.
