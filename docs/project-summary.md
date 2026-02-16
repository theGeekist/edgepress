# EdgePress - Platform-Agnostic CMS for Gutenberg

## What is EdgePress?

EdgePress is a platform-agnostic Content Management System that decouples the Gutenberg block editor from WordPress. It runs on edge/server runtimes (Cloudflare Workers as the reference implementation) and publishes release artifacts for delivery.

**Key innovation**: instead of running a PHP/WordPress server, EdgePress provides the REST contract Gutenberg expects, implemented as portable JavaScript with explicit adapter boundaries.

## Vision Statement

Decouple Gutenberg into a standalone, workers-first CMS by replacing the invisible WordPress runtime contract (REST endpoints, auth, media library, autosaves, revisions, templates) with a clean platform-agnostic API layer.

## Why EdgePress?

### For publishers
- **Static-first delivery**: Published content is served from release artifacts.
- **WordPress-compatible editing**: Gutenberg and WP-shaped surfaces are supported.
- **Edge-native deployment**: Reference adapter targets Cloudflare; architecture remains portable.

### For developers
- **Modern stack**: JavaScript modules, Bun tooling, React admin.
- **Boundary-first architecture**: Capability code is separate from delivery/infrastructure adapters.
- **Predictable change vectors**: Feature-local work, thin controllers, explicit orchestration.

## Core Architecture

### Design philosophy

1. **Feature-first backend**: capability logic lives in packages.
2. **Single orchestration surface**: cross-capability stories compose in one layer.
3. **Thin delivery adapters**: HTTP controllers map request/response only.
4. **Frontend scene orchestration**: route composition in scenes; features own internals.
5. **Promotion by repetition**: shared/global abstractions are earned, not speculative.

### Current backend shape

```text
apps/api/src/
  adapters/http/routes/           # route registration
  adapters/http/controllers/      # thin request/response adapters
  orchestration/                  # workflow/use-case coordination
  app/                            # composition root/bootstrap helpers

packages/
  auth/                           # auth capability
  content/                        # content/media/navigation/private/preview/forms capabilities
  wp-core/                        # WP compatibility mappings/records
  api-core/                       # API-level contract/helpers (auth/http/validation/hooks)
  domain/                         # shared domain entities/invariants
  hooks/                          # shared hooks registry support
  platform-base/                  # in-memory platform implementation
  cloudflare/                     # Cloudflare runtime/storage adapters
  testing/                        # shared test utilities/fakes
```

### Current frontend shape

```text
apps/admin-web/src/
  scenes/                         # route-level composition/orchestration
  features/                       # feature-local behavior/state/ui
  adapters/                       # API client adapter
  components/                     # shared agnostic UI primitives
  hooks/                          # shared agnostic hooks
```

## Current phase

Phase 12 architecture refactors are complete in this branch line; remaining parity/product items are tracked in Phase 12C in `PLANNING.md`.

## Key Architectural Invariants

### Block JSON is canonical

**Not**: HTML as source of truth
**Yes**: block JSON with versioning/normalization semantics

Publish flow:
1. Read canonical block JSON from document/revision state.
2. Normalize/transform deterministically.
3. Render to output HTML.
4. Write release artifacts + manifest metadata.

### Releases are immutable

- Publishing creates a new `releaseId`.
- Rewriting same release manifest is rejected.
- Rollback is active-release pointer switching, not mutation.
- Release history is append-only.

### Static-first delivery

Published output is artifact-based. Runtime stays focused on authenticated/private/preview/forms workflows.

### Two-phase media lifecycle

1. Init/upload session
2. Upload to blob storage
3. Finalize metadata in canonical model

## Technology Stack

| Layer | Technology |
|-------|------------|
| Language | JavaScript (ESM) |
| Runtime | Bun (local), Cloudflare Workers (reference) |
| Admin | React + Gutenberg packages |
| Storage (reference) | D1, R2, KV |
| Test runner | Bun test |

## Getting Started

### 5-minute overview

1. Read this file for system-level context.
2. Read `docs/skills-reference.md` for FE/BE architecture rules.
3. Run local services:
   ```bash
   bun run start:api
   bun run dev:admin
   # optional reference runtime
   wrangler dev
   ```
4. Run quality checks:
   ```bash
   bun run lint
   bun run test:unit
   bun run test:coverage
   bun run check:boundaries
   ```

## Important file locations

| Purpose | File |
|---------|------|
| API composition | `apps/api/src/app/create-api-handler.js` |
| HTTP controller adapters | `apps/api/src/adapters/http/controllers/` |
| Backend orchestration | `apps/api/src/orchestration/` |
| In-memory platform | `packages/platform-base/src/index.js` |
| Cloudflare adapter | `packages/cloudflare/src/index.js` |
| Admin API client | `apps/admin-web/src/adapters/api-client.js` |
| Frontend scenes | `apps/admin-web/src/scenes/` |
| Frontend features | `apps/admin-web/src/features/` |
| Phase tracker | `PLANNING.md` |

## How EdgePress Works

### Editing content

1. Editor updates canonical document/revision data.
2. Preview flow issues signed/expiring preview access.
3. Publish workflow compiles release artifacts.
4. Activation switches active release pointer.
5. Delivery reads active artifacts (plus private/auth policies where required).

### Publishing release

1. Orchestration runs release workflow.
2. Content/media references are resolved for output.
3. Artifacts are persisted via release/blob stores.
4. Manifest/provenance/hash metadata are persisted.
5. Active release is switched per workflow policy.

### Authentication and authorization

- Token/refresh flows are exposed under `/v1/auth/*`.
- Capability-gated checks gate protected endpoints.
- Errors follow canonical envelope shape.

### Private content

- Routes are capability-gated.
- Output remains artifact-backed.
- Cache scoping is enforced by auth context.

## Development Workflow

### Adding a backend feature

1. Add capability behavior in `packages/<capability>/src/`.
2. Wire orchestration in `apps/api/src/orchestration/` when cross-capability coordination is needed.
3. Add/adjust thin controllers in `apps/api/src/adapters/http/controllers/`.
4. Add/adjust tests in `apps/api/test/` and relevant package tests.
5. Update docs/reference pages.

### Adding a frontend feature

1. Add feature-local behavior/state/UI in `apps/admin-web/src/features/<feature>/`.
2. Compose routes/workflows in `apps/admin-web/src/scenes/`.
3. Promote to `components/` or `hooks/` only when truly agnostic.

See `docs/skills-reference.md` for detailed FE/BE architecture constraints.
