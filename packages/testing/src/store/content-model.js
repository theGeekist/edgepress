import {
  createContentType,
  createTaxonomy,
  createTerm
} from '@geekist/edgepress/domain/entities.js';

export function createContentModelFeature(state, runtime) {
  return {
    async listContentTypes() {
      return Array.from(state.contentTypes.values());
    },
    async getContentType(slug) {
      return state.contentTypes.get(slug) || null;
    },
    async upsertContentType(input) {
      const now = runtime.now().toISOString();
      const existing = state.contentTypes.get(input.slug);
      const created = createContentType({ ...input, now });
      const next = existing
        ? { ...existing, ...created, createdAt: existing.createdAt, updatedAt: now }
        : created;
      state.contentTypes.set(next.slug, next);
      return next;
    },
    async listTaxonomies() {
      return Array.from(state.taxonomies.values());
    },
    async getTaxonomy(slug) {
      return state.taxonomies.get(slug) || null;
    },
    async upsertTaxonomy(input) {
      const now = runtime.now().toISOString();
      const existing = state.taxonomies.get(input.slug);
      const created = createTaxonomy({ ...input, now });
      const next = existing
        ? { ...existing, ...created, createdAt: existing.createdAt, updatedAt: now }
        : created;
      state.taxonomies.set(next.slug, next);
      return next;
    },
    async listTerms({ taxonomySlug } = {}) {
      const all = Array.from(state.terms.values());
      if (!taxonomySlug) return all;
      return all.filter((term) => term.taxonomySlug === taxonomySlug);
    },
    async getTerm(id) {
      return state.terms.get(id) || null;
    },
    async upsertTerm(input) {
      const now = runtime.now().toISOString();
      const existing = state.terms.get(input.id);
      const created = createTerm({ ...input, now });
      const next = existing
        ? { ...existing, ...created, createdAt: existing.createdAt, updatedAt: now }
        : created;
      state.terms.set(next.id, next);
      return next;
    }
  };
}
