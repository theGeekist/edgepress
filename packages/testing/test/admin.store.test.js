import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanonicalSdkStore } from '../../../apps/admin-web/src/features/editor/gutenberg-integration.js';
import { createInMemoryPlatform } from '../src/inMemoryPlatform.js';
import { createApiHandler } from '../../../apps/api-edge/src/app.js';
import { authAsAdmin } from '../src/testUtils.js';

function createLocalFetch(handler) {
  return async (url, init = {}) => {
    const request = new Request(url, {
      method: init.method || 'GET',
      headers: init.headers,
      body: init.body
    });
    return handler(request);
  };
}

test('canonical sdk store media and preview flows are wired', async () => {
  const platform = createInMemoryPlatform();
  const { accessToken } = await authAsAdmin(platform);
  const handler = createApiHandler(platform);

  const store = createCanonicalSdkStore({
    baseUrl: 'http://api.local',
    fetchImpl: createLocalFetch(handler),
    getAccessToken: () => accessToken
  });

  const created = await store.createDocument({ title: 'Store', content: '<p>doc</p>' });
  assert.ok(created.document.id);

  const mediaInit = await store.initMedia({});
  assert.ok(mediaInit.mediaId);

  const mediaFinal = await store.finalizeMedia(mediaInit.mediaId, {
    uploadToken: mediaInit.uploadToken,
    filename: 'cover.png',
    mimeType: 'image/png',
    size: 111
  });
  assert.equal(mediaFinal.media.id, mediaInit.mediaId);

  const preview = await store.getPreview(created.document.id);
  assert.ok(preview.previewUrl.startsWith('/preview/'));
});
