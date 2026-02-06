---
title: SDK
---

# SDK

The canonical client lives in `packages/sdk`.

Source:

- `packages/sdk/src/client.js`

## What it does

The SDK is a thin client over the API:

- attaches `Authorization: Bearer <token>` when `getAccessToken()` is provided
- retries once on `401` if `onTokenRefresh()` is configured
- surfaces errors as a structured `ApiRequestError`

## Error model

On non-2xx responses, the client throws an error with:

- `name = "ApiRequestError"`
- `status` (HTTP status)
- `code` (from the API error envelope)
- `path` and `method`
- `payload` (parsed JSON when possible)

## Proven behavior (tests)

- `packages/testing/test/sdk.client.test.js`

## Twoslash

This doc site supports Twoslash blocks for type hovers.

```ts twoslash
type Capability =
  | "document:read"
  | "document:write"
  | "media:write"
  | "publish:write"
  | "private:read";

const cap: Capability = "document:read";
//      ^?
```
