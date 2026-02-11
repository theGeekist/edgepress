import { assertPlatformPorts } from '@geekist/edgepress/ports';
import { resolveHooks } from './hooks.js';
import { error, getCorsHeaders, matchPath, withCors } from './http.js';
import { createAuthRoutes } from './features/auth-routes.js';
import { createDocumentRoutes } from './features/document-routes.js';
import { createMediaRoutes } from './features/media-routes.js';
import { createPublishRoutes } from './features/publish-routes.js';
import { createPreviewRoutes } from './features/preview-routes.js';
import { createFormRoutes } from './features/form-routes.js';
import { createPrivateRoutes } from './features/private-routes.js';
import { createNavigationRoutes } from './features/navigation-routes.js';
import { createWpCoreRoutes } from './features/wp-core-routes.js';
import { createContentModelRoutes } from './features/content-model-routes.js';

function route(method, path, handler) {
  return { method, path, handler };
}

function authzErrorResponse(e) {
  if (typeof e?.status === 'number' && typeof e?.code === 'string') {
    return error(e.code, e.message, e.status);
  }
  return error('FORBIDDEN', e?.message || 'Forbidden', 403);
}

function createFeatureRoutes(context) {
  return [
    ...createAuthRoutes(context),
    ...createDocumentRoutes(context),
    ...createMediaRoutes(context),
    ...createPublishRoutes(context),
    ...createPreviewRoutes(context),
    ...createFormRoutes(context),
    ...createNavigationRoutes(context),
    ...createContentModelRoutes(context),
    ...createPrivateRoutes(context),
    ...createWpCoreRoutes(context)
  ];
}

export function createApiHandler(platform) {
  assertPlatformPorts(platform);
  const { runtime, store, blobStore, cacheStore, releaseStore, previewStore } = platform;
  const hooks = resolveHooks(platform);

  const routes = createFeatureRoutes({
    runtime,
    store,
    blobStore,
    cacheStore,
    releaseStore,
    previewStore,
    hooks,
    route,
    authzErrorResponse
  });

  return async function handleRequest(request) {
    const corsOrigin = runtime.env('DEV_CORS_ORIGIN') || '*';
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: getCorsHeaders(corsOrigin) });
    }

    try {
      const url = new URL(request.url);
      for (const def of routes) {
        if (request.method !== def.method) continue;
        const params = matchPath(def.path, url.pathname);
        if (!params) continue;
        return withCors(await def.handler(request, params), corsOrigin);
      }
      return withCors(error('NOT_FOUND', 'Route not found', 404), corsOrigin);
    } catch (e) {
      runtime.log('error', 'unhandled_exception', { message: e.message });
      return withCors(error('INTERNAL_ERROR', 'Internal server error', 500), corsOrigin);
    }
  };
}
