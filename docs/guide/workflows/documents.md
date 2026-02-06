---
title: Documents
---

# Documents

Documents are the canonical content objects in the store. Updates automatically create revisions.

## Endpoints

- `GET /v1/documents` (capability: `document:read`)
- `POST /v1/documents` (capability: `document:write`)
- `PATCH /v1/documents/:id` (capability: `document:write`)

## Revision model

On create:

- a document is created
- an initial revision is created with `sourceRevisionId: null`

On update:

- the document is updated
- a new revision is created with `sourceRevisionId = latestRevision.id`

## SDK usage

<<< @/snippets/sdk-documents.js

## Tests that prove behavior

- `packages/testing/test/api.contract.test.js`
- `packages/testing/test/api.behavior.test.js`
