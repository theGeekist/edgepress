import { requireCapability } from '@geekist/edgepress/api-core/auth.js';
import { error, json, readJson } from '@geekist/edgepress/api-core/http.js';
import { createContentModelFeature } from '@geekist/edgepress/content';

export function createContentModelRoutes({ runtime, store, route, authzErrorResponse }) {
  const contentModel = createContentModelFeature({ runtime, store });

  return [
    route('GET', '/v1/content-types', async (request) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        return json(await contentModel.listContentTypes());
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),
    route('PUT', '/v1/content-types/:slug', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:write' });
        const body = await readJson(request);
        const result = await contentModel.upsertContentType({ paramsSlug: params.slug, body });
        if (result.error) return error(result.error.code, result.error.message, result.error.status);
        return json(result);
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),
    route('GET', '/v1/taxonomies', async (request) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        return json(await contentModel.listTaxonomies());
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),
    route('PUT', '/v1/taxonomies/:slug', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:write' });
        const body = await readJson(request);
        const result = await contentModel.upsertTaxonomy({ paramsSlug: params.slug, body });
        if (result.error) return error(result.error.code, result.error.message, result.error.status);
        return json(result);
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),
    route('GET', '/v1/terms', async (request) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        const url = new URL(request.url);
        return json(await contentModel.listTerms({ taxonomySlug: url.searchParams.get('taxonomySlug') || '' }));
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),
    route('PUT', '/v1/terms/:id', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:write' });
        const body = await readJson(request);
        const id = String(params.id || body.id || '').trim();
        const result = await contentModel.upsertTerm({ id, body });
        if (result.error) return error(result.error.code, result.error.message, result.error.status);
        return json(result);
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),
    route('POST', '/v1/terms', async (request) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:write' });
        const body = await readJson(request);
        const id = body.id ? String(body.id).trim() : `term_${runtime.uuid()}`;
        const result = await contentModel.upsertTerm({ id, body: { ...body, id } });
        if (result.error) return error(result.error.code, result.error.message, result.error.status);
        return json(result);
      } catch (e) {
        return authzErrorResponse(e);
      }
    })
  ];
}
