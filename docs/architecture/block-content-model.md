---
title: Block Content Model
---

# Block Content Model (Phase 9)

EdgePress Phase 9 uses **Option A**:

- Canonical source of truth is block JSON (`document.blocks`, `revision.blocks`)
- Published HTML is derived output from canonical blocks

## Schema Contract

- `blocksSchemaVersion` is currently `1`
- Each block must include:
  - `name` (non-empty string)
  - `attributes` (object, defaults to `{}`)
  - `innerBlocks` (array, defaults to `[]`)
- Unknown keys are preserved.

Canonicalization rules in v1:

- Object keys are normalized in deterministic order.
- Nested blocks are recursively normalized.

This canonicalization is part of the v1 hash/serialization contract.

## Publish Contract

During publish:

1. Blocks are normalized.
2. HTML is rendered from normalized blocks.
3. `manifest.artifacts[*].blocksHash` is computed from normalized block JSON.

Manifest behavior:

- `blockHashes` includes non-null artifact `blocksHash` values.
- Missing `blocks` (not present or non-array) maps to a deterministic empty-block hash.
- Structurally invalid block arrays are logged and omitted from `blockHashes`.

## Legacy HTML Compatibility

Legacy revisions/documents that are HTML-first remain compatible:

- If blocks are absent, publish falls back to `content`.
- Editor open uses stored blocks when present, otherwise parses `content`.
- Editor save persists sanitized canonical blocks and serialized HTML.

This provides a migration path from HTML-first history to canonical block JSON without a blocking backfill.

## Trust Boundary

Publisher output intentionally renders author-provided content as HTML.

- Title interpolation is escaped.
- Canonical content HTML is not sanitized in publisher.

If untrusted authors or external imports are introduced, sanitization must be enforced at authoring/import boundaries.
