---
title: Concepts
---

# Concepts

GCMS is organized around a few ideas:

- The API edge handler is platform-agnostic; infra details sit behind `ports` and adapters.
- The security model is capability-based. Endpoints require a specific capability string.
- Documents produce revisions. Publishing produces releases.
- Releases are immutable: publish writes artifacts + a manifest, then you can atomically switch the active release.
- Previews are time-limited sessions; private reads serve release artifacts with auth-scoped caching.

For the deeper model and invariants, see [/architecture/overview](/architecture/overview).

## Capability gating

Endpoints call `requireCapability(...)` which enforces:

- Missing bearer token: `AUTH_REQUIRED` (401)
- Invalid token signature: `AUTH_INVALID_TOKEN` (401)
- Missing capability: `FORBIDDEN` (403)

The canonical error envelope is always:

```ts
type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};
```

## Release model

Publishing writes a release manifest (schemaVersion 2) containing:

- `artifacts[]`: route, blob path, hash, contentType
- `artifactHashes[]`, `contentHash`, `releaseHash`

Manifests are immutable after creation.
