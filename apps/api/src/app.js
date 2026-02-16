import { createAuthRoutes } from '@geekist/edgepress/auth';
import { createContentRoutes } from '@geekist/edgepress/content';
import { createWpCoreRoutes } from '@geekist/edgepress/wp-core';
import { requireCapability } from '@geekist/edgepress/api-core/auth.js';
import { error, getCorsHeaders, json, matchPath, readJson, withCors } from '@geekist/edgepress/api-core/http.js';
import { resolveHooks } from './hooks.js';
import { assertPlatformContracts } from './orchestration/platform-contracts.js';
import { createRelease, resolveImageBlocks } from './orchestration/release-workflow.js';

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
    ...createContentRoutes(context),
    ...createWpCoreRoutes({
      ...context,
      auth: { requireCapability },
      http: { json, readJson }
    })
  ];
}

export function createApiHandler(platform) {
  assertPlatformContracts(platform);
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
    workflows: {
      createRelease,
      resolveImageBlocks
    },
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
