---
title: Media
---

# Media

Media upload is currently modeled as a two-phase flow:

1. init a media session (server issues an `uploadToken` and upload URL)
2. finalize (server validates the token and persists the blob)

## Endpoints

- `POST /v1/media` (capability: `media:write`)
- `POST /v1/media/:id/finalize` (capability: `media:write`)
- `GET /v1/media/:id` (capability: `document:read`)

## Token enforcement

Finalize requires the exact `uploadToken` returned from init.

Common errors:

- `MEDIA_NOT_FOUND` (404)
- `MEDIA_UPLOAD_TOKEN_INVALID` (401)

## Tests that prove behavior

- `packages/testing/test/api.behavior.test.js`
- `packages/testing/test/api.contract.test.js`
