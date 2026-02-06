---
title: Private Reads
---

# Private Reads

Private reads are authenticated reads of release artifacts. The handler:

- resolves the active release
- finds the requested route in the active manifest
- fetches the artifact bytes from blob storage
- caches the result per user+release+route

## Endpoint

- `GET /v1/private/:route` (capability: `private:read`)

## Common errors

- `RELEASE_NOT_ACTIVE` (404)
- `ROUTE_NOT_FOUND` (404)
- `ARTIFACT_NOT_FOUND` (404)

## Tests that prove behavior

- `packages/testing/test/release.preview.private.test.js`
- `packages/testing/test/api.contract.test.js`
