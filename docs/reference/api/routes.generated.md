---
title: Routes (generated)
---

# Routes (generated)

This page is generated from `packages/contracts/src/index.js`.

It documents required request/response keys (not full schemas).

| Method | Path | Body keys | Response keys |
| --- | --- | --- | --- |
| POST | `/v1/auth/logout` | `refreshToken` | `ok` |
| POST | `/v1/auth/refresh` | `refreshToken` | `accessToken`, `refreshToken` |
| POST | `/v1/auth/token` | `username`, `password` | `accessToken`, `refreshToken`, `user` |
| GET | `/v1/documents` | - | `items` |
| POST | `/v1/documents` | `title`, `content`, `type`, `slug`, `status`, `blocks` | `document`, `revision` |
| DELETE | `/v1/documents/:id` | - | `ok` |
| PATCH | `/v1/documents/:id` | `title`, `content`, `type`, `slug`, `status`, `blocks` | `document`, `revision` |
| GET | `/v1/documents/:id/revisions` | - | `items` |
| POST | `/v1/documents/:id/revisions` | - | `revision` |
| POST | `/v1/forms/:formId/submit` | `payload` | `submissionId` |
| POST | `/v1/media` | - | `mediaId`, `uploadUrl`, `uploadToken`, `requiredHeaders` |
| GET | `/v1/media/:id` | - | `media` |
| POST | `/v1/media/:id/finalize` | `uploadToken`, `filename`, `mimeType`, `size` | `media` |
| GET | `/v1/preview/:documentId` | - | `previewUrl`, `expiresAt`, `releaseLikeRef` |
| GET | `/v1/private/:route` | - | `route`, `html`, `releaseId` |
| POST | `/v1/publish` | - | `job` |
| GET | `/v1/publish/:jobId` | - | `job` |
| GET | `/v1/releases` | - | `items`, `activeRelease` |
| POST | `/v1/releases/:id/activate` | - | `activeRelease` |
