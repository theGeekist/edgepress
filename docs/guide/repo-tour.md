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
│   ├── ports/          # Interfaces for infrastructure
│   ├── adapters-*/     # Implementations of ports
│   └── sdk/            # The canonical client used by the Admin
├── docs/               # This site (VitePress)
└── scripts/            # Build, test, and verification tools
```

## Where to start if...

### ...you want to add a new Feature (e.g., Comments)?
1.  **Start in `packages/domain`**: Define your entities (`Comment`) and use-cases.
2.  **Define Ports in `packages/ports`**: How will comments be stored? Add `CommentStore` interface.
3.  **Update `apps/api`**: Add the route handlers for your new use-cases.
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

### `packages/ports`
These are the Contracts. They define the "shape" of the infrastructure. We use TypeScript JSDoc comments to strictly define input/outputs.

### `packages/testing`
This is our secret weapon. It contains a complete **In-Memory Platform**. This allows us to run the entire API test suite in milliseconds without spinning up any containers or real databases.
