import { requireCapability, error, getCorsHeaders, json, matchPath, readJson, withCors } from '@geekist/edgepress/api-core';
import { resolveHooks } from './hooks.js';
import { assertPlatformContracts } from '../orchestration/platform-contracts.js';
import { createRelease, resolveImageBlocks } from '../orchestration/release-workflow.js';
import { runPublishWorkflow } from '../orchestration/publish-workflow.js';
import { createApiRoutes } from '../adapters/http/routes/index.js';

function route(method, path, handler) {
  return { method, path, handler };
}

function authzErrorResponse(e) {
  if (typeof e?.status === 'number' && typeof e?.code === 'string') {
    return error(e.code, e.message, e.status);
  }
  return error('FORBIDDEN', e?.message || 'Forbidden', 403);
}

export function createApiHandler(platform) {
  assertPlatformContracts(platform);
  const { runtime, store, blobStore, cacheStore, releaseStore, previewStore } = platform;
  const hooks = resolveHooks(platform);

  const routes = createApiRoutes({
    runtime,
    store,
    blobStore,
    cacheStore,
    releaseStore,
    previewStore,
    hooks,
    workflows: {
      createRelease,
      resolveImageBlocks,
      runPublishWorkflow
    },
    auth: { requireCapability },
    http: { json, readJson },
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
