---
title: Forms
---

# Forms

Forms are a public submission endpoint with optional runtime rate limiting.

## Endpoint

- `POST /v1/forms/:formId/submit` (no auth)

## Rate limiting

If the runtime provides `rateLimit`, the endpoint limits by (formId, ipHash):

- `max = 5` submissions per `windowMs = 60_000`

On limit exceeded, returns `RATE_LIMITED` (429).

## Tests that prove behavior

- `apps/api/test/api.behavior.test.js`
- `apps/api/test/api.contract.test.js`
