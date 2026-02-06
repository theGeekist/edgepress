---
title: Auth
---

# Auth

This workflow covers:

- exchanging credentials for `{ accessToken, refreshToken }`
- refreshing access tokens
- revoking refresh tokens on logout

## Endpoints

- `POST /v1/auth/token` (no auth)
- `POST /v1/auth/refresh` (no auth)
- `POST /v1/auth/logout` (no auth)

## Request/response

Login:

```json
{ "username": "admin", "password": "admin" }
```

Response:

```json
{ "accessToken": "...", "refreshToken": "...", "user": { "id": "...", "username": "admin", "capabilities": [] } }
```

Refresh:

```json
{ "refreshToken": "r_..." }
```

## Error behavior

All API errors return the canonical envelope `{"error":{"code","message"}}`.

Common auth errors:

- `AUTH_INVALID` (401): invalid username/password
- `AUTH_INVALID_REFRESH` (401): refresh token invalid or revoked

## SDK usage

`packages/sdk` exposes `token()`, `refresh()`, `logout()`.

<<< @/snippets/sdk-auth.js

## Tests that prove behavior

- `packages/testing/test/api.contract.test.js`
- `packages/testing/test/api.behavior.test.js`
