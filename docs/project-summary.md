# EdgePress - Platform-Agnostic CMS for Gutenberg

## What is EdgePress?

EdgePress is a platform-agnostic Content Management System that decouples the Gutenberg block editor from WordPress. It runs on any edge runtime (Cloudflare Workers as the reference implementation) and publishes static releases for public consumption.

**Key Innovation**: Instead of running a PHP/WordPress server, EdgePress provides the exact REST API contract that Gutenberg expects - but implemented as portable JavaScript that can run anywhere.

## Vision Statement

Decouple Gutenberg into a standalone, workers-first CMS by replacing the invisible runtime contract that WordPress normally supplies (REST endpoints, authentication, media library, autosaves, revisions, templates) with a clean, platform-agnostic API layer.

## Why EdgePress?

### For Publishers
- **Static sites**: Published content is served as immutable artifacts - no database dependency, uncrashable under load
- **WordPress-compatible**: Use Gutenberg editor and existing block plugins with minimal friction
- **Edge-native**: Deploy to Cloudflare Workers, Vercel Edge Functions, or any edge runtime

### For Developers
- **Modern stack**: JavaScript/TypeScript, no PHP
- **Hexagonal architecture**: Core business logic is pure; swap infrastructure via adapters
- **Client-agnostic**: Admin works in web, React Native, or desktop

## Core Architecture

### Design Philosophy

1. **Admin is client-agnostic** - Editor and admin work across web, React Native, and desktop
2. **Edge-functions-first API** - Gutenberg is a client; CMS is a strongly designed API layer
3. **Public site is static** - Published output is served as release artifacts
4. **Dynamic runtime is tiny** - Only forms and gated reads require runtime
5. **WordPress REST shape is a façade** - Compatibility layer without WP internals
6. **Everything infrastructure-facing is adapter/DI** - Storage mechanisms are not hard-coded

### Hexagonal Architecture (Ports & Adapters)

```
┌─────────────────────────────────────────────────────────────┐
│                    Domain Layer                          │
│            (Pure business logic)                       │
│  - Entities: Document, Revision, User, Media, Forms    │
│  - Invariants: Capability checks, release immutability   │
│  - Block Model: Canonical JSON with schema versioning      │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                     Ports                             │
│              (Interface contracts)                       │
│  - RuntimePort: env, log, waitUntil, HMAC              │
│  - StructuredStore: CRUD for documents, revisions, media │
│  - BlobStore: Binary storage                            │
│  - CacheStore: KV-style caching                          │
│  - ReleaseStore: Manifest and artifact storage              │
│  - PreviewStore: Time-limited preview sessions              │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                  Adapters                            │
│           (Infrastructure implementations)                │
│  - InMemory: Deterministic testing (packages/testing)    │
│  - Cloudflare: D1, R2, KV, Workers (reference)      │
│  - [Future]: AWS, other edge runtimes                    │
└─────────────────────────────────────────────────────────────┘
```

**Why this matters**: The core CMS logic has zero knowledge of *how* data is stored. Swap the adapter to run on AWS Lambda + DynamoDB, or keep it on Cloudflare D1 + R2. Same code.

## Project Structure

```
edgepress/
├── apps/
│   ├── api/              # Edge Functions API (platform-agnostic)
│   └── admin-web/             # WordPress-like admin with Gutenberg
├── packages/
│   ├── ports/                 # Port interface contracts
│   ├── domain/                # Pure business logic
│   ├── publish/               # Release compilation pipeline
│   ├── sdk/                   # Canonical API client
│   ├── testing/               # In-memory adapters + tests
│   └── cloudflare/   # Cloudflare reference implementation
├── docs/                     # Documentation
├── idea.md                   # Architectural vision
└── PLANNING.md               # Phase tracker & roadmap
```

For detailed directory breakdown, see `docs/skills-reference.md`.

## Current Phase

**Phase 12B - Core Blocks and Gutenberg Parity** (IN PROGRESS)

**What this means**: We're implementing block transforms that allow WordPress blocks to work with EdgePress's canonical block format, building registries for importing and rendering, and adding theme system integration.

See `PLANNING.md` for complete roadmap and phase status.

## Key Architectural Invariants

### Block JSON is Canonical

**Not**: HTML as source of truth
**Yes**: Block JSON with schema versioning

When you publish:
1. Take block JSON from revision
2. Canonicalize (sort keys for deterministic output)
3. Serialize to HTML (using `@wordpress/blocks`)
4. Write HTML as release artifact

This means blocks can be re-edited, re-formatted, or upgraded without losing data.

### Releases are Immutable

- Publishing creates a new `releaseId`
- Writing the same `releaseId` twice throws an error
- Rollback = switch active pointer, not mutate
- Release history is append-only

### Static by Default

Published sites don't need:
- Database queries
- Runtime rendering
- WordPress server

Only need:
- Static file delivery (HTML/CSS/JS)
- Auth for private pages (can cache at edge)
- Form handling (runtime, but minimal)

### Two-Phase Media Upload

1. **Init**: Get upload token and pre-signed URL
2. **Upload**: Client uploads directly to blob storage (bypasses CMS)
3. **Finalize**: API stores metadata (alt, caption, description)

This keeps large files off the CMS runtime.

## Technology Stack

| Layer | Technology |
|-------|------------|
| Language | JavaScript (ES Modules) |
| Runtime | Bun (local), Cloudflare Workers (production) |
| Package Manager | Bun |
| Admin Framework | React 18.3.1 |
| Editor | Gutenberg (@wordpress/block-editor, @wordpress/blocks) |
| Database | D1 (SQLite) or any SQL via adapter |
| Storage | R2 (S3-compatible) or any object store via adapter |
| Cache | KV or any KV store via adapter |
| Test Runner | Bun test |

## Getting Started

### 5-Minute Overview

1. **Architecture**: Read this doc (high-level)
2. **Working Reference**: See `docs/skills-reference.md` for detailed patterns
3. **Local Development**:
   ```bash
   # In-memory API (quick testing)
   bun run start:api

   # Cloudflare Worker locally
   wrangler dev

   # Admin UI
   bun run dev:admin
   ```
4. **Run Tests**: `bun test` or `bun run test:coverage`
5. **Documentation**: `docs/` directory has API, architecture, and development guides

### Key Commands

```bash
# Local dev
bun run start:api              # In-memory platform
wrangler dev                   # Cloudflare Worker
bun run dev:admin              # Admin UI

# Development
bun test                        # Run tests
bun run test:coverage            # With coverage (enforces thresholds)
bun run check:boundaries         # Validate port boundaries
bun run lint                     # Lint code

# Documentation
bun run docs:dev                # Start docs site
bun run docs:gen                # Generate API reference
```

## Important File Locations

| Purpose | File |
|---------|-------|
| Architecture overview | `docs/architecture/overview.md` |
| Domain invariants | `docs/architecture/invariants.md` |
| Block content model | `docs/architecture/block-content-model.md` |
| Working reference | `docs/skills-reference.md` (⭐ START HERE) |
| API documentation | `docs/reference/api/` |
| Port contracts | `docs/reference/ports.md` |
| Phase tracker | `PLANNING.md` |
| Original vision | `idea.md` |

## How EdgePress Works

### Editing Content

1. **User edits** in Gutenberg (admin web)
2. **Autosave** creates new `Revision` with block JSON snapshot
3. **Preview** generates signed URL for time-limited access
4. **Publish** compiles current revision to static release
5. **Activate** switches active release pointer
6. **View live** serves static artifact (no database needed)

### Publishing Release

1. Publisher loops through all documents
2. For each document:
   - Serializes block JSON to HTML
   - Resolves media URLs (image blocks with `mediaId`)
   - Writes artifact to blob storage
   - Generates hashes for integrity
3. Creates immutable manifest with:
   - `releaseId`, `schemaVersion`
   - `sourceRevisionId`, `sourceRevisionSet`
   - All artifacts and their hashes
   - `releaseHash` (event fingerprint), `contentHash` (content identity)
4. Stores manifest; activation switches pointer

### Authentication & Authorization

- **Stateless JWT** with `sub` (user ID) and `role` claims
- **Capabilities**: Array of granular permissions (`document:read`, `document:write`, `publish:write`, etc.)
- **No default admin**: Bootstrap credentials required or no access

### Private Content

- **Gated reads**: Authenticated users see private content
- **Still static**: Private pages are just auth-gated static files
- **Scoped caching**: Cache keys include role/context to prevent cache poisoning

## Development Workflow

### Adding a Feature

1. **Domain**: Add entity/invariant to `packages/domain/`
2. **Ports**: Define interface in `packages/ports/`
3. **Adapters**: Implement in `packages/cloudflare/` AND `packages/testing/` (for tests)
4. **API**: Add route to `apps/api/src/features/`
5. **Admin**: Add state/hooks to `apps/admin-web/src/features/`
6. **SDK**: Add client method to `packages/sdk/src/client.js`
7. **Tests**: Add to `packages/testing/test/`
8. **Docs**: Update `docs/` as needed

See `docs/skills-reference.md` for detailed patterns.

### Boundary Enforcement

**Critical Rule**: `apps/api` and `packages/*` (except `cloudflare`) cannot import Cloudflare-specific APIs.

**Why**: Ensures core remains platform-agnostic. You can swap Cloudflare → AWS by changing only the adapter.

**How enforced**: `scripts/check-boundaries.js` catches violations.

### Test Coverage

- **Current baseline**: ~97% lines, ~96% functions
- **Threshold enforced**: `bun run test:coverage` will fail if coverage drops
- **See latest**: Check `PLANNING.md` for current coverage watch

## Common Questions

### Why not just use WordPress?

WordPress is great, but:
- Requires PHP server and database
- Not designed for edge deployment
- Hard to scale static content delivery
- Tight coupling between editor and runtime

EdgePress gives you the Gutenberg editor experience with:
- No PHP
- Static, edge-hosted public sites
- Portable to any runtime
- Modern JavaScript stack

### Can I still use WordPress plugins?

**Phase 12B** is building block parity system. Goal:
- WordPress core blocks work out of the box
- Custom plugins can be ported via block transforms
- Theme.json design tokens supported
- Not all plugins will work (PHP-based ones)

### Why static publishing?

- **Performance**: Serve files from CDN, no database queries
- **Reliability**: Can't crash (static files don't execute code)
- **Cost**: No always-on database servers
- **Security**: Smaller attack surface (no PHP, no SQL in templates)

### What about dynamic content?

EdgePress is optimized for content sites. Dynamic needs:
- **Forms**: Supported (POST to API, stored, can trigger webhooks)
- **Gated content**: Supported (auth check, serve static file from cache)
- **Real-time features**: Not current focus (collaborative editing, etc.)

## Contributing

1. **Read** `docs/skills-reference.md` for detailed patterns
2. **Follow architecture**: Use ports, don't break boundaries
3. **Write tests**: Maintain coverage thresholds
4. **Update docs**: Regenerate API docs after changes (`bun run docs:gen`)
5. **Commit**: Small, focused commits
6. **Review**: Run `bun run lint` and `bun run test:coverage`

## Project Links

- **Repository**: theGeekist/edgepress
- **Issues**: GitHub issues
- **Documentation**: `docs/` directory
- **Phase Status**: `PLANNING.md`

## License

(Add license information here)

---

**Next Step**: For working with the codebase, see `docs/skills-reference.md` - the complete reference for architecture, patterns, tasks, and troubleshooting.
