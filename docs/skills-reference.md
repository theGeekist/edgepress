# Skills Reference Guide

This document provides context for working with the EdgePress project, helping skills and agents understand the architecture, patterns, and conventions used throughout the codebase.

## Project Overview

**EdgePress** (formerly GCMS) is a platform-agnostic Content Management System that decouples the Gutenberg block editor from WordPress. It runs on any edge runtime (Cloudflare Workers as reference) and publishes static releases for public consumption.

### Core Design Philosophy

1. **Platform-Agnostic Core**: Domain logic has zero dependencies on frameworks or infrastructure
2. **Hexagonal Architecture**: All platform concerns are isolated behind ports/adapters
3. **Block JSON as Source of Truth**: HTML is derived; canonical representation is versioned block JSON
4. **Static Publishing**: Public sites are immutable release artifacts (no database dependency for serving)
5. **Edge-Portable**: Core can run on Workers, Functions, or server runtimes via adapters

## Quick Start

### Critical Rules (Read First!)

1. **NEVER Import Cloudflare Outside `adapters-cloudflare/`**
   - The boundary checker script (`scripts/check-boundaries.js`) will fail if you:
     - Import `@cloudflare/workers-types` in `api-edge` or `domain` packages
     - Use Cloudflare-specific APIs (env.D1, env.R2, etc.) outside `adapters-cloudflare/`
   - **What to do instead**: Depend on port interfaces in `packages/ports/`. The core doesn't know *how* data is stored, only *that* it can be stored.

2. **Block JSON is Source of Truth**
   - **WRONG**: Store HTML as canonical content
   - **RIGHT**: Store block JSON (`blocks[]` array); HTML is derived at publish time
   - When editing documents:
     - Read: Use block JSON from `document.blocks`
     - Write: Save block JSON to `revision.blocks`
     - Serialize: Use `@wordpress/blocks` to generate HTML only for output

3. **All Domain Changes Need Ports**
   - Add entities/invariants in `packages/domain/`
   - Add port methods in `packages/ports/`
   - Implement ports in `packages/adapters-cloudflare/` (Cloudflare)
   - Implement ports in `packages/testing/src/inMemoryPlatform.js` (for tests)
   - Add API route handlers in `apps/api-edge/src/features/`
   - Add admin state/hooks in `apps/admin-web/src/features/`
   - Add tests in `packages/testing/test/`

4. **Frontend Import Rule (STRICT)**
   - **ALWAYS** import feature code from feature root: `from '@features/editor'`
   - **NEVER** import from internals: `from '@features/editor/hooks/useEditorState'`
   - Treat feature internals as private implementation details

### File Layout

```
edgepress/
├── apps/
│   ├── api-edge/          # REST API (platform-agnostic)
│   └── admin-web/         # WordPress-like admin with Gutenberg
├── packages/
│   ├── ports/              # Interface definitions (core depends on these)
│   ├── domain/             # Pure business logic (no infra deps)
│   ├── publish/            # Release compilation pipeline
│   ├── sdk/                # Canonical API client
│   ├── testing/            # In-memory adapters + tests
│   └── adapters-cloudflare/ # Cloudflare reference implementation
├── scripts/
│   └── check-boundaries.js # Enforces no CF imports outside adapters
└── docs/                  # Generated documentation
```

### Key Commands

```bash
# Local dev (in-memory platform)
bun run start:api

# Cloudflare Worker local dev
wrangler dev

# Admin UI local dev
bun run dev:admin

# Run tests
bun test

# Run with coverage (enforces thresholds)
bun run test:coverage

# Check boundary violations
bun run check:boundaries

# Lint
bun run lint
```

### Common Pitfalls

| ❌ Wrong | ✅ Right |
|----------|-----------|
| Storing HTML as canonical | Store block JSON; derive HTML at publish |
| Importing Cloudflare APIs outside adapters | Depend on ports, never import CF-specific code |
| Importing from feature internals | Always import from feature root (`@features/editor`) |
| Forgetting in-memory platform tests | Implement new port methods in `inMemoryPlatform.js` too |
| Using `as any` or `@ts-ignore` | Never suppress type errors |
| Writing same releaseId twice | Create new `releaseId`; rollback switches pointer |

---

**For detailed architecture, patterns, and examples, continue reading below.**

## Architecture Layers

### 1. Domain Layer (`packages/domain/`)

**Location**: `packages/domain/src/`

**Purpose**: Pure business logic with no infrastructure dependencies.

#### Core Entities

| Entity | Purpose | Key Fields |
|---------|---------|-------------|
| `User` | Authentication & authorization | `id`, `username`, `password`, `role`, `capabilities[]` |
| `Document` | Content container | `id`, `title`, `type` (page\|post), `slug`, `featuredImageId`, `blocks[]`, `status`, timestamps |
| `Revision` | Immutable content snapshot | `id`, `documentId`, `title`, `blocks[]`, `sourceRevisionId`, `authorId`, `createdAt` |
| `PublishJob` | Async publish tracking | `id`, `requestedBy`, `sourceRevisionId`, `sourceRevisionSet`, `releaseId`, `status` |
| `MediaAssetSession` | Two-phase media upload | `id`, `status`, `uploadToken`, `uploadUrl`, `filename`, `url`, `alt`, `caption` |
| `FormSubmission` | Form data capture | `id`, `formId`, `payload`, `requestContext` |

#### Block Content Model

**Canonical Representation**: Block JSON with schema versioning.

**Structure**:
```javascript
{
  name: string,           // e.g., "core/paragraph", "core/image"
  attributes: object,      // Block-specific properties
  innerBlocks: Block[]     // Nested blocks (for containers)
}
```

**Validation Rules** (from `blocks.js`):
- `name` must be non-empty string
- `innerBlocks` must be array (default empty)
- `attributes` must be object (default empty)
- Blocks are canonicalized (sorted keys) for deterministic serialization

**Schema Versioning**:
- `BLOCKS_SCHEMA_VERSION` tracks block format evolution
- Migration paths exist for legacy HTML-first revisions
- Unknown blocks are preserved with loss-aware fallback nodes

#### Domain Invariants

**Location**: `packages/domain/src/invariants.js`

| Invariant | Purpose | Error Condition |
|-----------|---------|-----------------|
| `assertReleaseManifestImmutable` | Prevent re-writing releases | Manifest exists for releaseId |
| `assertHasCapability` | Capability-based auth | User lacks required capability |
| `assertPreviewNotExpired` | Time-limited preview access | Preview expired |

### 2. Ports Layer (`packages/ports/`)

**Location**: `packages/ports/src/`

**Purpose**: Interface definitions that core depends on. Adapters implement these.

#### Runtime Port

**Methods**:
- `env(key)` - Access environment variables
- `now()` - Current timestamp
- `uuid()` - Generate UUID
- `log(level, event, meta)` - Structured logging
- `requestContext(request)` - Extract request metadata
- `waitUntil(promise)` - Background work
- `hmacSign(input, keyRef)` / `hmacVerify()` - Cryptographic signatures
- `base64urlEncode()` / `base64urlDecode()` - Encoding

#### StructuredStore Port

**Methods**:
- `tx(callback)` - Transaction support (where available)
- `listDocuments(filter)` - Query documents
- `createDocument(doc)` / `updateDocument(id, doc)` / `deleteDocument(id)`
- `listRevisions(docId)` - Get revision history
- `createRevision(rev)` - Create immutable revision
- `listMedia(filter)` - Query media library
- `getMedia(id)` - Get single media asset

#### BlobStore Port

**Methods**:
- `putBlob(key, data, contentType)` - Store binary data

#### CacheStore Port

**Methods**:
- `get(key)` / `put(key, value, ttl)` - KV-style caching
- `delete(key)` - Cache invalidation

#### ReleaseStore Port

**Methods**:
- `writeArtifact(releaseId, route, content, contentType)` - Write static asset
- `writeManifest(releaseId, manifest)` - Write release manifest
- `getManifest(releaseId)` - Read release manifest
- `getActiveRelease()` / `setActiveRelease(releaseId)` - Release activation
- `listReleases()` - Release history

#### PreviewStore Port

**Methods**:
- `createPreview(documentId, createdBy, expiresAt)` - Create preview session
- `getPreview(token)` - Retrieve preview session

### 3. Adapter Layer (`packages/adapters-cloudflare/`)

**Location**: `packages/adapters-cloudflare/src/`

**Purpose**: Reference implementation using Cloudflare Workers.

#### Cloudflare Service Mapping

| Port | Cloudflare Service | Implementation File |
|------|-------------------|---------------------|
| RuntimePort | Workers runtime | `runtime.js` |
| StructuredStore | D1 (SQLite) | `app-store.js`, `d1-sql.js` |
| BlobStore | R2 (object storage) | `io-stores.js` |
| CacheStore | KV (key-value) | `io-stores.js` |
| ReleaseStore | D1 + KV hybrid | `release-store.js` |
| PreviewStore | D1 | Part of `app-store.js` |

#### Worker Composition Root

**Location**: `packages/adapters-cloudflare/src/worker.js`

```javascript
// Platform composition
createCloudflareReferencePlatform(env, { ctx })
  → Implements all ports using Cloudflare services
  → Attaches server-side hooks
  → Creates API handler
```

**Key Pattern**: Single exported `fetch` handler that:
1. Creates or caches platform
2. Attaches server-side hooks
3. Returns API handler

### 4. API Layer (`apps/api-edge/`)

**Location**: `apps/api-edge/src/`

**Purpose**: REST API that exposes core functionality via HTTP.

#### Route Organization

All routes are in `features/` directory:

| Route File | Endpoints | Purpose |
|------------|------------|---------|
| `auth-routes.js` | `/v1/auth/*` | Token, refresh, logout |
| `document-routes.js` | `/v1/documents/*` | CRUD operations, revisions |
| `media-routes.js` | `/v1/media/*` | Two-phase upload, media management |
| `publish-routes.js` | `/v1/publish/*` | Publish jobs, release management |
| `preview-routes.js` | `/v1/preview/*` | Time-limited preview URLs |
| `private-routes.js` | `/v1/private/*` | Authenticated private content |
| `navigation-routes.js` | `/v1/navigation/*` | Menu management |
| `form-routes.js` | `/v1/forms/*` | Form submissions |

#### Error Envelope (Canonical)

**Location**: `apps/api-edge/src/http.js`

```javascript
{
  error: {
    code: string,      // e.g., "AUTH_REQUIRED", "FORBIDDEN"
    message: string
  }
}
```

#### Authorization

**Location**: `apps/api-edge/src/auth.js`

**Mechanism**: JWT bearer tokens with capability strings.

**Capabilities** (from `entities.js`):
- `admin`: `document:read`, `document:write`, `publish:write`, `media:write`, `private:read`
- `editor`: `document:read`, `document:write`, `media:write`
- `viewer`: `document:read`

#### Server Hooks System

**Location**: `apps/api-edge/src/hooks.js`, `apps/api-edge/src/hooks-bootstrap.js`

**Purpose**: WP-compatible actions/filters using `@wordpress/hooks`.

**Lifecycle Hooks**:
- `edgepress.publish.provenance` - Transform publish payload (sync)

**Attachment**: Platform must have `hooks` property with `addAction`/`doAction`/`addFilter`/`applyFilters`.

### 5. Admin Web (`apps/admin-web/`)

**Location**: `apps/admin-web/src/`

**Purpose**: WordPress-like admin interface with Gutenberg integration.

#### Feature Organization

**Structure**: `features/<domain>/` with hooks and state management.

| Feature | Files | Purpose |
|---------|--------|---------|
| `auth/` | `useAuthState.js` | Login, token refresh, logout |
| `content/` | `useDocumentsState.js`, `useReleaseLoopState.js` | Document list, editor, publishing |
| `media/` | `useMediaState.js` | Media library, upload |
| `navigation/` | `useNavigationMenuEditor.js` | Menu editor |
| `editor/` | `gutenberg-integration.js`, `useEditorState.js` | Gutenberg embedding, block parity |
| `theme/` | `index.js`, `canonicalTheme.js` | Design tokens, theming |

#### Gutenberg Integration

**Location**: `apps/admin-web/src/features/editor/gutenberg-integration.js`

**Key Pattern**: Uses `@wordpress/api-fetch` middleware to inject auth tokens and handle token refresh.

**api-fetch Configuration**:
- Custom fetch handler uses canonical SDK
- Middleware injects bearer token
- Automatic token refresh on 401 responses

#### Block Parity System

**Location**: `apps/admin-web/src/features/editor/parity/`

**Purpose**: Import WP blocks into canonical EP block format.

**Components**:
- `canonical.js` - Canonical node schema definition
- `registries.js` - Import transforms and renderer registries
- `pipeline.js` - Transform pipeline (WP → canonical → render)
- `resolver.js` - Deterministic transform resolution
- `mappings/core*.js` - WP core block transforms
- `fallback.js` - Unknown block preservation

**Transform Flow**:
1. WP block AST → Import transform → Canonical node
2. Canonical node → Renderer → Target output (editor/preview/publish)
3. Fallback → `ep/unknown` node with loss markers

### 6. Publish Layer (`packages/publish/`)

**Location**: `packages/publish/src/publisher.js`

**Purpose**: Compilations from revisions to static releases.

#### Publishing Pipeline

**Process**:
1. List all published documents
2. For each document:
   - Serialize blocks to HTML (using `@wordpress/blocks`)
   - Resolve media URLs (image blocks with mediaId)
   - Generate artifact hash
   - Write artifact to `ReleaseStore`
3. Create immutable manifest with:
   - `releaseId`, `schemaVersion`
   - `sourceRevisionId`, `sourceRevisionSet`
   - `artifacts[]` (route, path, hash, blocksHash)
   - `releaseHash` (event fingerprint)
   - `contentHash` (content identity)
4. Store manifest (immutable)

#### Release Model

**Structure**:
```javascript
{
  releaseId: string,
  schemaVersion: number,
  createdAt: ISO string,
  publishedBy: string,
  sourceRevisionId: string | null,
  sourceRevisionSet: string[],
  artifacts: [{
    route: string,
    path: string,
    hash: string,
    blocksHash: string | null,
    contentType: string
  }],
  artifactHashes: string[],
  blockHashes: string[],
  contentHash: string,
  releaseHash: string
}
```

**Activation**: `ReleaseStore.setActiveRelease(releaseId)` switches active pointer.

### 7. SDK Layer (`packages/sdk/`)

**Location**: `packages/sdk/src/client.js`

**Purpose**: Canonical API client with auth and refresh.

**Key Features**:
- Automatic token refresh on 401
- Request/response error handling
- Query parameter encoding
- CORS support

**Methods**:
- `token()`, `refresh()`, `logout()`
- `listDocuments()`, `createDocument()`, `updateDocument()`, `deleteDocument()`
- `listRevisions(id)`
- `initMedia()`, `finalizeMedia()`, `listMedia()`, `updateMedia()`, `deleteMedia()`
- `publish()`, `getPublishJob()`, `activateRelease()`, `listReleases()`
- `listNavigationMenus()`, `getNavigationMenu()`, `upsertNavigationMenu()`
- `preview(documentId)`, `getPrivateRoute(routeId)`

### 8. Testing Layer (`packages/testing/`)

**Location**: `packages/testing/`

**Purpose**: In-memory adapters and test infrastructure.

#### In-Memory Platform

**Location**: `packages/testing/src/inMemoryPlatform.js`

**Purpose**: Deterministic platform for tests.

**Implements**: All ports using in-memory data structures.

#### Test Organization

**Location**: `packages/testing/test/`

| Test File | Purpose |
|-----------|---------|
| `api.behavior.test.js` | API contract tests |
| `api.contract.test.js` | Endpoint behavior tests |
| `domain.entities.test.js` | Domain entity creation/validation |
| `domain.invariants.test.js` | Invariant enforcement |
| `publisher.test.js` | Publish pipeline |
| `release.preview.private.test.js` | Release, preview, private delivery |
| `editor.loop.e2e.test.js` | End-to-end authoring loop |
| `admin.shell.test.js` | Admin integration tests |
| `api.hooks.test.js` | Hook system tests |

## Key Patterns & Conventions

### Boundary Enforcement

**Location**: `scripts/check-boundaries.js`

**Rule**: `apps/api-edge` and `packages/*` (except `adapters-cloudflare`) may not import Cloudflare-specific APIs.

**Check**: Prevents infrastructure leakage into platform-agnostic code.

### Content Versioning

**Pattern**: Schema versioning for forward compatibility.

- `blocksSchemaVersion` on documents/revisions
- `schemaVersion` on release manifests
- Migration strategies for legacy formats

### Error Handling

**Canonical Pattern**:
1. Domain throws specific errors
2. HTTP layer maps to canonical error envelope
3. SDK parses and re-throws typed errors

### Async Patterns

**Publish Jobs**: Async publish process with job tracking.

**Background Work**: `runtime.waitUntil()` for fire-and-forget operations.

## Development Workflow

### Local Development

```bash
# Run in-memory API
bun run start:api

# Run Cloudflare Worker locally
wrangler dev

# Run admin dev server
bun run dev:admin

# Run tests
bun test
bun run test:coverage
```

### Coverage Requirements

**Current Baseline**: ~97% lines, ~96% functions (see `PLANNING.md` for latest coverage watch).

### Adding Features

1. **Domain**: Add entities/invariants in `packages/domain/`
2. **Ports**: Add port methods in `packages/ports/`
3. **Adapters**: Implement ports in `packages/adapters-cloudflare/`
4. **API**: Add route handlers in `apps/api-edge/src/features/`
5. **Admin**: Add state/hooks in `apps/admin-web/src/features/`
6. **Tests**: Add tests in `packages/testing/test/`

## Phase Status

**Current Phase**: Phase 12B - Core Blocks and Gutenberg Parity

See `PLANNING.md` for complete phase roadmap and status tracking.

## Frontend Slice Architecture

**Location**: `docs/architecture/frontend-slice-structure.md` (see also "Quick Start" section above for quick reference)

### Folder Contracts

1. **`components/*`** (shared UI primitives)
   - One export per file
   - No feature workflow state
   - Can be UI components, pure functions, or utility objects

2. **`hooks/*`** (global/shared hooks)
   - Global/shared hooks only
   - If a concern has no dedicated feature UI/components, keep in top-level `hooks/*`
   - When it gains dedicated UI/state flow, move into feature-local `hooks/*`

3. **`features/*`** (self-contained feature modules)
   - May contain local `components/*`, local `hooks/*`, routes/state handling
   - **Every feature MUST have** `features/<feature>/index.js`
   - `index.js` is the feature's public API contract

4. **`scenes/web`**, **`scenes/native`** (top-level shells)
   - Top-level shell pages and route composition
   - Stitch layout + one or more features
   - Prefer one scene module per top-level route

### Public Import Rule (STRICT)

**ALWAYS import feature code from feature root**:
- ✅ Allowed: `from '@features/editor'`
- ❌ Not allowed: `from '@features/editor/hooks/useEditorState'`
- ❌ Not allowed: `from '@features/editor/components/Canvas'`

**Treat feature internals as private implementation details.**

### Packaging Principle

Assume each `components/*`, `hooks/*`, `features/*`, and `scenes/*` subtree may receive its own `package.json` later. Keep boundaries and imports package-safe.

### Refactor Checklist

1. Move shell pages to `scenes/*`
2. Split top-level route sections into dedicated scene modules under `scenes/*/routes/*`
3. Keep feature internals under `features/<name>/components` and `features/<name>/hooks`
4. Add `features/<name>/index.js` and export only intended public surface
5. Rewrite all imports to feature-root imports only
6. Validate with build/tests

### Admin Web Structure (Current)

**Location**: `apps/admin-web/src/features/`

| Feature | Structure | Purpose |
|---------|-----------|---------|
| `auth/` | `hooks/useAuthState.js`, `index.js` | Login, auth state |
| `content/` | `hooks/useDocumentsState.js`, `useReleaseLoopState.js`, `index.js` | Documents, publishing loop |
| `media/` | `hooks/useMediaState.js`, `index.js` | Media library |
| `navigation/` | `hooks/useNavigationMenuEditor.js`, `index.js` | Menu editor |
| `editor/` | `gutenberg-integration.js`, `hooks/useEditorState.js`, `parity/`, `index.js` | Gutenberg, block parity |
| `theme/` | `index.js`, `canonicalTheme.js`, `wpThemeAdapter.js` | Design tokens |

**Components Directory**: `apps/admin-web/src/components/ui/`
- Shared UI primitives (buttons, inputs, layouts)
- No feature-specific state or workflows

### Feature Index File Pattern

```javascript
// features/my-feature/index.js
export { useMyFeatureState } from './hooks/useMyFeatureState.js';
export { MyComponent } from './components/MyComponent.jsx';

// Internal implementation NOT exported
// - internalHelpers.js
// - components/Modal.jsx (unless part of public API)
```

### Scene Composition Pattern

```javascript
// scenes/web/routes/ContentScene.jsx
import { useContentState } from '@features/content';
import { Layout } from '@components/ui/Layout';
import { ContentList } from '@features/content';

export function ContentScene() {
  const { documents, createDocument } = useContentState();
  return (
    <Layout>
      <ContentList documents={documents} onCreate={createDocument} />
    </Layout>
  );
}
```

## Important Notes

### Block Canonicalization

- Blocks are canonicalized (sorted keys) for deterministic serialization
- This is critical for hash consistency and release reproducibility

### Two-Phase Media Upload

1. `POST /v1/media/init` → Gets upload token and URL
2. Upload file to upload URL
3. `POST /v1/media/:id/finalize` → Completes with metadata

### Preview Token Security

- Preview tokens are HMAC-signed with time expiry
- Tokens are scoped to document ID
- Cache keys are scoped to prevent preview cache poisoning

### Release Immutability

- Writing same releaseId twice throws error
- Rollback is pointer switching, not mutation
- Release history is append-only

### Hooks System

- Uses `@wordpress/hooks` for WP compatibility
- Server-side hooks are bootstrapped at composition root
- `beforePublish` hook is synchronous by contract

## Documentation References

- `docs/architecture/overview.md` - High-level architecture
- `docs/architecture/invariants.md` - Domain invariants
- `docs/architecture/block-content-model.md` - Block model details
- `docs/architecture/admin-ui-strategy.md` - Admin UI patterns
- `docs/reference/api/` - API reference documentation
- `docs/reference/ports.md` - Port contracts
- `PLANNING.md` - Phase roadmap and status
- `idea.md` - Architectural vision

## Getting Help

- Check existing documentation first (`docs/` directory)
- Look at test files for usage examples
- Reference `packages/testing/src/inMemoryPlatform.js` for port implementation examples
- Use `bun run lint` and `bun run test:coverage` to validate changes
