import { normalizeTypeParam } from './wp-core-shared.js';
import { toPostTypeRecord, toWpTaxonomyRecord } from './wp-core-records.js';

export function registerWpCoreSchemaRoutes({ add, runtime, store, authzErrorResponse, requireCapability, json, notFoundEntity }) {
  add('GET', '/types', async (request) => {
    try {
      await requireCapability({ runtime, store, request, capability: 'document:read' });
      const types = await store.listContentTypes();
      const items = (types || []).filter((entry) => entry?.kind === 'content');
      const payload = {};
      for (const entry of items) {
        payload[entry.slug] = toPostTypeRecord(entry.slug);
      }
      if (!payload.post) payload.post = toPostTypeRecord('post');
      if (!payload.page) payload.page = toPostTypeRecord('page');
      return json(payload);
    } catch (e) {
      return authzErrorResponse(e);
    }
  });

  add('GET', '/types/:type', async (request, params) => {
    try {
      await requireCapability({ runtime, store, request, capability: 'document:read' });
      const type = normalizeTypeParam(params.type);
      if (!type) return notFoundEntity('type');
      if (type === 'post' || type === 'page') return json(toPostTypeRecord(type));

      const contentTypes = await store.listContentTypes();
      const match = (Array.isArray(contentTypes) ? contentTypes : []).find(
        (entry) => entry?.kind === 'content' && String(entry?.slug || '') === type
      );
      if (!match) return notFoundEntity('type');
      return json(toPostTypeRecord(type));
    } catch (e) {
      return authzErrorResponse(e);
    }
  });

  add('GET', '/taxonomies', async (request) => {
    try {
      await requireCapability({ runtime, store, request, capability: 'document:read' });
      const listed = await store.listTaxonomies();
      const items = Array.isArray(listed) ? listed : [];
      const payload = {};
      for (const taxonomy of items) {
        if (!taxonomy?.slug) continue;
        payload[taxonomy.slug] = toWpTaxonomyRecord(taxonomy);
      }
      if (!payload.category) {
        payload.category = toWpTaxonomyRecord({
          slug: 'category',
          name: 'Category',
          label: 'Categories',
          hierarchical: true,
          objectTypes: ['post', 'page']
        });
      }
      if (!payload.post_tag) {
        payload.post_tag = toWpTaxonomyRecord({
          slug: 'post_tag',
          name: 'Tag',
          label: 'Tags',
          hierarchical: false,
          objectTypes: ['post', 'page']
        });
      }
      return json(payload);
    } catch (e) {
      return authzErrorResponse(e);
    }
  });
}
