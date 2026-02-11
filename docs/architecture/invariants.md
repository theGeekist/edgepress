---
title: Invariants
---

# Invariants

The API and publish flows rely on a few invariants. These are the “don’t break this” rules the tests are designed to protect.

## Error envelope (canonical)

All API errors are returned as:

<<< @/snippets/api-error-envelope.ts

Implementation: `apps/api/src/http.js`

## Capability gating

Protected endpoints require a bearer access token and a capability string.

Capability enforcement rules:

- Missing bearer token: `AUTH_REQUIRED` (401)
- Invalid token signature: `AUTH_INVALID_TOKEN` (401)
- Missing capability: `FORBIDDEN` (403)

Implementation: `apps/api/src/auth.js`

## Preview expiry

Preview is an authenticated API that issues a time-limited URL.

- Preview sessions expire at `expiresAt`.
- `/preview/:token` rejects expired sessions.

Implementation: `packages/domain/src/invariants.js` (`assertPreviewNotExpired`)

## Release immutability

Publishing produces an immutable release manifest:

- Writing a manifest twice for the same `releaseId` is an error.
- Activating a release switches the active pointer; activation is idempotent when activating the current release.

Implementation:

- `packages/domain/src/invariants.js` (`assertReleaseManifestImmutable`)
- `packages/cloudflare/src/release-store.js` (D1/KV/in-memory behavior)

## Publish provenance normalization

Publish optionally accepts provenance fields:

- `sourceRevisionId` (string)
- `sourceRevisionSet` (array of strings)

Normalization rules:

- `sourceRevisionSet` must be an array of non-empty strings.
- If `sourceRevisionId` is provided and not already present, it is inserted at the front.
- If `sourceRevisionId` is omitted, it is derived from the first entry in `sourceRevisionSet`.

Implementation: `packages/domain/src/provenance.js`

## Tests that prove behavior

- `packages/testing/test/api.behavior.test.js`
- `packages/testing/test/api.contract.test.js`
- `packages/testing/test/release.preview.private.test.js`

## Source of truth

- `packages/domain/src/invariants.js`
- `apps/api/src/http.js`
