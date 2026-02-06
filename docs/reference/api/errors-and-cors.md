---
title: Errors & CORS
---

# Errors & CORS

Error envelope is consistently shaped as:

<<< @/snippets/api-error-envelope.ts

Source:

- `apps/api-edge/src/http.js`

## CORS

The handler returns CORS headers on all responses.

Request headers allowed:

- `content-type`
- `authorization`
- `x-trace-id`
- `x-ip-hash`
- `x-ua-hash`

Origin:

- `DEV_CORS_ORIGIN` env var or `*`
