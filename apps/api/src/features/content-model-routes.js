import { requireCapability } from '../auth.js';
import { error, json, readJson } from '../http.js';

function normalizeSlug(input) {
  const normalized = String(input || '').trim().toLowerCase();
  let slug = '';
  let previousDash = false;
  for (const char of normalized) {
    const isAlnum = (char >= 'a' && char <= 'z') || (char >= '0' && char <= '9');
    if (isAlnum) {
      slug += char;
      previousDash = false;
      continue;
    }
    if (char === '_' || char === '-' || char === ' ') {
      if (!previousDash && slug.length > 0) {
        slug += '-';
        previousDash = true;
      }
    }
  }
  if (slug.endsWith('-')) slug = slug.slice(0, -1);
  return slug;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry || '').trim()).filter(Boolean);
}

function normalizeObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value;
}

async function validateObjectTypes(store, objectTypes) {
  const types = await store.listContentTypes();
  const allowed = new Set((types || []).map((entry) => String(entry?.slug || '')));
  return objectTypes.filter((entry) => allowed.has(entry));
}

async function upsertTerm({ store, id, body }) {
  const taxonomySlug = normalizeSlug(body.taxonomySlug);
  if (!id) return error('TERM_INVALID_ID', 'Term id is required', 400);
  if (!taxonomySlug) return error('TERM_INVALID_TAXONOMY', 'Term taxonomySlug is required', 400);
  const taxonomy = await store.getTaxonomy(taxonomySlug);
  if (!taxonomy) return error('TAXONOMY_NOT_FOUND', 'Taxonomy not found', 404);
  const parentId = body.parentId ? String(body.parentId).trim() : null;
  if (!taxonomy.hierarchical && parentId) {
    return error('TERM_INVALID_PARENT', 'Flat taxonomies do not allow parent terms', 400);
  }
  if (parentId) {
    const parent = await store.getTerm(parentId);
    if (!parent || parent.taxonomySlug !== taxonomySlug) {
      return error('TERM_INVALID_PARENT', 'Parent term must exist in same taxonomy', 400);
    }
  }
  const termSlug = normalizeSlug(body.slug || body.name || id);
  const existing = await store.listTerms({ taxonomySlug });
  const collision = (existing || []).find((entry) => entry.slug === termSlug && entry.id !== id);
  if (collision) {
    return error('TERM_SLUG_CONFLICT', 'Term slug already exists in taxonomy', 409);
  }
  const term = await store.upsertTerm({
    id,
    taxonomySlug,
    slug: termSlug,
    name: String(body.name || body.slug || id).trim(),
    parentId
  });
  return json({ term });
}

export function createContentModelRoutes({ runtime, store, route, authzErrorResponse }) {
  return [
    route('GET', '/v1/content-types', async (request) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        return json({ items: await store.listContentTypes() });
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),
    route('PUT', '/v1/content-types/:slug', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:write' });
        const body = await readJson(request);
        const slug = normalizeSlug(params.slug || body.slug);
        if (!slug) return error('CONTENT_TYPE_INVALID_SLUG', 'Content type slug is required', 400);
        const item = await store.upsertContentType({
          id: body.id || `ct_${runtime.uuid()}`,
          slug,
          label: body.label || slug,
          kind: body.kind || 'content',
          supports: normalizeObject(body.supports),
          fields: Array.isArray(body.fields) ? body.fields : [],
          taxonomies: normalizeStringArray(body.taxonomies),
          statusOptions: normalizeStringArray(body.statusOptions).length
            ? normalizeStringArray(body.statusOptions)
            : ['draft', 'published', 'trash']
        });
        return json({ contentType: item });
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),
    route('GET', '/v1/taxonomies', async (request) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        return json({ items: await store.listTaxonomies() });
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),
    route('PUT', '/v1/taxonomies/:slug', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:write' });
        const body = await readJson(request);
        const slug = normalizeSlug(params.slug || body.slug);
        if (!slug) return error('TAXONOMY_INVALID_SLUG', 'Taxonomy slug is required', 400);
        const objectTypes = await validateObjectTypes(store, normalizeStringArray(body.objectTypes));
        const hierarchical = Boolean(body.hierarchical);
        const constraints = normalizeObject(body.constraints);
        if (!hierarchical) {
          constraints.allowParent = false;
        }
        const item = await store.upsertTaxonomy({
          id: body.id || `tax_${runtime.uuid()}`,
          slug,
          label: body.label || slug,
          hierarchical,
          objectTypes,
          constraints
        });
        return json({ taxonomy: item });
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),
    route('GET', '/v1/terms', async (request) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        const url = new URL(request.url);
        const taxonomySlug = normalizeSlug(url.searchParams.get('taxonomySlug') || '');
        const items = await store.listTerms({ taxonomySlug: taxonomySlug || undefined });
        return json({ items });
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),
    route('PUT', '/v1/terms/:id', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:write' });
        const body = await readJson(request);
        const id = String(params.id || body.id || '').trim();
        return upsertTerm({ store, id, body });
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),
    route('POST', '/v1/terms', async (request) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:write' });
        const body = await readJson(request);
        const id = body.id ? String(body.id).trim() : `term_${runtime.uuid()}`;
        return upsertTerm({ store, id, body: { ...body, id } });
      } catch (e) {
        return authzErrorResponse(e);
      }
    })
  ];
}
