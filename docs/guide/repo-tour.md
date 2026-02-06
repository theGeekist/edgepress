---
title: Repo Tour
---

# Repo Tour

This repo is a monorepo with two apps and a set of packages.

## Apps

- `apps/api-edge`: platform-agnostic API entrypoints and routing
- `apps/admin-web`: Gutenberg admin integration + canonical SDK store wiring

## Packages

- `packages/sdk`: canonical API client used by admin integration
- `packages/contracts`: API contract schemas (current source for API reference)
- `packages/domain`: entities + invariants
- `packages/ports`: runtime/platform port contracts
- `packages/publish`: release manifest + artifact generation
- `packages/testing`: in-memory platform and tests
- `packages/adapters-cloudflare`: Cloudflare reference adapter
