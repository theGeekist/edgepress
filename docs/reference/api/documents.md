---
title: Documents
---

# Documents

Endpoints live under `/v1/documents/*`.

Source:

- `apps/api/src/app.js`
- `packages/domain/src/entities.js`

## Endpoints

- `GET /v1/documents` (capability: `document:read`)
- `POST /v1/documents` (capability: `document:write`)
- `PATCH /v1/documents/:id` (capability: `document:write`)
- `GET /v1/documents/:id/revisions` (capability: `document:read`)
- `POST /v1/documents/:id/revisions` (capability: `document:write`)

## Behavior notes

- Creating or updating a document creates a revision.
- `sourceRevisionId` chains revisions together.
