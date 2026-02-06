---
title: Overview
---

# Architecture Overview

GCMS is an edge-portable CMS core designed around a simple constraint: keep the API surface and domain logic platform-agnostic, and push platform-specific I/O behind ports and adapters.

## Top-level components

- API edge app: request routing + auth/capability checks + endpoint behavior.
- Domain: invariants and small pure helpers.
- Ports: the required runtime/platform methods (time, crypto, storage, caching).
- Release publisher: turns documents into immutable release artifacts + a manifest.
- Admin web host: a web-first shell that uses the canonical SDK client.

## Data model (current)

- Document: `doc_*` with `title`, `content`, `status`.
- Revision: `rev_*` created on create/update, chained by `sourceRevisionId`.
- Media: `med_*` with an init session and a finalize step.
- Publish job: `job_*` representing a publish request and outcome.
- Release: `rel_*` with an immutable manifest (schemaVersion 2) and artifact list.
- Preview session: `prv_*` token with TTL and a release-like HTML body.

## Request flow

1. A request hits `apps/api-edge`.
2. The handler verifies bearer auth (when required) and enforces capabilities.
3. The handler delegates reads/writes to `store`, `blobStore`, `releaseStore`, `previewStore`, `cacheStore`.
4. Responses are returned with a canonical JSON envelope for errors.

## Ports and adapters

The API handler takes a `platform` object and asserts required port methods.

- Reference port contract: `packages/ports/src/index.js`
- Reference adapter: `packages/adapters-cloudflare`

The boundary is enforced by `scripts/check-boundaries.js`.

## Releases

Publishing produces:

- HTML artifacts per route (currently: one artifact per document id)
- An immutable release manifest capturing provenance and hashes

Key invariants:

- Manifests are immutable once written.
- The active release pointer can be switched atomically.

Implementation: `packages/publish/src/publisher.js`

## Where behavior is specified

The most reliable truth today is tests:

- API behavior: `packages/testing/test/api.behavior.test.js`
- Contracts: `packages/testing/test/api.contract.test.js`
- Release/private/preview: `packages/testing/test/release.preview.private.test.js`
- SDK client behavior: `packages/testing/test/sdk.client.test.js`
- Admin shell behavior: `packages/testing/test/admin.shell.test.js`

## Background docs

The raw design notes are kept as an appendix:

- [/appendix/idea](/appendix/idea)
