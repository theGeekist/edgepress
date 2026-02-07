# Phase Tracker

This file turns the architectural story from `idea.md` into concrete phases with whitespace for completion tracking and dependency notes.

## Plan Alignment (Original + Revised)
- Canonical baseline: `idea.md` plus the revised edge-portable constraints are both authoritative.
- Non-negotiable boundary: `apps/api-edge` may only depend on runtime/storage ports; Cloudflare-specific bindings stay only in `packages/adapters-cloudflare`.
- Runtime portability rule: edge runtime is an adapter/DI concern, not the product architecture.
- API invariants in force: two-phase media (`init` + `finalize`), preview returns `{ previewUrl, expiresAt, releaseLikeRef }`, canonical `{ error: { code, message } }` envelope.
- Release invariants target: immutable manifest, active-release pointer switching, release history retained.
- Explicitly deferred: collaborative editing/presence, server-side runtime block rendering, broad plugin compatibility, multi-tenant isolation.

## DI / Adapter Milestone Status
- [x] Composition root exists: `packages/adapters-cloudflare/src/worker.js` builds platform and injects it into `createApiHandler`.
- [x] Stable port seams are in use (`runtime`, `store`, `releaseStore`, `blobStore`, `cacheStore`, `previewStore`).
- [x] Boundary enforcement exists (`scripts/check-boundaries.js`) to prevent infra leakage outside adapters.
- [x] Durable Cloudflare store adapter landed for core mutable state (D1-backed users/tokens/documents/revisions/media/publish jobs/forms/previews).
- [ ] Explicit `createPlatform()` contract document is missing (required/optional ports + invariants + error semantics).
- [ ] Adapter conformance matrix doc is missing (in-memory vs Cloudflare parity table and expected degradations).

## Phase 0 – Tooling & Guardrails (complete)
- [x] Bun workspace baseline and lockfile consistency (`package.json`, `bun.lock`, `bunfig.toml`).
- [x] Lint/static-analysis baseline and boundary guard (`eslint.config.mjs`, `scripts/check-boundaries.js`).
- [x] Coverage gating wired into `test:coverage` with helper exclusions.

Exit criteria:
- `bun run lint` and `bun run test:coverage` are green on main branch.
- Boundary script prevents Cloudflare API leakage outside `packages/adapters-cloudflare`.

## Phase 1 – Core Contracts & In-Memory Platform (complete)
- [x] Ports and domain invariants (`packages/ports`, `packages/domain`).
- [x] Canonical edge API skeleton (`apps/api-edge/src/{http,auth,app}.js`).
- [x] In-memory platform for deterministic behaviour tests (`packages/testing/src/inMemoryPlatform.js`).
- [x] Publish/release invariants in core publisher (`packages/publish/src/publisher.js`).

Exit criteria:
- Canonical API works end-to-end entirely against in-memory platform.
- Contract tests validate key envelope and route invariants.

## Phase 2 – Admin Client Integration (complete)
- [x] Canonical SDK hardening (`packages/sdk/src/client.js`).
- [x] Gutenberg admin shell integration with `@wordpress/api-fetch` middlewares (`apps/admin-web`).
- [x] Admin auth/refresh and middleware-order tests (`packages/testing/test/admin.*.test.js`).

Exit criteria:
- Admin shell runs without direct dependency on WordPress server APIs.
- Token refresh and error propagation are deterministic in tests.

## Phase 3 – Release Model & Private Delivery Semantics (complete)
- [x] Immutable manifests + active release pointer + append-only release history.
- [x] Artifact writing through `releaseStore.writeArtifact`.
- [x] Preview signature enforcement and private cache scope isolation.
- [x] Provenance and hash model (`sourceRevisionSet`, `releaseHash`, `contentHash`).

Exit criteria:
- Publish output is release-addressable and rollback-safe.
- Preview/private semantics are enforced by tests (signature, expiry, scoped cache keys).

## Phase 4 – Cloudflare Adapter Baseline (complete)
- [x] Worker composition root in adapter package (`packages/adapters-cloudflare/src/worker.js`).
- [x] Binding-aware KV/R2 adapter behavior with local fallbacks.
- [x] Wrangler local/deployed smoke scripts for the core API path.

Exit criteria:
- Same API handler runs with in-memory and Cloudflare-composed platforms.
- Local and deployed smoke runs cover auth -> docs -> publish -> private -> preview -> releases.

## Phase 5 – Durable Cloudflare Data Plane (complete)
- [x] D1-backed release state (manifests, pointer, history) with schema bootstrapping.
- [x] D1-backed core app state (users/tokens/documents/revisions/media/jobs/forms/previews).
- [x] D1 release write hardening (ordering semantics + atomic batch path + migration/backfill safeguards).

Exit criteria:
- Cloudflare adapter does not depend on isolate memory for core mutable state.
- Cross-instance behavior remains consistent for auth/docs/publish/preview flows.

## Phase 6 – Security & Env Hygiene (complete)
- [x] Fail-closed HMAC behavior when required keys are missing.
- [x] No default admin auto-seeding without explicit bootstrap env.
- [x] Wrangler binding hygiene documented and wired for local/deployed usage.

Exit criteria:
- Secrets are required by runtime behavior, not optional fallbacks.
- Fresh deployment is not accessible with predictable default credentials.

## Phase 7 – Editor-to-Publish Loop Lock
- [x] Deliver one clean end-to-end authoring loop in Admin UI: edit -> autosave revision -> signed preview -> publish -> activate -> private delivery read.
- [x] Add explicit acceptance tests for this loop in in-memory + wrangler-local + deployed smoke contexts.
- [x] Remove any remaining manual/implicit steps required to activate and verify a release.
- `Increment complete`: added canonical in-memory loop coverage (`packages/testing/test/editor.loop.e2e.test.js`) and expanded wrangler smoke flows (`scripts/test-wrangler-local.js`, `scripts/test-wrangler-deployed.js`) with update/revision checks, second publish, explicit activation, and active-release private read assertions.
- `Increment complete`: admin shell and UI now expose loop operations (revisions, preview, publish, activate release, private-read verification) with a dedicated loop status panel (`apps/admin-web/src/editor-shell.js`, `apps/admin-web/src/gutenberg-integration.js`, `apps/admin-web/src/app/App.jsx`, `apps/admin-web/src/features/releases/useReleaseLoopState.js`) and shell-level loop test coverage (`packages/testing/test/admin.shell.test.js`).

Exit criteria:
- A single operator path exists for authoring-to-delivery with no side scripts.
- The loop passes in all three runtime targets with the same pass/fail assertions.

## Phase 8 – Internal Hooks + API Hardening
- [x] Add WP-compatible internal hook surface at domain boundaries via `@wordpress/hooks` (`addAction`, `doAction`, `addFilter`, `applyFilters`) with namespaced `edgepress.*` lifecycle hooks.
- [x] Add synchronous `beforePublish` policy/transform hook via `applyFilters('edgepress.publish.provenance', payload)`.
- [x] Enforce sync-by-contract hook execution semantics (no async/waitUntil action dispatch).
- [x] Add server-side JS hook bootstrap registration at composition roots (local server + Cloudflare worker) so `addAction`/`addFilter` are available on both client and server runtimes.
- [ ] Normalize API versioning/envelope/pagination rules and document them as stable contract behavior. (tracked for close in Phase 14)
- [ ] Add webhook delivery surface for publish completed + release activated events. (tracked for close in Phase 14)
- `Increment complete`: replaced bespoke lifecycle hooks with canonical `@wordpress/hooks` semantics (`addAction`, `doAction`, `addFilter`, `applyFilters`) and added server-side JS bootstrap registration in composition roots (`apps/api-edge/src/hooks-bootstrap.js`, `apps/api-edge/src/server.js`, `packages/adapters-cloudflare/src/worker.js`).
- Note: API runtime now requires a full WP-compatible hook registry surface when `platform.hooks` is supplied; partial custom registries intentionally fall back to shared `@wordpress/hooks`.
- Trust boundary note: published HTML intentionally renders author-provided block/content HTML; sanitization is not performed in the publisher and must be enforced at authoring/import boundaries when untrusted inputs are introduced.
- Hook bootstrap note: failing registrars are retried on subsequent attach attempts, with failure logging rate-limited to first failure per registry/registrar pair.

Exit criteria:
- Domain actions can be extended without direct coupling to route handlers.
- API behaviour is explicitly versioned and consistent across all endpoints.

## Phase 9 – Block Content Model Decision + Contract
- [x] Decide and document source-of-truth strategy: **Option A** (block JSON canonical, publish renders HTML).
- [x] Add canonical fields to document/revision model for block JSON (`blocks`) and keep derived HTML as publish artifact output only.
- [x] Update editor write/autosave flows to persist validated block JSON, not HTML strings as source-of-truth.
- [x] Update publish pipeline to render HTML deterministically from stored block JSON and include block-hash provenance in manifest metadata.
- [x] Define block JSON validation and serialization invariants (schema versioning, unknown block retention, deterministic ordering).
- [x] Add migration notes and compatibility behavior for legacy HTML-first revisions (import/parse fallback rules).
- [x] Add regression coverage for round-trip: block JSON -> preview/publish HTML -> release artifact -> re-edit from JSON.
- `Increment complete`: documented canonical block model + legacy HTML migration/compat behavior (`docs/architecture/block-content-model.md`) and linked it into architecture docs/navigation.

Exit criteria:
- Content canonical form is explicit and test-backed.
- Publish/revision/preview paths use one coherent content model.

## Phase Gate Clarification (2026-02-06)
- Phase 9 is complete by scope: block JSON is the canonical content model and publish/preview/revision paths are aligned to it.
- Current branch `phase-10-admin-ui-foundations` is correct: we are in Phase 10 work.
- Open items in Phase 8 remain valid cross-cutting follow-ups and do not invalidate Phase 9 completion.

## Phase 10 – Admin UX Foundations (complete)
- [x] Ship Admin IA baseline (Dashboard/Content/Media/Appearance/Settings nav + Content subviews Pages/Posts/Drafts/Published).
- [x] Keep list/table management separate from authoring workspace (WordPress-style flow: list -> edit/new).
- [x] Ship editor workspace shell parity (left admin nav, center Gutenberg editor, right publishing/settings metaboxes).
- [x] Collapse user-facing publish semantics to one primary action (`Publish`) while keeping release activation internal/transparent.
- [x] Normalize user language and feedback (`Save draft`, `Preview`, `Publish`, `View live`) and hide internal IDs from primary flows.
- [x] Ship revisions timeline UX with human-readable events.
- [x] Land WordPress-like admin shell layout strategy and component boundaries (`docs/architecture/admin-ui-strategy.md`).
- `Increment complete`: admin shell now includes section navigation and a type/status-aware Content rail with search/filters, plus a right-rail Post Settings panel (permalink/excerpt/date/featured-image URL as transitional metadata) wired alongside publishing actions (`apps/admin-web/src/features/layout/*`, `apps/admin-web/src/features/documents/useDocumentsState.js`, `apps/admin-web/src/app/useAdminAppController.js`).
- `Increment complete`: Content now defaults to a first-class list/table screen with row selection and bulk status actions; `Edit`/`New` transitions into a separate authoring workspace while the left rail remains global admin navigation (`apps/admin-web/src/features/layout/ContentListTable.jsx`, `apps/admin-web/src/features/layout/AdminSidebarNav.jsx`, `apps/admin-web/src/features/layout/AdminWorkspace.jsx`).

Exit criteria:
- Admin experience follows WordPress mental model for list management and authoring flow.
- Publish workflow is user-simple while preserving internal release guarantees.
- UI structure follows declared component contract (`app` orchestration + `features/layout` shell + feature modules).
- `Phase complete (2026-02-06)`: foundational admin IA/editor UX slice closed on branch `phase-10-admin-ui-foundations`; permalink canonicalization, navigation/media, and theme-system work moved to Phases 11-13.

## Phase 11 – Permalink and Route Substrate (priority next)
- [x] Make permalink/slug canonical in stored document model (not local-only UI metadata).
- [x] Define unique slug and collision policy by content type/status.
- [x] Define canonical URI strategy and publish artifact route mapping.
- [x] Wire private/live read resolution by canonical route identity, not implicit document-id assumptions.
- [x] Add migration strategy for existing documents and legacy route assumptions.
- [x] Add acceptance tests for route edits across draft -> preview -> publish -> live flows.
- `Increment complete (2026-02-07)`: canonical slug persistence and uniqueness now enforced in document routes, publish artifact routes resolve by slug with doc-id fallback compatibility for private reads, and admin UI preserves in-editor slug edits (`apps/api-edge/src/features/document-routes.js`, `apps/api-edge/src/features/private-routes.js`, `packages/publish/src/publisher.js`, `apps/admin-web/src/features/documents/useDocumentsState.js`).
- `Increment complete (2026-02-07)`: added acceptance coverage for slug route edits across republish + activation, including stable doc-id private-read compatibility (`packages/testing/test/api.behavior.test.js`).

Exit criteria:
- Permalinks are first-class persisted data and deterministically map to delivery routes.
- Preview/private/live behavior remains stable across route changes and republish cycles.

## Phase 12 – Navigation and Media Foundations (complete)
- [x] Add navigation domain model and API (menus/items/order/target route).
- [x] Defer Gutenberg navigation block parity and menu rendering semantics to block-parity phase (no standalone menu publish-artifact pipeline).
- [x] Implement media domain metadata parity (`alt`, `caption`, `description`, featured image linkage).
- [x] Implement media upload/browse workflow substrate in admin/API (selection UX and full block parity tracked in Phase 12B).
- `Increment complete (2026-02-07)`: canonical navigation menu substrate is live via API/store/tests (`apps/api-edge/src/features/navigation-routes.js`, `packages/testing/src/inMemoryPlatform.js`, `packages/adapters-cloudflare/src/{app-store.js,d1-sql.js}`, `packages/testing/test/{api.behavior.test.js,api.contract.test.js,sdk.client.test.js,admin.shell.test.js}`).
- `Increment complete (2026-02-07)`: canonical media substrate is live across API/store/admin for upload, list/edit/delete, and featured-image/media-id linkage into document save + publish-time media URL resolution (`apps/api-edge/src/features/media-routes.js`, `apps/admin-web/src/features/media/*`, `apps/admin-web/src/features/content/*`, `packages/publish/src/publisher.js`, `packages/testing/test/{api.behavior.test.js,publisher.test.js}`).

Exit criteria:
- Navigation and media are first-class data models with stable API/store contracts and admin substrate flows.
- Block-level authoring/render parity work is explicitly tracked in Phase 12B.

## Phase 12B – Core Blocks and Gutenberg Parity (next)
- [ ] Port/reuse core WordPress blocks and primitives needed for parity-first authoring.
- [ ] Implement foundational block set end-to-end: rich text, image+caption, embed (with embed validation policy).
- [ ] Implement Gutenberg navigation block parity and menu rendering semantics (no bespoke parallel pipeline).
- [ ] Replace transitional featured-image/media-id controls with block-parity media selection primitives.
- [ ] Ensure media/nav block flows survive revision -> preview -> publish -> live without special cases.
- [ ] Introduce `theme.json` as first-class design token source for editor/preview/site.
- [ ] Define token resolution model and fallback policy (theme defaults vs content overrides).
- [ ] Add templates/patterns strategy and lifecycle (registration, versioning, migration).
- [ ] Apply theme parity across admin editing chrome, preview skin, and published output.
- [ ] Define WP compatibility profile scope needed for block/editor parity (`wp.*` guaranteed/partial/out-of-scope).

Exit criteria:
- Core block authoring uses WP-compatible primitives rather than custom transitional controls.
- Navigation/media behaviors are owned by block parity and produce deterministic publish/live output.
- Theme tokens/templates and block primitives resolve consistently across editor, preview, and live.

### Phase 12B Execution Blueprint (locked)

This subsection is the implementation contract for block parity work. Treat it as the source of truth for sequencing and scope.

#### Tracks and ordering
1. Shell hardening before feature accretion.
2. Mapping architecture (WP -> EP canonical + EP -> render).
3. Gutenberg parity UX (chooser, patterns, themes) powered by registries.
4. Import/extensibility path for future WP -> EP migrations and plugin packs.

#### Non-negotiable architecture invariants
- Canonical representation is versioned and explicit (not ad-hoc JSON).
- Import and render concerns are separated (different registries/pipelines).
- Transform resolution is deterministic and target-scoped.
- Unknown/unsupported content is preserved with loss-aware fallback nodes.
- Registry-driven behavior replaces hardcoded per-block conditionals.
- Codec determinism is mandatory: stable key ordering/normalization, stable defaults, and stable unknown-field policy.

#### Canonical envelope requirements
- `schemaVersion`: global canonical schema version.
- `id`: stable per-node identifier (present on every canonical node).
- `blockKind`: stable EP block identifier (not raw WP name).
- `props`: canonical block data (not raw WP attrs).
- `children`: explicit nested canonical nodes array (empty when leaf).
- `origin`: source metadata (WP name, attrs snapshot, raw fragments as needed).
- `lossiness`: `none | partial | fallback`.

#### Registry model
- `importTransforms`: WP block AST -> EP canonical.
- `renderers`: EP canonical -> target-specific outputs.
- Optional `postTransforms`: annotation/enrichment only; must not change node identity.
- Renderer targets are explicit: `publish`, `preview`, `editor`.
- Renderer resolution keys are `(blockKind, target)` with deterministic fallback policy (for example `editor -> preview` only when explicitly allowed).
- Resolver contract:
  - transforms declare explicit target scope (`wpBlockNames` and/or canonical `blockKinds`).
  - `canHandle()` must stay cheap.
  - single winning transform per node in select/apply stage.
  - winner selection policy is fixed: scope match -> `canHandle` -> highest priority -> stable lexical transform id tie-break.

#### Extension model (packs/plugins)
- Transform packs must be pure data + pure functions.
- Pack manifest must include:
  - `name`
  - `version`
  - supported WP block names
  - supported canonical schema version range
- Registration is explicit; no hidden side-effect behavior.

#### Fallback guarantee
- Define canonical fallback node kind (for example `ep/unknown`) that preserves:
  - original WP block name
  - attrs snapshot
  - raw source slice when available, else `innerHTML` + `innerContent` fragments
  - original raw WP `innerBlocks` payload for future re-transform upgrades
  - lossiness marker and diagnostics context

#### UX policy for parity
- Block chooser/inserter is capability-driven:
  - `available` (registered)
  - `enabled` (theme/site config/permissions)
  - `context-supported` (post type/location/nesting rules)
- Patterns and theme application must be registry/config driven.

#### Testing and diagnostics
- Golden fixture triads are required:
  - WP input
  - expected canonical
  - expected rendered output snippet
- Diagnostics report must be serializable and include transformed/partial/fallback/unsupported counts and items.
- Diagnostics items must be node-addressable and include:
  - stable node path (`root -> ... -> node` by canonical ids)
  - `origin.wpBlockName`
  - winning transform id (or `null` for fallback)
  - lossiness
- Persist import diagnostics with migrated docs when applicable.

#### Implementation sequence (committed)
1. Define canonical node schemas + codecs (`schemaVersion` spine).
2. Build registry scaffolding + deterministic resolver.
3. Port first mapping pack: `core/paragraph` import+render.
4. Port media-critical mapping pack: `core/image` import+render (wired to media model).
5. Add nested-structure validation early (`core/group` or equivalent).
6. Add `ep/unknown` fallback + diagnostics reporter.
7. Wire chooser/pattern/theme UX to registries.
8. Add plugin-pack loader and compatibility manifests.
- Sequencing note: implement fallback + diagnostics before/with nested validation so nested failures remain non-fatal and explainable.

#### Out-of-scope guardrail for this phase
- Do not build parallel bespoke editor controls that bypass canonical/registry contracts.
- Transitional controls are allowed only as temporary compatibility shims and must be tracked for removal.
- Do not bypass renderer registries: editor visualization must come from renderer outputs (or renderer-selected components), not ad-hoc per-block UI branches.

## Phase 13 – Theme System and Design Parity (merged into Phase 12B)
- [x] Theme-system parity backlog moved into Phase 12B to keep Gutenberg/block parity in one execution phase.

Exit criteria:
- Theme-system execution is owned by Phase 12B.

## Phase 14 – Platform Contract, API Compatibility, and Ops Confidence
- [ ] Publish `createPlatform()` contract doc with required/optional ports and fallback/error semantics.
- [ ] Replace placeholder `packages/contracts` validator with OpenAPI/JSON Schema and regenerate SDK/client contract checks.
- [ ] Publish adapter conformance matrix and required parity checks (in-memory vs wrangler-local vs deployed).
- [ ] Add known degradations register and release-cut checklist.
- [ ] Normalize API versioning/envelope/pagination rules and publish as stable guarantees.
- [ ] Add webhook delivery surface for publish completed + release activated events.
- [ ] Ship WP REST façade + `wp.*` compatibility profile (guaranteed/partial/out-of-scope), excluding block/editor parity scope already tracked in Phase 12B.

Exit criteria:
- Platform assembly, API schema, runtime parity, and compatibility guarantees are all versioned artifacts.
- No phase handoff requires piggyback completion from prior undocumented work.

## Dependencies & Notes
- Ports + Domain must not depend on infrastructure; only `packages/adapters-cloudflare` uses Cloudflare-specific APIs. (`scripts/check-boundaries.js` enforces this.)
- Canonical API tests currently validate required keys only. Replace `packages/contracts` with full schema before closing Phase 14.
- Current docs (`idea.md`) imply Gutenberg usability improvements, but execution tracking now lives in `Phase 10` above for explicit ownership.
- Concurrency caveat: KV-backed pointer/history updates in the reference Cloudflare adapter are not strongly atomic under concurrent writers; use D1 transaction boundaries or a Durable Object single-writer path when moving from reference to production guarantees.
- Hash caveat: current publisher hashing is intentionally non-cryptographic (`hashString`) for deterministic fingerprints and testability; do not treat `releaseHash`/`contentHash` as security primitives.
- Block-hash caveat: missing blocks (`blocks` absent/non-array) map to a deterministic empty-block hash, while structurally invalid block arrays are logged and omitted from `manifest.blockHashes`.
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
- Delta (2026-02-06 after provenance/hash increment): `94.52%` lines, `94.41%` funcs.
- Delta (2026-02-06 after shared provenance normalization + contentHash): `95.11%` lines, `95.06%` funcs.
- Delta (2026-02-06 after signed preview tokens + scoped private cache TTL): `95.14%` lines, `95.06%` funcs.
- Delta (2026-02-06 after D1-backed Cloudflare release-state support): `95.17%` lines, `95.08%` funcs.
- Delta (2026-02-06 after D1 release-state hardening + atomic batch tests): `95.02%` lines, `95.08%` funcs.
  Note: slight line-coverage dip is expected from newly added D1 migration/fallback branches; function coverage held steady.
- Delta (2026-02-06 after Phase 2 hardening closure for secrets+durability): `94.44%` lines, `91.49%` funcs.
- Delta (2026-02-06 after D1 app-store migration + no-default-admin bootstrap): `93.55%` lines, `90.20%` funcs.
- Delta (2026-02-06 after unhappy-path coverage expansion and threshold wiring): `97.15%` lines, `95.96%` funcs.
- Priority hotspot 1: `apps/admin-web/src/editor-shell.js` (`89.66%` lines) where document update/preview branches remain.
- Priority hotspot 2: `apps/api-edge/src/app.js` (`95.61%` lines) for endpoint-level negative branches and rare error guards.
- Priority hotspot 3: `packages/testing/src/inMemoryPlatform.js` (`97.38%` lines, `96.23%` funcs) with remaining branches tied to deeper revision/list edge paths.
- Process: run `bun run test:coverage` at the end of each phase slice and append a one-line delta note here.
