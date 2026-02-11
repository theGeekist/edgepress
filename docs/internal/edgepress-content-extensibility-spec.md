---
title: EdgePress Content + Extensibility Spec
---

# EdgePress Content + Extensibility Spec

Status: Canonical platform spec
Version: 3.0.0
Last updated: 2026-02-11
Supersedes: `idea.md`, `docs/internal/content-model-v2.md` (for platform direction)

## 1. Purpose and scope

This document defines the canonical platform direction for:

- EP-native content/domain modeling
- WordPress compatibility boundaries
- Hook-first extensibility
- Capability-gated SDK access
- Static-first publishing with minimal dynamic runtime

It merges:

- Prior architecture direction in `idea.md`
- Content-model specifics in `docs/internal/content-model-v2.md`
- Directional decisions from planning checkpoints
- The v2 discussion brief provided on 2026-02-11

Normative terms follow RFC 2119 semantics: MUST, SHOULD, MAY.

## 2. North stars

- Familiarity drives adoption: plugin/theme developers SHOULD feel WordPress-familiar at extension boundaries.
- EP model is canonical: compatibility MUST happen at adapter boundaries, not via WP storage internals in core.
- Security must be mostly invisible for common plugin work: rich SDK first, capability checks at SDK boundaries.
- Static-first publishing is architectural leverage: public traffic SHOULD hit static release outputs; dynamic runtime is explicit and minimal.

## 3. Architectural baseline

### 3.1 Layering and boundaries

- Core domain logic MUST remain runtime/storage agnostic.
- `apps/api` MUST depend only on ports/contracts, not Cloudflare APIs directly.
- Cloudflare-specific bindings MUST stay in `packages/cloudflare`.
- External systems (WP, hosting providers, publish targets) MUST be adapters.

### 3.2 Canonical API and compatibility API

- EP canonical API: `/v1/*` (source of truth)
- WP compatibility profile: `/wp/v2/*` and `/v1/wp/v2/*` (interoperability surface)

Compatibility layers MUST be treated as façades over canonical entities.

### 3.3 Publishing stance

- Authoring canonical form MUST be block JSON plus typed metadata.
- Publish output is a target adapter, not canonical storage.
- Static output is default.
- Dynamic endpoints exist only for explicit needs (auth-gated views, commerce/member/community flows, selected APIs).

## 4. Canonical domain model

## 4.1 Entities

### 4.1.1 ContentType

Defines what a document is:

- `slug`, `label`, `kind`
- `supports`
- `fields`
- `taxonomies`
- `statusOptions`

### 4.1.2 Taxonomy

Defines classification namespace:

- `slug`, `label`
- `hierarchical`
- `objectTypes`
- `constraints`

### 4.1.3 Term

Classifies documents within a taxonomy:

- `id`, `taxonomySlug`, `slug`, `name`, `parentId`

### 4.1.4 Document

Typed authored content:

- `id`, `type`, `status`, `title`, `slug`
- `blocks` (canonical editor content)
- `legacyHtml` (optional compatibility/migration)
- `excerpt`, `featuredImageId`
- `fields` (typed extension fields)
- `termIds` (term relationships)
- `raw` (lossless compatibility passthrough)

### 4.1.5 Revision

Immutable snapshot with lineage:

- snapshots publish-relevant editable fields
- stores `sourceRevisionId`
- preserves canonical `blocks`

## 4.2 Domain invariants (target contract)

- `document.blocks` MUST be canonical editor content.
- `document.legacyHtml` MAY be empty and is non-canonical.
- `document.type` MUST resolve to `contentType.slug`.
- `document.status` MUST be in resolved `contentType.statusOptions`.
- `term.taxonomySlug` MUST resolve to `taxonomy.slug`.
- If `taxonomy.hierarchical === false`, `term.parentId` MUST be null.
- `document.termIds` MUST reference valid terms for the document type (`taxonomy.objectTypes`).
- `raw` MUST NOT drive domain behavior.
- Adapters importing external content MUST normalize before persistence.

## 4.3 Slug and identity rules (target contract)

- `contentType.slug`: globally unique
- `taxonomy.slug`: globally unique and immutable after creation
- `term.slug`: unique within `(taxonomySlug)`
- `document.slug`: unique within `(site, document.type)`
- all slugs MUST normalize to lowercase kebab-case at write time

## 5. WordPress compatibility model

## 5.1 Boundary rule

WordPress parity is adapter-only. Core entities remain EP-native.

## 5.2 Mapping rules

### 5.2.1 WP -> EP

- WP post/CPT type -> `document.type`
- title/content/excerpt/status/slug -> canonical fields
- WP content HTML -> `legacyHtml` (optional), plus parsed blocks where possible
- taxonomy arrays -> `termIds`
- known meta -> typed `fields`
- unknown meta -> `raw.meta`
- idempotence marker -> `raw.import.fingerprint`

### 5.2.2 EP -> WP

- `document.blocks` serialized into WP content shape
- `termIds` grouped by taxonomy fields
- typed `fields` mapped to WP meta
- passthrough `raw.meta` merged with explicit allowlist policy

## 5.3 Contract artifacts

Two API profiles SHOULD exist and be versioned:

- EP OpenAPI profile (`/v1/*`)
- WP compatibility OpenAPI profile (`/wp/v2/*`)

Compatibility MUST be test-backed with golden fixtures.

## 5.4 Golden fixture matrix (minimum)

- taxonomy mix (flat + hierarchical)
- CPT field mapping and status behavior
- meta passthrough retention
- hierarchy normalization
- slug collision behavior
- idempotent re-import via fingerprint

## 6. Extensibility model

## 6.1 Hook API contract

Extensibility SHOULD remain WP-familiar:

- `addAction(hookName, callback, priority, acceptedArgs)`
- `doAction(hookName, ...args)`
- `addFilter(hookName, callback, priority, acceptedArgs)`
- `applyFilters(hookName, value, ...args)`

Server-side dispatch semantics MUST remain synchronous by contract.

## 6.2 Hook payload contract

Hook payloads SHOULD prefer:

- stable identifiers (`documentId`, `termId`, `mediaId`, etc.)
- compact summaries
- richer data fetched through SDK calls that enforce capability checks

Hook payloads SHOULD NOT become implicit full-data channels.

## 6.3 Runtime context vocabulary

Runtime extension context SHOULD use WP-familiar language:

- `currentUser`
- `site` (or `blog`)
- `context` (`admin|front|api|cron|cli|preview`)
- `capabilities`
- `timeout`/deadline

This context MAY be ambient (for ergonomics), while enforcement remains at SDK boundaries.

## 7. Permissions and capability model

## 7.1 Principles

- Capability checks MUST happen at SDK/API boundaries.
- Capability names SHOULD be WP-comprehensible, data/side-effect oriented.
- Plugin manifests SHOULD declare requested capabilities.
- Admin consent SHOULD occur at install/enable with understandable descriptions.

## 7.2 Capability examples

- `document:read`, `document:write`
- `term:read`, `term:write`
- `user:read`, `user:write`
- `media:write`
- `email:send`
- `http:fetch`, `webhook:deliver`
- `billing:*`, `commerce:*` (suite-dependent)

## 7.3 Marketplace safety posture

- Rich shared SDK is default path.
- Shared model extension (content types, fields, taxonomies, hooks) is preferred.
- Isolated plugin storage MAY exist as an option for special cases, but MUST NOT be the default platform center.

## 8. User model and gated public access

## 8.1 User spheres

WP-familiar framing:

- Admins (site users): operators/editors/authors
- Members (public users): subscribers/customers/community identities

Internal separation MAY differ, but admin UX SHOULD remain comprehensible in WP terms.

## 8.2 Gating model

- Public static routes are default.
- Protected routes require member auth.
- Dynamic runtime is invoked only for protected paths and explicit dynamic services.

## 9. Theme and block ecosystem stance

## 9.1 Themes

- Themes are primarily presentational.
- No mandatory server-side template runtime.
- Themes target publish adapters and block styling/front-end UI.

## 9.2 Block plugins

- Canonical storage remains block-based.
- WP block import/transform compatibility SHOULD be supported.
- Server-like plugin behavior maps to explicit phases:
  - admin hooks
  - frontend hooks
  - build/publish hooks

## 10. Official suite pattern

Platform suites (e.g., Commerce, Community) SHOULD be built on the same SDK + capabilities + hooks primitives as third-party extensions.

They MUST NOT bypass the capability-gated model with unrestricted raw storage access.

## 11. Implementation status validation (as of 2026-02-11)

This section validates v2 direction against current planning/docs/code.

## 11.1 Aligned and implemented

- Canonical `blocks` model with `legacyHtml` compatibility path is implemented.
- Content model entities and routes exist (`content types`, `taxonomies`, `terms`).
- WP compatibility façade for core Gutenberg bootstrap surfaces exists (`/wp/v2` basic settings/types/posts/pages/themes).
- WP-compatible hook primitives are integrated via `@wordpress/hooks`.
- Static-first release pipeline with immutable manifests and active-release pointer exists.
- API capability gating exists for authenticated endpoints.

## 11.2 Implemented but not fully at target contract

- Document slug uniqueness currently behaves effectively global, not scoped to `(site, type)`.
- Slug normalization is not yet unified across all write paths.
- Document writes currently accept arbitrary `type`/`status` values without strict content-type/statusOptions enforcement.
- Document `termIds` are persisted but not strictly validated against taxonomy/object-type constraints on document write.
- WP profile exists as docs + routes, but full profile versioning/openapi artifact governance is not complete.

## 11.3 Planned/not yet implemented

- Plugin manifest install-time capability declaration and consent UX.
- Ambient extension context contract (`currentUser/site/context/capabilities/timeout`) formalization.
- Full WP import/export idempotence contract with fingerprint tooling in production adapters.
- Webhook/event delivery contract stabilization for publish/release events.
- Full marketplace governance model and review/scanning workflows.
- Official Commerce/Community suite contracts.

## 12. Required near-term commitments

## 12.1 Contract hardening

- Publish `createPlatform()` contract doc (required/optional ports, fallback semantics, error behavior).
- Publish adapter conformance matrix across in-memory, wrangler-local, deployed Cloudflare.
- Version and publish EP + WP API profiles.

## 12.2 Domain invariant enforcement

- Enforce content-type existence and statusOptions on document write.
- Enforce term/taxonomy/type compatibility on document write.
- Enforce target slug uniqueness scope and shared normalization strategy.

## 12.3 Extensibility safety

- Define hook payload size/shape limits and redaction policy.
- Define plugin capability manifest schema and admin approval flow.
- Add capability-audited SDK access patterns for extension operations.

## 13. Acceptance criteria for this spec

This spec is considered active when:

- planning tracks reference this document as the architecture baseline
- invariant/test backlog maps to sections 4/5/6/7/12
- deprecated idea documents are sunset and point here

## 14. Source mapping

- Prior strategy: `idea.md`
- Content model draft: `docs/internal/content-model-v2.md`
- Phase/state tracker: `PLANNING.md`
- Hook runtime: `apps/api/src/hooks.js`, `apps/api/src/hooks-bootstrap.js`
- Content model routes: `apps/api/src/features/content-model-routes.js`
- Document routes: `apps/api/src/features/document-routes.js`
- WP compatibility routes: `apps/api/src/features/wp-core-routes.js`
- Capability enforcement: `apps/api/src/auth.js`
