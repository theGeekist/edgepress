function normalizeSlug(input) {
  const normalized = String(input || '').trim().toLowerCase();
  let slug = '';
  let previousDash = false;
  for (const char of normalized) {
    const isAlnum = /[\p{Letter}\p{Number}]/u.test(char);
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

export function createContentModelFeature({ runtime, store }) {
  async function listContentTypes() {
    return { items: await store.listContentTypes() };
  }

  async function upsertContentType({ paramsSlug, body }) {
    const slug = normalizeSlug(paramsSlug || body.slug);
    if (!slug) return { error: { code: 'CONTENT_TYPE_INVALID_SLUG', message: 'Content type slug is required', status: 400 } };
    const existing = await store.getContentType(slug);
    const statusOptions = normalizeStringArray(body.statusOptions);
    const item = await store.upsertContentType({
      id: body.id || existing?.id || `ct_${runtime.uuid()}`,
      slug,
      label: body.label || slug,
      kind: body.kind || 'content',
      supports: normalizeObject(body.supports),
      fields: Array.isArray(body.fields) ? body.fields : [],
      taxonomies: normalizeStringArray(body.taxonomies),
      statusOptions: statusOptions.length ? statusOptions : ['draft', 'published', 'trash']
    });
    return { contentType: item };
  }

  async function listTaxonomies() {
    return { items: await store.listTaxonomies() };
  }

  async function upsertTaxonomy({ paramsSlug, body }) {
    const slug = normalizeSlug(paramsSlug || body.slug);
    if (!slug) return { error: { code: 'TAXONOMY_INVALID_SLUG', message: 'Taxonomy slug is required', status: 400 } };
    const existing = await store.getTaxonomy(slug);
    const objectTypes = await validateObjectTypes(store, normalizeStringArray(body.objectTypes));
    const hierarchical = Boolean(body.hierarchical);
    const constraints = normalizeObject(body.constraints);
    if (!hierarchical) {
      constraints.allowParent = false;
    }
    const item = await store.upsertTaxonomy({
      id: body.id || existing?.id || `tax_${runtime.uuid()}`,
      slug,
      label: body.label || slug,
      hierarchical,
      objectTypes,
      constraints
    });
    return { taxonomy: item };
  }

  async function listTerms({ taxonomySlug }) {
    const slug = normalizeSlug(taxonomySlug || '');
    const items = await store.listTerms({ taxonomySlug: slug || undefined });
    return { items };
  }

  async function upsertTerm({ id, body }) {
    const taxonomySlug = normalizeSlug(body.taxonomySlug);
    if (!id) return { error: { code: 'TERM_INVALID_ID', message: 'Term id is required', status: 400 } };
    if (!taxonomySlug) return { error: { code: 'TERM_INVALID_TAXONOMY', message: 'Term taxonomySlug is required', status: 400 } };
    const taxonomy = await store.getTaxonomy(taxonomySlug);
    if (!taxonomy) return { error: { code: 'TAXONOMY_NOT_FOUND', message: 'Taxonomy not found', status: 404 } };
    const parentId = body.parentId ? String(body.parentId).trim() : null;
    if (!taxonomy.hierarchical && parentId) {
      return { error: { code: 'TERM_INVALID_PARENT', message: 'Flat taxonomies do not allow parent terms', status: 400 } };
    }
    if (parentId) {
      const parent = await store.getTerm(parentId);
      if (!parent || parent.taxonomySlug !== taxonomySlug) {
        return { error: { code: 'TERM_INVALID_PARENT', message: 'Parent term must exist in same taxonomy', status: 400 } };
      }
    }
    const termSlug = normalizeSlug(body.slug || body.name || id);
    const existing = await store.listTerms({ taxonomySlug });
    const collision = (existing || []).find((entry) => entry.slug === termSlug && entry.id !== id);
    if (collision) {
      return { error: { code: 'TERM_SLUG_CONFLICT', message: 'Term slug already exists in taxonomy', status: 409 } };
    }
    const term = await store.upsertTerm({
      id,
      taxonomySlug,
      slug: termSlug,
      name: String(body.name || body.slug || id).trim(),
      parentId
    });
    return { term };
  }

  return {
    listContentTypes,
    upsertContentType,
    listTaxonomies,
    upsertTaxonomy,
    listTerms,
    upsertTerm
  };
}
