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

- `apps/api/src/orchestration/release-workflow.js`
- `apps/api/src/app/create-api-handler.js`

Tests:

- `apps/api/test/api.release-workflow.test.js`
- `apps/api/test/release.preview.private.test.js`
