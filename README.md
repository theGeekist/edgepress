# GCMS

Edge-portable standalone Gutenberg CMS skeleton.

## Layout

- `apps/api-edge`: edge-functions entrypoints (platform-agnostic)
- `apps/admin-web`: web admin integration stubs for Gutenberg + canonical SDK
- `packages/ports`: DI ports for runtime and infrastructure
- `packages/domain`: entities and invariants
- `packages/contracts`: API contract schemas
- `packages/publish`: release manifest and artifact generation
- `packages/adapters-cloudflare`: Cloudflare reference adapters only
- `packages/sdk`: canonical API client
- `packages/testing`: in-memory adapters and tests

## Commands

- `npm test`
- `npm run start:api`
- `npm run check:boundaries`
