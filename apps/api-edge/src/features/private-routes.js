import { requireCapability } from '../auth.js';
import { error, json } from '../http.js';
import { buildPrivateCacheScope, parseTtlSeconds } from '../runtime-utils.js';

export function createPrivateRoutes({ runtime, store, cacheStore, blobStore, releaseStore, route, authzErrorResponse }) {
  return [
    route('GET', '/v1/private/:route', async (request, params) => {
      try {
        const user = await requireCapability({ runtime, store, request, capability: 'private:read' });
        const routeId = decodeURIComponent(params.route);
        const activeRelease = await releaseStore.getActiveRelease();
        if (!activeRelease) return error('RELEASE_NOT_ACTIVE', 'No active release', 404);

        const cacheScope = await buildPrivateCacheScope(runtime, user);
        const cacheKey = `private:${activeRelease}:${routeId}:${cacheScope}`;
        const cached = await cacheStore.get(cacheKey);
        if (cached) {
          return json({ route: routeId, html: cached, releaseId: activeRelease, cache: 'hit' });
        }

        const manifest = await releaseStore.getManifest(activeRelease);
        let artifact = manifest?.artifacts?.find((x) => x.route === routeId);
        if (!artifact) {
          const matchedDocument = await store.getDocument(routeId);
          const slugRoute = String(matchedDocument?.slug || '').trim();
          if (slugRoute) {
            artifact = manifest?.artifacts?.find((x) => x.route === slugRoute);
          }
        }
        if (!artifact) return error('ROUTE_NOT_FOUND', 'Private route not found', 404);

        const blob = await blobStore.getBlob(artifact.path);
        if (!blob) return error('ARTIFACT_NOT_FOUND', 'Artifact blob missing', 404);

        const html = blob.bytes;
        const privateCacheTtlSeconds = parseTtlSeconds(runtime.env('PRIVATE_CACHE_TTL_SECONDS'), {
          fallback: 120,
          min: 5,
          max: 3600
        });
        await cacheStore.set(cacheKey, html, privateCacheTtlSeconds);
        return json({ route: routeId, html, releaseId: activeRelease, cache: 'miss' });
      } catch (e) {
        return authzErrorResponse(e);
      }
    })
  ];
}
