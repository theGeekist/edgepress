import { requireCapability } from '@geekist/edgepress/api-core/auth.js';
import { error, json } from '@geekist/edgepress/api-core/http.js';
import { createPreviewFeature } from '@geekist/edgepress/content';

export function createPreviewRoutes({ runtime, store, previewStore, route, authzErrorResponse, workflows }) {
  const resolveImageBlocks = workflows?.resolveImageBlocks;
  if (typeof resolveImageBlocks !== 'function') {
    throw new Error('Missing required workflow helper: resolveImageBlocks');
  }

  const previews = createPreviewFeature({ runtime, store, previewStore, resolveImageBlocks });

  return [
    route('GET', '/v1/preview/:documentId', async (request, params) => {
      try {
        const user = await requireCapability({ runtime, store, request, capability: 'document:read' });
        const result = await previews.createPreview({ request, documentId: params.documentId, userId: user.id });
        if (result.error) return error(result.error.code, result.error.message, result.error.status);
        return json(result);
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('GET', '/preview/:token', async (request, params) => {
      const result = await previews.renderPreview({ request, token: params.token });
      if (result.error) return error(result.error.code, result.error.message, result.error.status);
      return new Response(result.html, {
        status: 200,
        headers: result.headers
      });
    })
  ];
}
