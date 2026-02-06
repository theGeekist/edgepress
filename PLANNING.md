# Phase Tracker

This file turns the architectural story from `idea.md` into concrete phases with whitespace for completion tracking and dependency notes.

## Plan Alignment (Original + Revised)
- Canonical baseline: `idea.md` plus the revised edge-portable constraints are both authoritative.
- Non-negotiable boundary: `apps/api-edge` may only depend on runtime/storage ports; Cloudflare-specific bindings stay only in `packages/adapters-cloudflare`.
- Runtime portability rule: edge runtime is an adapter/DI concern, not the product architecture.
- API invariants in force: two-phase media (`init` + `finalize`), preview returns `{ previewUrl, expiresAt, releaseLikeRef }`, canonical `{ error: { code, message } }` envelope.
- Release invariants target: immutable manifest, active-release pointer switching, release history retained.
- Explicitly deferred: collaborative editing/presence, server-side runtime block rendering, broad plugin compatibility, multi-tenant isolation.

## Phase 0 – Contracts & Platform Skeleton (complete)
- [x] Define ports (`packages/ports/src/index.js`) and domain invariants (`packages/domain/src`).
- [x] Build canonical API scaffolding with edge runtime helpers (`apps/api-edge/src/{http,auth,app}.js`).
- [x] In-memory platform + boundary tests (`packages/testing/src`).
- [x] Contract validator (`packages/contracts/src/index.js`) covering required response keys (Phase 0 placeholder).
- [x] Reference Cloudflare adapter stub (`packages/adapters-cloudflare/src/index.js`).
- [x] Publish + release invariants (`packages/publish/src/publisher.js`).

## Phase 1 – Content + Admin Integration (complete)
- [x] Harden canonical SDK client (`packages/sdk/src/client.js`) and connect to `apps/admin-web/src/gutenberg-integration.js`.  
  Completed: structured `ApiRequestError`, single-flight refresh retry, auth-failure callback, and SDK/admin-shell integration tests for token rotation/error propagation.
- [x] Wire Gutenberg UI (`apps/admin-web`) to use `@wordpress/block-editor` with `@wordpress/api-fetch` middlewares and canonical stores.  
  Completed: Vite+React host with RN-web primitives, modular `components/ui` + `features/*` state organization, canonical SDK session shell, and `api-fetch` auth/refresh/trace middlewares wired to the same refresh path; no `@wordpress/core-data` CRUD in MVP flow. Added deterministic registration-order coverage plus real `@wordpress/api-fetch` chain tests to verify refresh-retry uses updated bearer token under WP middleware semantics.
- [x] Ensure `apps/api-edge` implements auth, docs, media, publish routes plus preview/tokenized URL behavior (`apps/api-edge/src/app.js`).  
  Added preview TTL runtime controls, canonical error envelope handling, preview expiry responses, and base64url helpers behind the runtime port.
- [x] Add targeted tests for document/media/publish flows (already in `packages/testing/test`).  
  Includes negative-path checks for auth refresh/logout, media finalize token/not-found, release activation/publish job errors, preview TTL parsing clamp/fallback, and forms rate limiting (`packages/testing/test/api.behavior.test.js`).
- [x] Document open work: mention `packages/contracts` is a key validator until replaced with OpenAPI.

## Cross-Cutting Foundation (complete)
- [x] Bun-first workspace baseline + lockfile consistency (`package.json`, `bun.lock`, `bunfig.toml`).
- [x] Lint and static-analysis baseline with Sonar rules (`eslint.config.mjs`, `sonar-project.properties`).
- [x] Gutenberg context guard script for upstream-awareness before integration changes (`scripts/check-gutenberg-context.js`).
- [x] Test/lint scope hygiene to avoid vendor noise and cache churn (`.gitignore`, ESLint ignore patterns).
- [x] Real `@wordpress/api-fetch` middleware semantics verified in tests (`packages/testing/test/admin.apifetch.test.js`).

## Completion Log
- [x] `6c197c8`/`d31c584`: runtime-port base64url and preview TTL hardening (edge portability and safer TTL parsing).
- [x] `47ba245`: coverage/test planning baseline and Bun test scoping.
- [x] `805eac4`: SDK hardening + lint/Sonar + admin shell validation tests.
- [x] `479eed7` (+ current working tree): admin-web modular shell, apiFetch root/proxy posture, CORS dev path, and real middleware-chain retry verification.

## Phase 2 – Publishing + Delivery
- [x] Implement release activation history + pointer logic (currently tracked in `packages/testing/src/inMemoryPlatform.js`).  
  Completed (reference-adapter scope): release history is append-only with explicit `manifest_written` and `activated` events; active release switching records `previousReleaseId`; activating the already active release is idempotent (no duplicate event); covered by `packages/testing/test/release.preview.private.test.js`.
- [ ] Build real artifact generation + release manifest storage (adapt `packages/adapters-cloudflare` to D1/R2/KV).
  Increment complete: publish now writes artifacts through mandatory `ReleaseStorePort.writeArtifact` (fallback removed to keep contract strict), and tests verify artifact events + persisted blob refs (`packages/testing/test/release.preview.private.test.js`, `packages/testing/test/publisher.test.js`).
  Increment complete: Cloudflare reference adapter now explicitly implements `releaseStore.writeArtifact` and has dedicated adapter conformance coverage (`packages/adapters-cloudflare/src/index.js`, `packages/testing/test/adapters.boundaries.test.js`).
  Increment complete: Cloudflare reference adapter now owns release-state behavior (manifest storage, active pointer switching, release history events) rather than delegating release state to in-memory internals; covered in adapter conformance tests.
  Increment complete: Cloudflare reference adapter is now binding-aware for `R2_BUCKET` and `KV` paths (artifacts/blob reads, cache get/set/del, release manifests/pointer/history), with explicit tests for both binding-backed and fallback-local behavior.
  Increment complete: installed Cloudflare tooling/types (`wrangler`, `@cloudflare/workers-types`), added `wrangler.toml`, and moved Worker entrypoint to `packages/adapters-cloudflare/src/worker.js` to preserve boundary rules while enabling real Workers wiring.
  Increment complete: hardened Cloudflare adapter correctness details: removed Node `Buffer` dependency in blob decoding, added KV manifest pagination cursor handling, and removed `this` coupling in `activateRelease`; adapter conformance tests now cover these paths.
- [ ] Add preview-release token enforcement + private read caching logic (already exercised by tests; document requirements in this tracker).
- [ ] Expand `packages/publish` to emit provenance data (`sourceRevisionId`, `publishedBy`, `schemaVersion`, hash list).
- [ ] Add release manifest hash set and artifact provenance wiring (`createdAt`, `sourceRevisionId`/revision set, `publishedBy`) with immutability tests.

## Phase 3 – WP Compatibility Layer
- [ ] Layer in a WP REST façade and `wp.*` compatibility runtime adapters (separate package until API stable).
- [ ] Add compatibility stores hooking into `@wordpress/core-data` only where a screen demands it.
- [ ] Swap the placeholder contracts file for true OpenAPI/JSON Schema definitions and regenerate the SDK.

## Phase 3b – Builder UX + Agnostic Block Baseline
- [ ] Define a portability policy for blocks: each supported block declares `web` and `rn` support; unknown blocks must round-trip and render safe placeholders.
- [ ] Ship an agnostic layout kit as first-class blocks (`Section`, `Container`, `Stack`, `Row/Grid`) to reduce `Group`/`Columns` nesting friction.
- [ ] Standardize responsive attributes (`responsive.display`, `responsive.spacing`, `responsive.typography`, `responsive.layout`) and host inspector controls.
- [ ] Add token-first design-system surface (typography, spacing, colors, radii) mapped to deterministic CSS variables/style tokens.
- [ ] Make patterns/templates the default authoring path: curated section packs, page wizard, save-as-pattern with versioned shared library.
- [ ] Add site-structure layer above documents: page tree, slug/redirect management, template assignment, navigation manifest output.
- [ ] Evolve media UX beyond upload endpoint parity: collections/tags/alt-text workflow, dedupe hooks, stable asset URLs across releases.
- [ ] Keep preview “real” to publish shell: tokenized preview routes rendered through the same template/style pipeline as publish.

## Dependencies & Notes
- Ports + Domain must not depend on infrastructure; only `packages/adapters-cloudflare` uses Cloudflare-specific APIs. (`scripts/check-boundaries.js` enforces this.)
- Canonical API tests currently validate required keys only. Replace `packages/contracts` with full schema before releasing Phase 3.
- Current docs (`idea.md`) imply Gutenberg usability improvements, but execution tracking now lives in `Phase 3b` above for explicit ownership.
- Concurrency caveat: KV-backed pointer/history updates in the reference Cloudflare adapter are not strongly atomic under concurrent writers; use D1 transaction boundaries or a Durable Object single-writer path when moving from reference to production guarantees.
- Bun tooling now drives installs/tests; `bun.lock` (Bun’s lockfile) keeps dependencies consistent across workspaces.
- Coverage note: `packages/testing/src/inMemoryPlatform.js` still has intentionally uncovered branches for adapter fallback/error paths. Keep adding targeted tests as runtime and adapter behaviors are finalized.
- Keep `PLANNING.md` updated as phases complete: mark boxes, add dates/owners, link follow-up issues.
- Context guardrail: run `bun run context:gutenberg` before Gutenberg integration changes to pin branch/commit and verify key docs/package surfaces are still present.

## Coverage Watch
- Baseline (2026-02-06 via `bun run test:coverage`): `89.79%` lines, `89.14%` funcs.
- Delta (2026-02-06 after Phase 1 coverage pass): `94.22%` lines, `93.90%` funcs.
- Delta (2026-02-06 after Phase 2 item 1): `94.32%` lines, `94.03%` funcs.
- Delta (2026-02-06 after Phase 2 item 2 increment): `94.34%` lines, `94.04%` funcs.
- Delta (2026-02-06 after Cloudflare writeArtifact increment): `94.34%` lines, `94.04%` funcs.
- Delta (2026-02-06 after Cloudflare release-state increment): `94.34%` lines, `94.04%` funcs.
- Delta (2026-02-06 after binding-aware Cloudflare adapter increment): `94.23%` lines, `94.17%` funcs.
- Delta (2026-02-06 after wrangler + typed CF worker increment): `94.46%` lines, `94.41%` funcs.
- Delta (2026-02-06 after adapter hardening fixes): `94.48%` lines, `94.41%` funcs.
- Priority hotspot 1: `apps/admin-web/src/editor-shell.js` (`89.66%` lines) where document update/preview branches remain.
- Priority hotspot 2: `apps/api-edge/src/app.js` (`93.18%` lines) for endpoint-level negative branches and rare error guards.
- Priority hotspot 3: `packages/testing/src/inMemoryPlatform.js` (`97.38%` lines, `96.23%` funcs) with remaining branches tied to deeper revision/list edge paths.
- Process: run `bun run test:coverage` at the end of each phase slice and append a one-line delta note here.
