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

function normalizeBlobBody(bytes) {
  if (bytes instanceof Uint8Array || bytes instanceof ArrayBuffer) return bytes;
  if (typeof bytes === 'string') return bytes;
  if (bytes == null) return '';
  return String(bytes);
}

export function createMediaFeature({ runtime, store, blobStore }) {
  function resolveAbsoluteUrl(request, maybeRelative) {
    if (!maybeRelative) return '';
    if (/^https?:\/\//i.test(maybeRelative)) return maybeRelative;
    const origin = new URL(request.url).origin;
    return new URL(maybeRelative, origin).toString();
  }

  async function createMediaSession({ request, userId }) {
    const mediaId = `med_${runtime.uuid()}`;
    const uploadToken = `up_${runtime.uuid()}`;
    const session = await store.createMediaSession({ id: mediaId, createdBy: userId, uploadToken });
    return {
      mediaId: session.id,
      uploadUrl: resolveAbsoluteUrl(request, session.uploadUrl),
      uploadToken: session.uploadToken,
      requiredHeaders: session.requiredHeaders
    };
  }

  async function finalizeMedia({ request, mediaId, body }) {
    const existing = await store.getMedia(mediaId);
    if (!existing) return { error: { code: 'MEDIA_NOT_FOUND', message: 'Media not found', status: 404 } };
    if (existing.uploadToken !== body.uploadToken) {
      return { error: { code: 'MEDIA_UPLOAD_TOKEN_INVALID', message: 'Upload token invalid', status: 401 } };
    }

    const uploadPath = `uploads/${mediaId}/original`;
    const uploadedBlob = await blobStore.getBlob(uploadPath);
    const contentType = body.mimeType || uploadedBlob?.metadata?.contentType || 'application/octet-stream';
    const sanitizedFilename = ensureFilenameExtension(body.filename, contentType);
    const path = `media/${mediaId}/${sanitizedFilename}`;
    const bytes = uploadedBlob?.bytes;
    if (!(bytes instanceof Uint8Array) && !(bytes instanceof ArrayBuffer) && typeof bytes !== 'string') {
      return { error: { code: 'MEDIA_UPLOAD_MISSING_BYTES', message: 'Uploaded media bytes are missing', status: 400 } };
    }

    await blobStore.putBlob(path, bytes, { contentType });
    const signedUrl = resolveAbsoluteUrl(request, await blobStore.signedReadUrl(path, 3600));
    const media = await store.finalizeMedia(mediaId, {
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

    return { media };
  }

  async function uploadBlob({ mediaId, uploadToken, bodyBytes, contentType }) {
    const existing = await store.getMedia(mediaId);
    if (!existing) return { error: { code: 'MEDIA_NOT_FOUND', message: 'Media not found', status: 404 } };
    if (!uploadToken || uploadToken !== existing.uploadToken) {
      return { error: { code: 'MEDIA_UPLOAD_TOKEN_INVALID', message: 'Upload token invalid', status: 401 } };
    }

    const uploadPath = `uploads/${mediaId}/original`;
    await blobStore.putBlob(uploadPath, bodyBytes, { contentType: contentType || 'application/octet-stream' });
    return { ok: true, uploadPath };
  }

  async function readBlob({ path }) {
    const blob = await blobStore.getBlob(path);
    if (!blob) return { error: { code: 'BLOB_NOT_FOUND', message: 'Blob not found', status: 404 } };
    return {
      body: normalizeBlobBody(blob?.bytes),
      contentType: blob?.metadata?.contentType || 'application/octet-stream'
    };
  }

  async function listMedia({ url }) {
    const payload = await store.listMedia({
      q: url.searchParams.get('q') || '',
      mimeType: url.searchParams.get('mimeType') || '',
      sortBy: url.searchParams.get('sortBy') || 'updatedAt',
      sortDir: url.searchParams.get('sortDir') || 'desc',
      page: Number(url.searchParams.get('page') || 1),
      pageSize: Number(url.searchParams.get('pageSize') || 20)
    });

    return {
      items: payload?.items || [],
      pagination: payload?.pagination || { page: 1, pageSize: 20, totalItems: 0, totalPages: 1 }
    };
  }

  async function getMedia({ mediaId }) {
    const media = await store.getMedia(mediaId);
    if (!media) return { error: { code: 'MEDIA_NOT_FOUND', message: 'Media not found', status: 404 } };
    return { media };
  }

  async function updateMedia({ mediaId, body }) {
    const media = await store.updateMedia(mediaId, {
      alt: body.alt,
      caption: body.caption,
      description: body.description
    });
    if (!media) return { error: { code: 'MEDIA_NOT_FOUND', message: 'Media not found', status: 404 } };
    return { media };
  }

  async function deleteMedia({ mediaId }) {
    const deleted = await store.deleteMedia(mediaId);
    if (!deleted) return { error: { code: 'MEDIA_NOT_FOUND', message: 'Media not found', status: 404 } };
    return { ok: true, deleted: true };
  }

  return {
    createMediaSession,
    finalizeMedia,
    uploadBlob,
    readBlob,
    listMedia,
    getMedia,
    updateMedia,
    deleteMedia
  };
}
