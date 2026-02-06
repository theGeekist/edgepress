---
title: Publish & Releases
---

# Publish & Releases

Publishing produces a release: immutable artifacts + an immutable manifest. Releases are listed and one release is considered active.

## Endpoints

- `POST /v1/publish` (capability: `publish:write`)
- `GET /v1/publish/:jobId` (capability: `document:read`)
- `GET /v1/releases` (capability: `document:read`)
- `POST /v1/releases/:id/activate` (capability: `publish:write`)

## Provenance

The publish payload can include:

- `sourceRevisionId` (string)
- `sourceRevisionSet` (array of string)

The implementation canonicalizes provenance:

- rejects invalid shapes with `PUBLISH_INVALID_SOURCE_SET` (400)
- sets `sourceRevisionId` to the first entry of `sourceRevisionSet` when omitted

## Immutability

Manifests are immutable once written.

## Persistence in the Cloudflare adapter

If the Cloudflare reference adapter has `D1` bound, release manifests/history and the active release pointer are persisted in D1.

## Tests that prove behavior

- `packages/testing/test/release.preview.private.test.js`
- `packages/testing/test/publisher.test.js`
- `packages/testing/test/api.behavior.test.js`
