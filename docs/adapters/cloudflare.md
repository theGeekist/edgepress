---
title: Cloudflare
---

# Cloudflare Adapter

Wrangler config:

- `wrangler.toml`

Adapter code:

- `packages/cloudflare/src/worker.js`

## Bindings

The reference adapter supports these bindings:

- `KV` (optional): cache store + release pointer/history + (fallback) release manifests
- `R2_BUCKET` (optional): blob store for artifacts/media
- `D1` (optional): persistent app store + persistent release store

Bindings are declared in `wrangler.toml`.

## Release persistence

When `D1` is configured, the release store persists:

- manifests (`release_manifests`)
- active release pointer (`release_state`)
- release event history (`release_history`)

When `D1` is not available, it falls back to KV (if present), then in-memory.

Implementation:

- `packages/cloudflare/src/release-store.js`
- `packages/cloudflare/src/d1-sql.js`

## Local and deployed smoke tests

- Local: `bun scripts/test-wrangler-local.js`
- Deployed: `bun scripts/test-wrangler-deployed.js`
