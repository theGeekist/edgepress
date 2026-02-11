---
title: Auth
---

# Auth

Endpoints live under `/v1/auth/*`.

Source:

- `apps/api/src/app.js`
- `apps/api/src/auth.js`

## Endpoints

- `POST /v1/auth/token`
- `POST /v1/auth/refresh`
- `POST /v1/auth/logout`

## Notes

- Login returns `accessToken`, `refreshToken`, and the user object.
- Refresh revokes the provided refresh token and returns a new pair.
- Logout revokes the provided refresh token.
