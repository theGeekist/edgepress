import { requireCapability } from '@geekist/edgepress/api-core/auth.js';
import { error, json, readJson } from '@geekist/edgepress/api-core/http.js';
import { createMediaFeature } from '@geekist/edgepress/content';

export function createMediaRoutes({ runtime, store, blobStore, route, authzErrorResponse }) {
  const mediaFeature = createMediaFeature({ runtime, store, blobStore });

  return [
    route('POST', '/v1/media', async (request) => {
      try {
        const user = await requireCapability({ runtime, store, request, capability: 'media:write' });
        return json(await mediaFeature.createMediaSession({ request, userId: user.id }), 201);
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('POST', '/v1/media/init', async (request) => {
      try {
        const user = await requireCapability({ runtime, store, request, capability: 'media:write' });
        return json(await mediaFeature.createMediaSession({ request, userId: user.id }), 201);
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('POST', '/v1/media/:id/finalize', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'media:write' });
        const body = await readJson(request);
        const result = await mediaFeature.finalizeMedia({ request, mediaId: params.id, body });
        if (result.error) return error(result.error.code, result.error.message, result.error.status);
        return json(result);
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('PUT', '/uploads/:id', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'media:write' });
        const result = await mediaFeature.uploadBlob({
          mediaId: params.id,
          uploadToken: request.headers.get('x-upload-token') || '',
          bodyBytes: new Uint8Array(await request.arrayBuffer()),
          contentType: request.headers.get('content-type') || 'application/octet-stream'
        });
        if (result.error) return error(result.error.code, result.error.message, result.error.status);
        return json(result);
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('GET', '/blob/:path*', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
      } catch (e) {
        return authzErrorResponse(e);
      }
      const blob = await mediaFeature.readBlob({ path: params.path });
      if (blob.error) return error(blob.error.code, blob.error.message, blob.error.status);
      return new Response(blob.body, { status: 200, headers: { 'content-type': blob.contentType } });
    }),

    route('GET', '/v1/media', async (request) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        return json(await mediaFeature.listMedia({ url: new URL(request.url) }));
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('GET', '/v1/media/:id', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        const result = await mediaFeature.getMedia({ mediaId: params.id });
        if (result.error) return error(result.error.code, result.error.message, result.error.status);
        return json(result);
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('PATCH', '/v1/media/:id', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'media:write' });
        const body = await readJson(request);
        const result = await mediaFeature.updateMedia({ mediaId: params.id, body });
        if (result.error) return error(result.error.code, result.error.message, result.error.status);
        return json(result);
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('DELETE', '/v1/media/:id', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'media:write' });
        const result = await mediaFeature.deleteMedia({ mediaId: params.id });
        if (result.error) return error(result.error.code, result.error.message, result.error.status);
        return json(result);
      } catch (e) {
        return authzErrorResponse(e);
      }
    })
  ];
}
