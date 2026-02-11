---
title: Roadmap
---

# Roadmap

This page is intentionally user-facing: what exists now, what is next, and what is explicitly out of scope.

## Implemented today

- Auth and capability gating
- Documents + revisions
- Media init/finalize semantics
- Publish jobs and releases (immutable manifest + activation)
- Preview sessions with TTL clamping
- Private reads of release artifacts with auth-scoped cache
- Forms endpoint with optional runtime rate limiting

## Next milestones

- Replace contract placeholders with a generated reference (contracts-driven now; OpenAPI later)
- Promote release artifacts from "document id routes" to first-class routes
- Stronger provenance tracking from revisions to releases
- Production adapters beyond Cloudflare (keep the API handler unchanged)

## Backlog / exploration

- Versioning strategy for contracts and SDK
- Observability conventions (trace ids, structured logs, metrics)

## Raw planning notes

For full planning context and historical notes:

- [/internal/planning](/internal/planning)
