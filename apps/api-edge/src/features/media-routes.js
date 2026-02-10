import { requireCapability } from '../auth.js';
import { error, json, readJson } from '../http.js';

function sanitizeFilename(input) {
  const candidate = String(input || '')
    .replace(/\0/g, '')
    .replace(/[\\/]+/g, '/')
    .split('/')
    .pop()
    ?.replace(/\.\.+/g, '.')
    .trim();
  return candidate || 'asset.bin';
}

function inferExtensionFromMimeType(mimeType) {
  const normalized = String(mimeType || '').toLowerCase().trim();
  if (!normalized) return '';
  const map = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'application/pdf': 'pdf',
    'text/plain': 'txt'
  };
  return map[normalized] || '';
}

function ensureFilenameExtension(filename, mimeType) {
  const safe = sanitizeFilename(filename);
  if (/\.[a-z0-9]+$/i.test(safe)) return safe;
  const ext = inferExtensionFromMimeType(mimeType);
  return ext ? `${safe}.${ext}` : safe;
}

export function createMediaRoutes({ runtime, store, blobStore, route, authzErrorResponse }) {
  function resolveAbsoluteUrl(request, maybeRelative) {
    if (!maybeRelative) return '';
    if (/^https?:\/\//i.test(maybeRelative)) return maybeRelative;
    const origin = new URL(request.url).origin;
    return new URL(maybeRelative, origin).toString();
  }

  async function createMediaSessionRoute(request) {
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
      uploadUrl: resolveAbsoluteUrl(request, session.uploadUrl),
      uploadToken: session.uploadToken,
      requiredHeaders: session.requiredHeaders
    }, 201);
  }

  return [
    route('POST', '/v1/media', async (request) => {
      try {
        return await createMediaSessionRoute(request);
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('POST', '/v1/media/init', async (request) => {
      try {
        return await createMediaSessionRoute(request);
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

        const uploadPath = `uploads/${params.id}/original`;
        const uploadedBlob = await blobStore.getBlob(uploadPath);
        const contentType = body.mimeType || uploadedBlob?.metadata?.contentType || 'application/octet-stream';
        const sanitizedFilename = ensureFilenameExtension(body.filename, contentType);
        const path = `media/${params.id}/${sanitizedFilename}`;
        const bytes = uploadedBlob?.bytes || 'placeholder-bytes';
        await blobStore.putBlob(path, bytes, { contentType });
        const signedUrl = resolveAbsoluteUrl(request, await blobStore.signedReadUrl(path, 3600));
        const media = await store.finalizeMedia(params.id, {
          filename: sanitizedFilename,
          mimeType: contentType,
          size: body.size || 0,
          url: signedUrl,
          width: body.width,
          height: body.height,
          alt: body.alt || '',
          caption: body.caption || '',
          description: body.description || ''
        });
        return json({ media });
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('PUT', '/uploads/:id', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'media:write' });
        const existing = await store.getMedia(params.id);
        if (!existing) return error('MEDIA_NOT_FOUND', 'Media not found', 404);
        const uploadToken = request.headers.get('x-upload-token') || '';
        if (!uploadToken || uploadToken !== existing.uploadToken) {
          return error('MEDIA_UPLOAD_TOKEN_INVALID', 'Upload token invalid', 401);
        }
        const contentType = request.headers.get('content-type') || 'application/octet-stream';
        const bytes = new Uint8Array(await request.arrayBuffer());
        const uploadPath = `uploads/${params.id}/original`;
        await blobStore.putBlob(uploadPath, bytes, { contentType });
        return json({ ok: true, uploadPath });
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('GET', '/blob/:path*', async (request, params) => {
      const path = params.path;
      const blob = await blobStore.getBlob(path);
      if (!blob) {
        return error('BLOB_NOT_FOUND', 'Blob not found', 404);
      }
      const contentType = blob?.metadata?.contentType || 'application/octet-stream';
      const bytes = blob?.bytes;
      let body;
      if (bytes instanceof Uint8Array || bytes instanceof ArrayBuffer || typeof bytes === 'string') {
        body = bytes;
      } else if (bytes == null) {
        body = '';
      } else {
        body = String(bytes);
      }
      return new Response(body, { status: 200, headers: { 'content-type': contentType } });
    }),

    route('GET', '/v1/media', async (request) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        const url = new URL(request.url);
        const payload = await store.listMedia({
          q: url.searchParams.get('q') || '',
          mimeType: url.searchParams.get('mimeType') || '',
          sortBy: url.searchParams.get('sortBy') || 'updatedAt',
          sortDir: url.searchParams.get('sortDir') || 'desc',
          page: Number(url.searchParams.get('page') || 1),
          pageSize: Number(url.searchParams.get('pageSize') || 20)
        });
        return json({
          items: payload?.items || [],
          pagination: payload?.pagination || { page: 1, pageSize: 20, totalItems: 0, totalPages: 1 }
        });
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
    }),

    route('PATCH', '/v1/media/:id', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'media:write' });
        const body = await readJson(request);
        const media = await store.updateMedia(params.id, {
          alt: body.alt,
          caption: body.caption,
          description: body.description
        });
        if (!media) return error('MEDIA_NOT_FOUND', 'Media not found', 404);
        return json({ media });
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('DELETE', '/v1/media/:id', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'media:write' });
        const deleted = await store.deleteMedia(params.id);
        if (!deleted) return error('MEDIA_NOT_FOUND', 'Media not found', 404);
        return json({ ok: true, deleted: true });
      } catch (e) {
        return authzErrorResponse(e);
      }
    })
  ];
}
