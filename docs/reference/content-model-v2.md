---
title: Content Model v2 (Proposed)
---

# Content Model v2 (Proposed)

This document defines the next canonical model for content, content types, fields, and taxonomy.

Goals:

- Keep EdgePress model clean and first-class.
- Preserve WordPress import/export parity at adapter boundaries.
- Avoid leaking WP-specific storage decisions into core domain entities.

## Design principles

- Canonical source for editor content is `blocks`.
- `content` HTML is not canonical (keep only as migration/compat field).
- Content types, fields, taxonomies, and terms are first-class domain entities.
- Compatibility passthrough is flat (`raw`) and optional.
- API shape stays stable while adapters map to/from WP.
- All uniqueness constraints are evaluated within a workspace/site boundary (v1 may be single-tenant, model remains scoped).

## Domain invariants

- `document.blocks` is canonical editor content.
- `document.legacyHtml` is optional migration/compat content and may be empty even when blocks are present.
- `document.type` must resolve to an existing `ContentType.slug` in the content type registry.
- `document.status` must be listed in the resolved content type `statusOptions`.
- `term.taxonomySlug` must resolve to an existing `taxonomy.slug`.
- if `taxonomy.hierarchical` is `false`, then `term.parentId` must be `null`.
- `document.termIds` must point to existing terms whose taxonomy includes the document type in `taxonomy.objectTypes`.
- `document.fields` keys must be declared in the resolved `ContentType.fields`; unknown keys are rejected by core write APIs.
- adapters must normalize invalid imports to satisfy these invariants before persistence.

## Slug uniqueness and mutability

- `contentType.slug`: globally unique.
- `taxonomy.slug`: globally unique and immutable after creation.
- `term.slug`: unique within `(taxonomySlug)`.
- `document.slug`: unique within `(document.type)` for a site/workspace.
- all slugs are normalized to lowercase kebab-case at write time.

Slug normalization contract:

- `normalizeSlug(input)` is deterministic:
  - trim
  - optional unicode NFKD fold
  - replace whitespace/underscore runs with `-`
  - remove characters outside `[a-z0-9-]`
  - collapse repeated `-`
  - strip leading/trailing `-`
  - lowercase

## Canonical entities

### `ContentType`

```json
{
  "id": "ct_post",
  "slug": "post",
  "label": "Post",
  "kind": "content",
  "supports": {
    "title": true,
    "editor": true,
    "excerpt": true,
    "featuredImage": true,
    "revisions": true
  },
  "fields": [
    {
      "key": "subtitle",
      "label": "Subtitle",
      "kind": "text",
      "required": false,
      "default": "",
      "constraints": {
        "maxLength": 140
      }
    }
  ],
  "taxonomies": ["category", "post_tag"],
  "statusOptions": ["draft", "published", "trash"],
  "createdAt": "2026-02-09T00:00:00.000Z",
  "updatedAt": "2026-02-09T00:00:00.000Z"
}
```

Supported baseline field kinds:

- `text`
- `textarea`
- `number`
- `boolean`
- `date`
- `datetime`
- `enum`
- `json`

Common baseline constraints:

- `min`
- `max`
- `maxLength`
- `pattern`
- `options` (enum)
- `unique` (optional)

### `Taxonomy`

```json
{
  "id": "tax_category",
  "slug": "category",
  "label": "Categories",
  "hierarchical": true,
  "objectTypes": ["post", "page"],
  "constraints": {
    "maxDepth": null,
    "uniqueTermNameWithinSiblings": true
  },
  "createdAt": "2026-02-09T00:00:00.000Z",
  "updatedAt": "2026-02-09T00:00:00.000Z"
}
```

Taxonomy constraint precedence:

- `hierarchical` is the parent/child master switch.
- when `hierarchical` is `false`, parent relationships are disallowed regardless of other constraints.

### `Term`

```json
{
  "id": "term_news",
  "taxonomySlug": "category",
  "slug": "news",
  "name": "News",
  "parentId": null,
  "createdAt": "2026-02-09T00:00:00.000Z",
  "updatedAt": "2026-02-09T00:00:00.000Z"
}
```

### `Document`

```json
{
  "id": "doc_12be58f44db8",
  "type": "post",
  "status": "draft",
  "title": "Untitled",
  "slug": "untitled",
  "excerpt": "",
  "featuredImageId": "",
  "blocks": [],
  "blocksSchemaVersion": 1,
  "legacyHtml": "",
  "fields": {
    "subtitle": "",
    "seoTitle": ""
  },
  "termIds": ["term_news"],
  "raw": {
    "meta": {
      "_yoast_wpseo_title": "Untitled"
    },
    "source": {
      "system": "wp",
      "entity": "post",
      "externalId": 42
    },
    "import": {
      "fingerprint": "sha256:...",
      "importedAt": "2026-02-09T00:00:00.000Z"
    }
  },
  "createdBy": "u_admin",
  "createdAt": "2026-02-09T00:00:00.000Z",
  "updatedAt": "2026-02-09T00:00:00.000Z"
}
```

`raw` policy:

- `raw` is never used for product behavior in domain logic.
- `raw` exists for lossless import/export, migration carry-through, and diagnostics.
- adapters map unknown external/plugin fields to `raw` (not `fields`).

## Revision model

Revisions remain immutable snapshots with monotonic history:

- create/update document => create revision
- revisions snapshot all user-editable fields that affect publish output:
  - `title`
  - `excerpt`
  - `slug`
  - `status`
  - `featuredImageId`
  - `blocks`
  - `blocksSchemaVersion`
  - `fields`
  - `termIds`
  - optional `legacyHtml`
- revision stores `sourceRevisionId` for chain lineage
- `sourceRevisionId` links to previous revision
- canonical editor content in history remains `blocks`
- revisions do not snapshot `raw`; `raw` remains document-level import/provenance metadata only

This enables rollback/audit without coupling to publish artifacts.

## Relationship model

- API-level document shape includes `termIds` for simplicity.
- Storage adapters may persist document-term relationships as joins for query performance.
- Query APIs materialize `termIds` on read.
- document-term assignment is many-to-many: a document may have `0..n` terms across `0..n` taxonomies.

## WordPress compatibility mapping

Compatibility is adapter-only. Core model stays EP-native.

### WP -> EP

- `post.type`/CPT -> `document.type`
- `title.rendered|raw` -> `document.title`
- `content.raw|rendered` -> `document.legacyHtml` (optional) and parsed `document.blocks`
- `excerpt.raw|rendered` -> `document.excerpt`
- `status` -> `document.status`
- `slug` -> `document.slug`
- `featured_media` -> `document.featuredImageId` (mapped media id)
- taxonomy arrays (`categories`, `tags`, custom) -> `document.termIds`
- known meta keys -> mapped `document.fields.*`
- unknown plugin meta -> `document.raw.meta`

### EP -> WP

- `document.type` -> WP post type endpoint (`posts`, `pages`, CPT)
- `document.title`/`excerpt`/`slug`/`status` direct map
- `document.blocks` serialized for WP `content`
- `document.termIds` grouped by taxonomy into WP taxonomy fields
- mapped fields -> WP `meta`
- `document.raw.meta` merged for passthrough export (with allowlist controls)

Import idempotence:

- adapters compute and persist `raw.import.fingerprint`.
- re-import with unchanged fingerprint is treated as a no-op unless explicitly forced.
- recommended deterministic fingerprint basis:
  - `system`
  - `entity`
  - `externalId`
  - upstream modified timestamp (`modified`/`modified_gmt` when available)
  - canonicalized payload subset hash

## OpenAPI and contract strategy

Two specs are recommended:

1. EP API OpenAPI (`/v1/*`) as source of truth for product clients.
2. WP-compat OpenAPI profile (`/wp/v2/*`) for Gutenberg interoperability tests.

Both should be validated in CI with:

- schema linting
- response conformance tests
- golden compatibility tests for key WP editor flows

Recommended golden fixture matrix:

- WP post with `categories`, `tags`, and custom taxonomy terms.
- WP post with known + unknown meta (passthrough verification).
- CPT payload with mapped custom fields + retained unknown meta.
- hierarchical taxonomy import (parent/child + invalid parent normalization).
- term slug collision handling inside the same taxonomy.
- idempotent re-import using identical `raw.import.fingerprint`.

## Migration plan from current model

1. Keep `content` readable for backward compatibility; move write-path to `legacyHtml`.
2. Add `fields`, `termIds`, `raw`, `excerpt` to document writes/reads.
3. Introduce `contentTypes`, `taxonomies`, `terms` endpoints and persistence.
4. Move current UI pseudo-taxonomy fields to real entities.
5. Mark `content` deprecated in API docs and eventually remove from write contracts.
6. Update WP adapters to map through new model.

## Non-goals

- Reproducing WP database structure internally.
- Storing publish/render artifacts in canonical document rows.
- Encoding plugin-specific logic in core entities.
