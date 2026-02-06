---
title: Testing
---

# Testing

Run all tests:

```sh
bun test
```

Coverage:

```sh
bun run test:coverage
```

## Wrangler smoke tests

Local Worker (requires `.dev.vars` with secrets):

```sh
cp .dev.vars.example .dev.vars
bun scripts/test-wrangler-local.js
```

Deployed Worker:

```sh
GCMS_BASE_URL="https://gcms-api-edge.<subdomain>.workers.dev" \
GCMS_ADMIN_PASS="..." \
bun scripts/test-wrangler-deployed.js
```
