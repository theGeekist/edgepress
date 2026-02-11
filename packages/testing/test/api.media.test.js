import test from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryPlatform } from '../src/store.js';
import { authAsAdmin, requestJson } from '../src/testUtils.js';

async function uploadAndFinalizeMedia(handler, accessToken, options = {}) {
  const init = await requestJson(handler, 'POST', '/v1/media/init', { token: accessToken, body: {} });
  assert.equal(init.res.status, 201, 'media init failed');
  const mediaId = init.json.mediaId;
  const uploadToken = init.json.uploadToken;
  const bytes = options.bytes || new Uint8Array([1, 2, 3, 4]);
  const mimeType = options.uploadMimeType || 'image/jpeg';
  const filename = options.filename || 'test.jpg';

  const uploadRes = await handler(new Request(`http://test.local/uploads/${mediaId}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'x-upload-token': uploadToken,
      'content-type': mimeType
    },
    body: bytes
  }));
  assert.equal(uploadRes.status, 200, 'media upload failed');

  const finalize = await requestJson(handler, 'POST', `/v1/media/${mediaId}/finalize`, {
    token: accessToken,
    body: {
      uploadToken,
      filename,
      mimeType: options.finalizeMimeType,
      size: bytes.length,
      ...options.finalizeBody
    }
  });

  return {
    init,
    mediaId,
    uploadToken,
    bytes,
    finalize
  };
}

test('media: GET /v1/media supports pagination and search', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const empty = await requestJson(handler, 'GET', '/v1/media', { token: accessToken });
  assert.equal(empty.res.status, 200);
  assert.ok(Array.isArray(empty.json.items));
  assert.ok(empty.json.pagination);

  const paged = await requestJson(handler, 'GET', '/v1/media?page=1&pageSize=10', { token: accessToken });
  assert.equal(paged.res.status, 200);
  assert.equal(paged.json.pagination.page, 1);
  assert.equal(paged.json.pagination.pageSize, 10);
});

test('media: GET /v1/media/:id returns 404 for missing media', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const res = await requestJson(handler, 'GET', '/v1/media/med_missing', { token: accessToken });
  assert.equal(res.res.status, 404);
  assert.equal(res.json.error.code, 'MEDIA_NOT_FOUND');
});

test('media: PATCH /v1/media/:id updates metadata', async () => {
  const platform = createInMemoryPlatform();
  platform.blobStore.signedReadUrl = async (path, ttlSeconds = 300) => `/blob/${path}?ttl=${ttlSeconds}`;
  const { handler, accessToken } = await authAsAdmin(platform);

  const { mediaId } = await uploadAndFinalizeMedia(handler, accessToken, {
    finalizeBody: {
      width: 100,
      height: 100,
      alt: 'Test Alt',
      caption: 'Test Caption',
      description: 'Test Description'
    }
  });

  const updated = await requestJson(handler, 'PATCH', `/v1/media/${mediaId}`, {
    token: accessToken,
    body: { alt: 'Updated Alt', caption: 'Updated Caption' }
  });
  assert.equal(updated.res.status, 200);
  assert.equal(updated.json.media.alt, 'Updated Alt');
  assert.equal(updated.json.media.caption, 'Updated Caption');
});

test('media: DELETE /v1/media/:id deletes media', async () => {
  const platform = createInMemoryPlatform();
  platform.blobStore.signedReadUrl = async (path, ttlSeconds = 300) => `/blob/${path}?ttl=${ttlSeconds}`;
  const { handler, accessToken } = await authAsAdmin(platform);

  const { mediaId } = await uploadAndFinalizeMedia(handler, accessToken);

  const deleted = await requestJson(handler, 'DELETE', `/v1/media/${mediaId}`, { token: accessToken });
  assert.equal(deleted.res.status, 200);
  assert.equal(deleted.json.deleted, true);

  const notFound = await requestJson(handler, 'GET', `/v1/media/${mediaId}`, { token: accessToken });
  assert.equal(notFound.res.status, 404);
});

test('media: DELETE /v1/media/:id returns 404 for missing media', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const res = await requestJson(handler, 'DELETE', '/v1/media/med_missing', { token: accessToken });
  assert.equal(res.res.status, 404);
  assert.equal(res.json.error.code, 'MEDIA_NOT_FOUND');
});

test('media: PUT /uploads/:id rejects missing or mismatched upload token', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const init = await requestJson(handler, 'POST', '/v1/media/init', { token: accessToken, body: {} });
  const mediaId = init.json.mediaId;

  const missingToken = await handler(new Request(`http://test.local/uploads/${mediaId}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'image/jpeg'
    },
    body: new Uint8Array([1, 2, 3])
  }));
  assert.equal(missingToken.status, 401);
  const missingTokenBody = await missingToken.json();
  assert.equal(missingTokenBody.error.code, 'MEDIA_UPLOAD_TOKEN_INVALID');

  const mismatchedToken = await handler(new Request(`http://test.local/uploads/${mediaId}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'x-upload-token': 'wrong_token',
      'content-type': 'image/jpeg'
    },
    body: new Uint8Array([1, 2, 3])
  }));
  assert.equal(mismatchedToken.status, 401);
  const mismatchedTokenBody = await mismatchedToken.json();
  assert.equal(mismatchedTokenBody.error.code, 'MEDIA_UPLOAD_TOKEN_INVALID');
});

test('media: POST /media/:id/finalize rejects mismatched upload token', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const init = await requestJson(handler, 'POST', '/v1/media/init', { token: accessToken, body: {} });

  await handler(new Request(`http://test.local/uploads/${init.json.mediaId}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'x-upload-token': init.json.uploadToken,
      'content-type': 'image/jpeg'
    },
    body: new Uint8Array([1, 2, 3, 4])
  }));

  const finalized = await requestJson(handler, 'POST', `/v1/media/${init.json.mediaId}/finalize`, {
    token: accessToken,
    body: {
      uploadToken: 'wrong_token',
      filename: 'test.jpg',
      mimeType: 'image/jpeg',
      size: 4
    }
  });
  assert.equal(finalized.res.status, 401);
  assert.equal(finalized.json.error.code, 'MEDIA_UPLOAD_TOKEN_INVALID');
});

test('media: GET /blob/:path* returns binary content with correct content-type', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);
  const testBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
  const blobPath = 'blob-test.jpg';
  await platform.blobStore.putBlob(blobPath, testBytes, { contentType: 'image/jpeg' });

  const blobResp = await handler(new Request(`http://test.local/blob/${blobPath}`, {
    headers: { authorization: `Bearer ${accessToken}` }
  }));
  assert.equal(blobResp.status, 200);
  assert.equal(blobResp.headers.get('content-type'), 'image/jpeg');
  const blobBytes = new Uint8Array(await blobResp.arrayBuffer());
  assert.deepEqual(Array.from(blobBytes), Array.from(testBytes));

  const missingBlob = await handler(new Request('http://test.local/blob/nonexistent/path.jpg', {
    headers: { authorization: `Bearer ${accessToken}` }
  }));
  assert.equal(missingBlob.status, 404);
  const missingBlobBody = await missingBlob.json();
  assert.equal(missingBlobBody.error.code, 'BLOB_NOT_FOUND');
});

test('media: POST /media/:id/finalize content-type fallback chain', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const { finalize } = await uploadAndFinalizeMedia(handler, accessToken, {
    uploadMimeType: 'image/png',
    filename: 'test.png',
    finalizeMimeType: undefined
  });
  assert.equal(finalize.res.status, 200);
  assert.equal(finalize.json.media.mimeType, 'image/png');
});
