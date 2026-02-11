# WordPress REST API Compatibility Profile

**Version**: 1.0.0
**Schema Version**: 1
**Last Updated**: 2025-02-11

This document describes the compatibility level between EdgePress and the WordPress REST API (WP v2). It is intended for developers integrating WordPress clients or plugins with EdgePress.

## Overview

EdgePress provides a `/wp/v2` façade that offers partial WordPress REST API compatibility. This allows WordPress clients (like Gutenberg's `core-data` module) to work with EdgePress with minimal modification.

**Important**: The `/wp/v2` endpoints are a **compatibility layer** over EdgePress's canonical API (`/v1/*`). The canonical data model is defined by EdgePress entities and ports.

---

## Guaranteed Support

The following behaviors are guaranteed to match WordPress REST API semantics.

### Endpoints

| Endpoint | Methods | Status | Notes |
|----------|---------|--------|-------|
| `/wp/v2/settings` | GET | ✅ Full | Returns site settings object |
| `/wp/v2/themes` | GET | ✅ Full | Returns active theme |
| `/wp/v2/types` | GET | ✅ Full | Returns all content types |
| `/wp/v2/types/:type` | GET | ✅ Full | Returns single content type |
| `/wp/v2/posts` | GET, POST | ✅ Full | List and create posts |
| `/wp/v2/posts/:id` | GET, POST | ✅ Full | Read and update posts |
| `/wp/v2/pages` | GET, POST | ✅ Full | List and create pages |
| `/wp/v2/pages/:id` | GET, POST | ✅ Full | Read and update pages |
| `/v1/wp/v2/*` | * | ✅ Full | Prefixed variant of all above endpoints |

### Authentication

All `/wp/v2` endpoints require Bearer token authentication with appropriate capabilities:

- `document:read` for GET operations
- `document:write` for POST/PUT operations

**Note**: Unlike WordPress, EdgePress does not support cookie authentication or nonce-based authentication for the REST API.

### Response Format

Entity responses (posts, pages) include these guaranteed fields:

```javascript
{
  id: number,              // WP numeric ID (deterministic hash of internal ID)
  date: string,            // ISO 8601 creation date
  date_gmt: string,        // Same as date (UTC)
  modified: string,        // ISO 8601 modification date
  modified_gmt: string,    // Same as modified (UTC)
  slug: string,            // URL slug
  status: string,          // draft, published, trash, etc.
  type: string,            // 'post' or 'page'
  link: string,            // Full permalink URL
  title: {                 // Title object
    raw: string,
    rendered: string
  },
  content: {               // Content object
    raw: string,
    rendered: string,
    protected: false
  },
  excerpt: {               // Excerpt object
    raw: string,
    rendered: string,
    protected: false
  },
  featured_media: number,  // 0 if none, otherwise WP numeric media ID
  meta: {}                 // Empty object (reserved for future use)
}
```

### ID Mapping

EdgePress uses string internal IDs (e.g., `doc_abc123`, `med_xyz789`) while WordPress uses numeric IDs. The façade provides deterministic bidirectional mapping:

- **Internal → WP**: Hash-based deterministic mapping to 31-bit positive integer
- **WP → Internal**: Reverse lookup through document list (O(n) for n documents)

Both internal IDs (e.g., `doc_123`) and WP numeric IDs work in `/:id` parameters.

### Content Field Handling

The façade accepts content in multiple formats:

```javascript
// String content
{ content: 'raw html' }

// Object with raw field
{ content: { raw: 'raw html' } }

// Object with rendered field
{ content: { rendered: 'html' } }
```

### Settings Response

`GET /wp/v2/settings` returns:

```javascript
{
  title: string,
  description: string,
  url: string,
  email: string,
  timezone: string,
  date_format: string,
  time_format: string,
  start_of_week: number,
  language: string,
  use_smilies: boolean,
  default_category: number,
  default_post_format: string,
  posts_per_page: number,
  show_on_front: string,
  page_on_front: number,
  page_for_posts: number,
  default_ping_status: string,
  default_comment_status: string,
  site_logo: number,
  site_icon: number
}
```

### Types Response

`GET /wp/v2/types` returns:

```javascript
{
  post: {
    slug: 'post',
    name: 'Posts',
    rest_base: 'posts',
    viewable: true,
    labels: { ... },
    supports: {
      title: true,
      editor: true,
      excerpt: true,
      thumbnail: true,
      author: true
    }
  },
  page: { /* similar structure */ }
}
```

### Themes Response

`GET /wp/v2/themes` returns an array with one active theme:

```javascript
[{
  stylesheet: 'edgepress',
  template: 'edgepress',
  slug: 'edgepress',
  status: 'active',
  name: { raw: 'EdgePress' },
  version: '1.0.0',
  author: { raw: 'EdgePress' }
}]
```

---

## Partial Support

The following features have partial support with noted caveats.

### Content Type Field Preserved

When updating via `/wp/v2/posts/:id` or `/wp/v2/pages/:id`, the following EdgePress canonical fields are preserved:

- `excerpt`
- `fields`
- `termIds`
- `raw`
- `blocks`
- `blocksSchemaVersion`

These cannot be modified via the WP façade but are retained on update.

### Pagination

List endpoints support query parameters:

- `page`: Page number (default: 1)
- `per_page`: Items per page (default: 100, max: 100)
- `status`: Filter by status (`draft`, `published`, `trash`, `all`)
- `slug`: Filter by slug (exact match)

**Caveat**: Not all WP pagination parameters are supported (e.g., `offset`, `exclude`, `include`, `order`, `orderby`).

### Filtering

Posts and pages can be filtered by:

- `status`: Document status
- `slug`: Exact slug match

**Not supported**: `author`, `categories`, `tags`, `sticky`, search.

### Context Parameter

WordPress REST API supports `?context=embed/view/edit` for different response shapes. EdgePress does not support this parameter and always returns the full response.

---

## Out of Scope

The following WordPress REST API features are explicitly out of scope for EdgePress's WP compatibility layer.

### Unsupported Endpoints

| Category | Endpoints | Notes |
|----------|-----------|-------|
| Media | `/wp/v2/media/*` | Use `/v1/media/*` instead |
| Taxonomies | `/wp/v2/categories/*`, `/wp/v2/tags/*` | Use `/v1/terms/*` instead |
| Users | `/wp/v2/users/*` | Use `/v1/auth/*` instead |
| Comments | `/wp/v2/comments/*` | Not supported |
| Search | `?search=term` | Not supported |
| Revisions | `/wp/v2/posts/:id/revisions` | Use `/v1/documents/:id/revisions` instead |
| Post Statuses | `/wp/v2/statuses/*` | Use `/v1/content-types/*` instead |

### Unsupported Entity Fields

The following WP entity fields are not supported:

- `author`: Author object (always omitted)
- `categories`: Category array
- `tags`: Tag array
- `format`: Post format (always `standard`)
- `password`: Post password
- `comment_status`: Comment status
- `ping_status`: Ping status
- `sticky`: Sticky post flag
- `template`: Page template
- `parent`: Parent post/page ID
- `menu_order`: Menu order
- `guid`: GUID field

### Unsupported Operations

- Batch operations (`/batch`)
- Autocomplete endpoints
- Embedded responses (`_embed` parameter)
- Link header pagination
- CORS support (use canonical CORS configuration)
- JSONP callbacks

---

## Error Responses

Error responses follow WordPress REST API conventions:

```javascript
{
  code: string,          // Error code (e.g., 'rest_post_invalid_id')
  message: string,       // Human-readable error message
  data: {
    status: number       // HTTP status code
  }
}
```

Common error codes:

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `rest_post_invalid_id` | 404 | Post/Page not found |
| `AUTH_REQUIRED` | 401 | Authentication required |
| `AUTH_INVALID_TOKEN` | 401 | Invalid access token |
| `FORBIDDEN` | 403 | Missing required capability |

---

## Versioning

This compatibility profile is versioned independently of EdgePress itself:

- **Profile Version**: Follows semantic versioning (1.0.0)
- **Breaking Changes**: Incremented when compatibility guarantees change
- **Additions**: Minor version for new guaranteed features
- **Bug Fixes**: Patch version for corrections

When integrating, declare your required profile version:

```javascript
// Example: requires EdgePress WP compatibility profile 1.0.0+
const REQUIRED_WP_PROFILE = '1.0.0';
```

---

## Migration Notes

### Migrating from WordPress to EdgePress

1. **Use `/v1/*` endpoints for new development** - `/wp/v2/*` is a compatibility layer
2. **Block content is canonical** - Use `blocks` field, not `content`
3. **Media is two-phase upload** - See `/v1/media/init` and `/v1/media/:id/finalize`
4. **Navigation is separate** - Use `/v1/navigation/menus/*`

### Migrating from EdgePress to WordPress

1. **Numeric IDs are different** - Export internal ID mapping if needed
2. **Feature parity gaps** - Some EdgePress features (blocks, fields) don't map to WP
3. **Authentication differs** - EdgePress uses JWT Bearer tokens

---

## Future Roadmap

Potential future additions to the compatibility layer (not committed):

- Media endpoint façade (`/wp/v2/media/*`)
- Term/category façade (`/wp/v2/categories`, `/wp/v2/tags`)
- Better search support
- Additional filtering options
- Context parameter support

These are tracked in Phase 14 planning and are subject to change.
