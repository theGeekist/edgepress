import { requireCapability } from '@geekist/edgepress/api-core/auth.js';
import { error, json, readJson } from '@geekist/edgepress/api-core/http.js';
import { createNavigationFeature } from '@geekist/edgepress/content';

export function createNavigationRoutes({ runtime, store, route, authzErrorResponse }) {
  const navigation = createNavigationFeature({ runtime, store });

  return [
    route('GET', '/v1/navigation/menus', async (request) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        return json(await navigation.listMenus());
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),
    route('GET', '/v1/navigation/menus/:key', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        const result = await navigation.getMenu({ key: params.key });
        if (result.error) return error(result.error.code, result.error.message, result.error.status);
        return json(result);
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),
    route('PUT', '/v1/navigation/menus/:key', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:write' });
        const body = await readJson(request);
        const result = await navigation.upsertMenu({ key: params.key, body });
        if (result.error) return error(result.error.code, result.error.message, result.error.status);
        return json(result);
      } catch (e) {
        return authzErrorResponse(e);
      }
    })
  ];
}
