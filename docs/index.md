---
title: GCMS
---

# GCMS

Edge-portable standalone Gutenberg CMS skeleton.

## Start here

- Quickstart: [/guide/getting-started](/guide/getting-started)
- Key workflows: [/guide/workflows/auth](/guide/workflows/auth)
- Architecture: [/architecture/overview](/architecture/overview)
- API reference (stable keys from contracts): [/reference/api/](/reference/api/)

## What you're building

GCMS gives you a CMS core that can run at the edge (Cloudflare is the reference adapter today) while keeping the domain and API surface platform-agnostic.

The implementation currently includes:

- Capability-gated auth
- Documents + revisions
- Two-phase media finalize
- Publish jobs that produce immutable releases (manifest + artifacts)
- Preview sessions with TTL clamping
- Private reads of release artifacts (auth-scoped cache)
- Rate-limited forms endpoint

## What lives where

See [/guide/repo-tour](/guide/repo-tour).
