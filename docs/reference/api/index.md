---
title: API
---

# API

This section documents the API surface that is implemented in `apps/api-edge` and validated by contract tests.

Current source of truth:

- `packages/contracts/src/index.js` (contract schemas)
- `apps/api-edge/src/app.js` (implementation)

## Conventions

- Base paths are under `/v1/*`.
- Auth is bearer token based.
- Capability gating returns consistent error envelopes.
- CORS is enabled (development origin via `DEV_CORS_ORIGIN`, default `*`).

Pages:

- [/reference/api/auth](/reference/api/auth)
- [/reference/api/documents](/reference/api/documents)
- [/reference/api/media](/reference/api/media)
- [/reference/api/publish-and-releases](/reference/api/publish-and-releases)
- [/reference/api/previews-and-private](/reference/api/previews-and-private)
- [/reference/api/errors-and-cors](/reference/api/errors-and-cors)

## Implemented routes (stable response keys)

The repo currently tracks required request/response keys in a small contracts map.

Generated view:

- [/reference/api/routes.generated](/reference/api/routes.generated)
