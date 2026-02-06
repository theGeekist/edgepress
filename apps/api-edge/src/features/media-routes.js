import { requireCapability } from '../auth.js';
import { error, json, readJson } from '../http.js';

export function createMediaRoutes({ runtime, store, blobStore, route, authzErrorResponse }) {
  return [
    route('POST', '/v1/media', async (request) => {
      try {
        const user = await requireCapability({ runtime, store, request, capability: 'media:write' });
        const mediaId = `med_${runtime.uuid()}`;
        const uploadToken = `up_${runtime.uuid()}`;
        const session = await store.createMediaSession({
          id: mediaId,
          createdBy: user.id,
          uploadToken
        });
        return json({
          mediaId: session.id,
          uploadUrl: session.uploadUrl,
          uploadToken: session.uploadToken,
          requiredHeaders: session.requiredHeaders
        }, 201);
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('POST', '/v1/media/:id/finalize', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'media:write' });
        const body = await readJson(request);
        const existing = await store.getMedia(params.id);
        if (!existing) return error('MEDIA_NOT_FOUND', 'Media not found', 404);
        if (existing.uploadToken !== body.uploadToken) {
          return error('MEDIA_UPLOAD_TOKEN_INVALID', 'Upload token invalid', 401);
        }

        const path = `media/${params.id}/${body.filename || 'asset.bin'}`;
        await blobStore.putBlob(path, 'placeholder-bytes', { contentType: body.mimeType || 'application/octet-stream' });
        const signedUrl = await blobStore.signedReadUrl(path, 3600);
        const media = await store.finalizeMedia(params.id, {
          filename: body.filename || 'asset.bin',
          mimeType: body.mimeType || 'application/octet-stream',
          size: body.size || 0,
          url: signedUrl
        });
        return json({ media });
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('GET', '/v1/media/:id', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        const media = await store.getMedia(params.id);
        if (!media) return error('MEDIA_NOT_FOUND', 'Media not found', 404);
        return json({ media });
      } catch (e) {
        return authzErrorResponse(e);
      }
    })
  ];
}
