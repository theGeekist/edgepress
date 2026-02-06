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
- `npm run test:wrangler` (local Wrangler smoke: auth -> publish -> private -> preview -> releases)
- `npm run test:wrangler:deployed` (deployed smoke; requires `GCMS_BASE_URL` and `GCMS_ADMIN_PASS`)
- `npm run test:coverage:gate` (runs coverage and enforces min thresholds; excludes test helper files from threshold math)

## Cloudflare Env Hygiene

- Keep secrets out of `wrangler.toml`.
- For local dev, copy `.dev.vars.example` to `.dev.vars` and set real values.
- For deployed environments, use Wrangler secrets:
  - `wrangler secret put TOKEN_KEY`
  - `wrangler secret put PREVIEW_TOKEN_KEY`
  - `wrangler secret put PRIVATE_CACHE_SCOPE_KEY`
  - `wrangler secret put BOOTSTRAP_ADMIN_PASSWORD`
- Set `BOOTSTRAP_ADMIN_USERNAME` in `wrangler.toml` (or env) for first-user bootstrap; no default admin is created when bootstrap creds are absent.
