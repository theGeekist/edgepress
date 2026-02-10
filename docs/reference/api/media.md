---
title: Media
---

# Media

Two-phase media upload:

- init: `POST /v1/media` (capability: `media:write`)
- finalize: `POST /v1/media/:id/finalize` (capability: `media:write`)
- read: `GET /v1/media/:id` (capability: `document:read`)

## Request/response (high level)

Init returns an upload URL and an upload token:

```json
{
  "mediaId": "med_...",
  "uploadUrl": "https://...",
  "uploadToken": "...",
  "requiredHeaders": {}
}
```

Finalize requires the upload token and file metadata:

```json
{
  "uploadToken": "...",
  "filename": "image.png",
  "mimeType": "image/png",
  "size": 1234
}
```

Returns:

```json
{ "media": { "id": "med_..." } }
```

Source:

- `apps/api/src/app.js`

Tests:

- `packages/testing/test/api.behavior.test.js`
- `packages/testing/test/api.contract.test.js`
