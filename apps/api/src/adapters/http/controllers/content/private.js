import { requireCapability } from '@geekist/edgepress/api-core/auth.js';
import { error, json } from '@geekist/edgepress/api-core/http.js';
import { createPrivateDeliveryFeature } from '@geekist/edgepress/content';

export function createPrivateRoutes({ runtime, store, cacheStore, blobStore, releaseStore, route, authzErrorResponse }) {
  const delivery = createPrivateDeliveryFeature({ runtime, store, cacheStore, blobStore, releaseStore });

  return [
    route('GET', '/v1/private/:route', async (request, params) => {
      try {
        const user = await requireCapability({ runtime, store, request, capability: 'private:read' });
        const routeId = decodeURIComponent(params.route);
        const result = await delivery.getPrivateRoute({ routeId, user });
        if (result.error) return error(result.error.code, result.error.message, result.error.status);
        const { route, html, releaseId } = result;
        return json({ route, html, releaseId });
      } catch (e) {
        return authzErrorResponse(e);
      }
    })
  ];
}
