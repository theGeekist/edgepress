# Phase Tracker

This file turns the architectural story from `idea.md` into concrete phases with whitespace for completion tracking and dependency notes.

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

## Coverage Watch
- Baseline (2026-02-06 via `bun run test:coverage`): `89.79%` lines, `89.14%` funcs.
- Delta (2026-02-06 after Phase 1 coverage pass): `94.22%` lines, `93.90%` funcs.
- Priority hotspot 1: `packages/testing/src/inMemoryPlatform.js` (`95.87%` lines, `94.44%` funcs) with remaining branches tied to richer revision/publish state mutation paths.
- Priority hotspot 2: `apps/admin-web/src/editor-shell.js` (`89.66%` lines) where document update/preview branches remain.
- Priority hotspot 3: `apps/api-edge/src/app.js` (`93.18%` lines) for endpoint-level negative branches and rare error guards.
- Process: run `bun run test:coverage` at the end of each phase slice and append a one-line delta note here.
