---
title: Preview
---

# Preview

Preview is an authenticated API that issues a time-limited URL you can open without auth.

## Endpoints

- `GET /v1/preview/:documentId` (capability: `document:read`)
- `GET /preview/:token` (no auth)

## TTL rules

Preview TTL is derived from runtime env `PREVIEW_TTL_SECONDS`.

- default: 15 minutes
- min clamp: 30 seconds
- max clamp: 24 hours

## Common errors

- `DOCUMENT_NOT_FOUND` (404)
- `PREVIEW_NOT_FOUND` (404)
- `PREVIEW_EXPIRED` (410)

## Tests that prove behavior

- `packages/testing/test/api.behavior.test.js`
- `packages/testing/test/api.contract.test.js`
- `packages/testing/test/release.preview.private.test.js`
