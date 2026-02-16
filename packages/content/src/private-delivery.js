import { buildPrivateCacheScope, parseTtlSeconds } from '@geekist/edgepress/api-core/runtime-utils.js';

export function createPrivateDeliveryFeature({ runtime, store, cacheStore, blobStore, releaseStore }) {
  async function getPrivateRoute({ routeId, user }) {
    const activeRelease = await releaseStore.getActiveRelease();
    if (!activeRelease) return { error: { code: 'RELEASE_NOT_ACTIVE', message: 'No active release', status: 404 } };

    const manifest = await releaseStore.getManifest(activeRelease);
    let resolvedRoute = routeId;
    let artifact = manifest?.artifacts?.find((x) => x.route === routeId);
    if (!artifact) {
      const matchedDocument = await store.getDocument(routeId);
      const slugRoute = String(matchedDocument?.slug || '').trim();
      if (slugRoute) {
        resolvedRoute = slugRoute;
        artifact = manifest?.artifacts?.find((x) => x.route === slugRoute);
      }
    }
    if (!artifact) return { error: { code: 'ROUTE_NOT_FOUND', message: 'Private route not found', status: 404 } };

    resolvedRoute = String(artifact.route || resolvedRoute || routeId);
    const cacheScope = await buildPrivateCacheScope(runtime, user);
    const cacheKey = `private:${activeRelease}:${resolvedRoute}:${cacheScope}`;
    const cached = await cacheStore.get(cacheKey);
    if (cached) {
      return { route: routeId, html: cached, releaseId: activeRelease, cache: 'hit' };
    }

    const blob = await blobStore.getBlob(artifact.path);
    if (!blob) return { error: { code: 'ARTIFACT_NOT_FOUND', message: 'Artifact blob missing', status: 404 } };

    const html = blob.bytes;
    const privateCacheTtlSeconds = parseTtlSeconds(runtime.env('PRIVATE_CACHE_TTL_SECONDS'), {
      fallback: 120,
      min: 5,
      max: 3600
    });
    await cacheStore.set(cacheKey, html, privateCacheTtlSeconds);

    return { route: routeId, html, releaseId: activeRelease, cache: 'miss' };
  }

  return {
    getPrivateRoute
  };
}
