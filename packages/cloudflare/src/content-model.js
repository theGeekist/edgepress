import {
  createContentType,
  createTaxonomy,
  createTerm
} from '@geekist/edgepress/domain/entities.js';

export function createContentModelD1(d1, D1_SQL, parseJsonSafe, runtime, ensureD1AppSchema) {
  return {
    async listContentTypes() {
      await ensureD1AppSchema();
      const rows = await d1.prepare(D1_SQL.selectContentTypes).all();
      return (rows.results || []).map((entry) => parseJsonSafe(entry.content_type_json)).filter(Boolean);
    },
    async getContentType(slug) {
      await ensureD1AppSchema();
      const row = await d1.prepare(D1_SQL.selectContentTypeBySlug).bind(slug).first();
      return parseJsonSafe(row?.content_type_json);
    },
    async upsertContentType(input) {
      await ensureD1AppSchema();
      const now = runtime.now().toISOString();
      const existing = await this.getContentType(input.slug);
      const created = createContentType({ ...input, now });
      const next = existing
        ? { ...existing, ...created, createdAt: existing.createdAt, updatedAt: now }
        : created;
      await d1.prepare(D1_SQL.upsertContentType).bind(next.slug, JSON.stringify(next), next.updatedAt).run();
      return next;
    },
    async listTaxonomies() {
      await ensureD1AppSchema();
      const rows = await d1.prepare(D1_SQL.selectTaxonomies).all();
      return (rows.results || []).map((entry) => parseJsonSafe(entry.taxonomy_json)).filter(Boolean);
    },
    async getTaxonomy(slug) {
      await ensureD1AppSchema();
      const row = await d1.prepare(D1_SQL.selectTaxonomyBySlug).bind(slug).first();
      return parseJsonSafe(row?.taxonomy_json);
    },
    async upsertTaxonomy(input) {
      await ensureD1AppSchema();
      const now = runtime.now().toISOString();
      const existing = await this.getTaxonomy(input.slug);
      const created = createTaxonomy({ ...input, now });
      const next = existing
        ? { ...existing, ...created, createdAt: existing.createdAt, updatedAt: now }
        : created;
      await d1.prepare(D1_SQL.upsertTaxonomy).bind(next.slug, JSON.stringify(next), next.updatedAt).run();
      return next;
    },
    async listTerms({ taxonomySlug } = {}) {
      await ensureD1AppSchema();
      const rows = taxonomySlug
        ? await d1.prepare(D1_SQL.selectTermsByTaxonomySlug).bind(taxonomySlug).all()
        : await d1.prepare(D1_SQL.selectTerms).all();
      return (rows.results || []).map((entry) => parseJsonSafe(entry.term_json)).filter(Boolean);
    },
    async getTerm(id) {
      await ensureD1AppSchema();
      const row = await d1.prepare(D1_SQL.selectTermById).bind(id).first();
      return parseJsonSafe(row?.term_json);
    },
    async upsertTerm(input) {
      await ensureD1AppSchema();
      const now = runtime.now().toISOString();
      const existing = await this.getTerm(input.id);
      const created = createTerm({ ...input, now });
      const next = existing
        ? { ...existing, ...created, createdAt: existing.createdAt, updatedAt: now }
        : created;
      await d1
        .prepare(D1_SQL.upsertTerm)
        .bind(next.id, next.taxonomySlug, JSON.stringify(next), next.updatedAt)
        .run();
      return next;
    }
  };
}

export function createContentModelKv(appKey, kvGetJson, kvPutJson, ensureKvSeeded, kvIndexAdd, runtime) {
  return {
    async listContentTypes() {
      await ensureKvSeeded();
      const slugs = (await kvGetJson(appKey('content_types'))) || [];
      const rows = await Promise.all(slugs.map((slug) => kvGetJson(appKey('content_type', slug))));
      return rows.filter(Boolean);
    },
    async getContentType(slug) {
      await ensureKvSeeded();
      return kvGetJson(appKey('content_type', slug));
    },
    async upsertContentType(input) {
      await ensureKvSeeded();
      const now = runtime.now().toISOString();
      const existing = await this.getContentType(input.slug);
      const created = createContentType({ ...input, now });
      const next = existing
        ? { ...existing, ...created, createdAt: existing.createdAt, updatedAt: now }
        : created;
      await kvPutJson(appKey('content_type', next.slug), next);
      await kvIndexAdd(appKey('content_types'), next.slug);
      return next;
    },
    async listTaxonomies() {
      await ensureKvSeeded();
      const slugs = (await kvGetJson(appKey('taxonomies'))) || [];
      const rows = await Promise.all(slugs.map((slug) => kvGetJson(appKey('taxonomy', slug))));
      return rows.filter(Boolean);
    },
    async getTaxonomy(slug) {
      await ensureKvSeeded();
      return kvGetJson(appKey('taxonomy', slug));
    },
    async upsertTaxonomy(input) {
      await ensureKvSeeded();
      const now = runtime.now().toISOString();
      const existing = await this.getTaxonomy(input.slug);
      const created = createTaxonomy({ ...input, now });
      const next = existing
        ? { ...existing, ...created, createdAt: existing.createdAt, updatedAt: now }
        : created;
      await kvPutJson(appKey('taxonomy', next.slug), next);
      await kvIndexAdd(appKey('taxonomies'), next.slug);
      return next;
    },
    async listTerms({ taxonomySlug } = {}) {
      await ensureKvSeeded();
      const ids = (await kvGetJson(appKey('terms'))) || [];
      const rows = await Promise.all(ids.map((id) => kvGetJson(appKey('term', id))));
      const all = rows.filter(Boolean);
      if (!taxonomySlug) return all;
      return all.filter((term) => term.taxonomySlug === taxonomySlug);
    },
    async getTerm(id) {
      await ensureKvSeeded();
      return kvGetJson(appKey('term', id));
    },
    async upsertTerm(input) {
      await ensureKvSeeded();
      const now = runtime.now().toISOString();
      const existing = await this.getTerm(input.id);
      const created = createTerm({ ...input, now });
      const next = existing
        ? { ...existing, ...created, createdAt: existing.createdAt, updatedAt: now }
        : created;
      await kvPutJson(appKey('term', next.id), next);
      await kvIndexAdd(appKey('terms'), next.id);
      return next;
    }
  };
}
