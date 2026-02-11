---
title: Publish & Releases
---

# Publish & Releases

Publishing produces release artifacts and a manifest.

::: warning WIP
This page is being expanded. For now, the most complete description is in the workflow guide:

- [/guide/workflows/publish](/guide/workflows/publish)
:::

## Endpoints

- `POST /v1/publish` (capability: `publish:write`)
- `GET /v1/publish/:jobId` (capability: `document:read`)
- `GET /v1/releases` (capability: `document:read`)
- `POST /v1/releases/:id/activate` (capability: `publish:write`)

## What publish produces

- an immutable manifest (schemaVersion 2)
- static artifacts written through `releaseStore.writeArtifact`
- an optional provenance set (`sourceRevisionId`, `sourceRevisionSet`)

Source:

- `packages/publish/src/publisher.js`
- `apps/api/src/app.js`

Tests:

- `packages/testing/test/publisher.test.js`
- `packages/testing/test/release.preview.private.test.js`
