import { assertPreviewNotExpired } from '../../../../packages/domain/src/index.js';
import { requireCapability } from '../auth.js';
import { error, json } from '../http.js';
import { parseTtlSeconds, signPreviewToken, verifyPreviewTokenSignature } from '../runtime-utils.js';

function escapeHtml(input) {
  return String(input || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function createPreviewRoutes({ runtime, store, previewStore, route, authzErrorResponse }) {
  return [
    route('GET', '/v1/preview/:documentId', async (request, params) => {
      try {
        const user = await requireCapability({ runtime, store, request, capability: 'document:read' });
        const doc = await store.getDocument(params.documentId);
        if (!doc) return error('DOCUMENT_NOT_FOUND', 'Document not found', 404);

        const previewTtlSeconds = parseTtlSeconds(runtime.env('PREVIEW_TTL_SECONDS'), {
          fallback: 15 * 60,
          min: 30,
          max: 24 * 60 * 60
        });
        const previewToken = `prv_${runtime.uuid()}`;
        const signature = await signPreviewToken(runtime, previewToken);
        const expiresAt = new Date(runtime.now().getTime() + previewTtlSeconds * 1000).toISOString();
        const releaseLikeRef = `preview_${runtime.uuid()}`;

        await previewStore.createPreview({
          previewToken,
          documentId: doc.id,
          releaseLikeRef,
          expiresAt,
          createdBy: user.id,
          html: `<html><body><article><h1>${escapeHtml(doc.title)}</h1>${doc.content || ''}</article></body></html>`
        });

        return json({
          previewUrl: `/preview/${previewToken}?sig=${encodeURIComponent(signature)}`,
          expiresAt,
          releaseLikeRef
        });
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('GET', '/preview/:token', async (request, params) => {
      const preview = await previewStore.getPreview(params.token);
      if (!preview) {
        return error('PREVIEW_NOT_FOUND', 'Preview not found', 404);
      }
      const signature = new URL(request.url).searchParams.get('sig');
      const validSignature = await verifyPreviewTokenSignature(runtime, params.token, signature);
      if (!validSignature) {
        return error('PREVIEW_TOKEN_INVALID', 'Preview token signature is invalid', 401);
      }
      try {
        assertPreviewNotExpired(preview, runtime.now().toISOString());
      } catch (e) {
        return error('PREVIEW_EXPIRED', e.message, 410);
      }
      return new Response(preview.html, { status: 200, headers: { 'content-type': 'text/html' } });
    })
  ];
}
