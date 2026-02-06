import test from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryPlatform } from '../src/inMemoryPlatform.js';
import { authAsAdmin, requestJson } from '../src/testUtils.js';

async function seedDoc(handler, token) {
  const created = await requestJson(handler, 'POST', '/v1/documents', {
    token,
    body: { title: 'Post', content: '<p>Body</p>' }
  });
  return created.json.document.id;
}

test('release manifest is immutable and active release pointer is atomic', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);
  await seedDoc(handler, accessToken);

  const first = await requestJson(handler, 'POST', '/v1/publish', { token: accessToken, body: {} });
  assert.equal(first.res.status, 201);

  const releaseId = first.json.job.releaseId;
  const manifest = await platform.releaseStore.getManifest(releaseId);
  assert.ok(manifest);

  await assert.rejects(
    () => platform.releaseStore.writeManifest(releaseId, manifest),
    /immutable/
  );

  const before = await platform.releaseStore.getActiveRelease();
  await platform.releaseStore.activateRelease(releaseId);
  const after = await platform.releaseStore.getActiveRelease();
  assert.equal(after, releaseId);
  assert.ok(before === null || before === releaseId);
});

test('preview returns tokenized URL and serves temporary release-like HTML', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);
  const docId = await seedDoc(handler, accessToken);

  const preview = await requestJson(handler, 'GET', `/v1/preview/${docId}`, { token: accessToken });
  assert.equal(preview.res.status, 200);
  assert.ok(preview.json.previewUrl.startsWith('/preview/'));
  assert.ok(preview.json.releaseLikeRef.startsWith('preview_'));

  const view = await requestJson(handler, 'GET', preview.json.previewUrl, {});
  assert.equal(view.res.status, 200);
});

test('private route reads static artifact and uses auth-scoped cache', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);
  const docId = await seedDoc(handler, accessToken);
  await requestJson(handler, 'POST', '/v1/publish', { token: accessToken, body: {} });

  const first = await requestJson(handler, 'GET', `/v1/private/${encodeURIComponent(docId)}`, { token: accessToken });
  assert.equal(first.res.status, 200);
  assert.equal(first.json.cache, 'miss');

  const second = await requestJson(handler, 'GET', `/v1/private/${encodeURIComponent(docId)}`, { token: accessToken });
  assert.equal(second.res.status, 200);
  assert.equal(second.json.cache, 'hit');
});
