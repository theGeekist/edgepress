---
title: Developer's Guide (Repo Tour)
---

# Developer's Guide to the Codebase

Welcome to the EdgePress monorepo. This guide is designed to help you navigate the code, whether you're adding a feature, fixing a bug, or just exploring.

## Top-Level Structure

We use **Bun workspaces** to manage dependencies. `apps/` are deployable targets, and `packages/` are shared libraries.

```
/
├── apps/               # The executable applications
│   ├── api/       # The backend (Cloudflare Worker / Node Server)
│   └── admin-web/      # The frontend (Vite + React + Gutenberg)
├── packages/           # The shared logic
│   ├── domain/         # Pure business logic (No ext dependencies)
│   ├── content/        # Content capability package
│   ├── auth/           # Auth capability package
│   ├── api-core/       # API boundary/contracts helpers
│   ├── platform-base/  # In-memory platform implementation
│   ├── cloudflare/     # Cloudflare adapter implementation
│   └── testing/        # Shared test utilities/fakes
├── docs/               # This site (VitePress)
└── scripts/            # Build, test, and verification tools
```

## Where to start if...

### ...you want to add a new Feature (e.g., Comments)?
1.  **Start in `packages/domain`**: Define your entities (`Comment`) and use-cases.
2.  **Add capability logic in `packages/*`**: Place feature behavior in a capability package.
3.  **Update `apps/api` adapters/orchestration**: Add thin controllers and orchestration wiring.
4.  **Implement Adapters**: Add clear implementation in `packages/testing` (in-memory) and `packages/cloudflare` (Production).

### ...you want to modify the Admin UI?
- Go to `apps/admin-web`.
- This is a standard Vite + React application.
- It "embeds" the generic Gutenberg packages (`@wordpress/*`) but talks to our custom `apps/api` backend.

### ...you want to change the Storage Layer?
- Look at `packages/cloudflare`.
- You'll see how we map the generic `StructuredStore` port to Cloudflare D1 SQL.
- You can copy this pattern to create `packages/adapters-postgres` or others.

## Key Packages Explained

### `packages/domain`
This is the brain. It contains the "Rules of the Game". It has ZERO dependencies on Cloudflare, Request objects, or Databases. It is pure JS function logic.

### Platform contracts
Contract checks and boundaries are defined in `apps/api/src/orchestration/platform-contracts.js` and shared API helpers under `packages/api-core`.

### `packages/testing`
This is our shared testing support package. The in-memory platform implementation lives in `packages/platform-base`, while tests and fakes are consumed from `packages/testing/src`.
