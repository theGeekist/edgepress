import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiHandler } from '../../../apps/api/src/app.js';
import { createInMemoryPlatform } from '../src/store.js';
import { authAsAdmin, requestJson } from '../src/testUtils.js';

test('api returns expected envelopes for router-level paths', async () => {
  const platform = createInMemoryPlatform();
  const handler = createApiHandler(platform);

  const options = await handler(
    new Request('http://test.local/v1/documents', {
      method: 'OPTIONS'
    })
  );
  assert.equal(options.status, 204);

  const missing = await requestJson(handler, 'GET', '/v1/does-not-exist');
  assert.equal(missing.res.status, 404);
  assert.equal(missing.json.error.code, 'NOT_FOUND');
});

test('api returns 500 envelope when outer handler throws unexpectedly', async () => {
  const platform = createInMemoryPlatform();
  const events = [];
  platform.runtime.log = (level, event, meta) => events.push({ level, event, meta });
  const handler = createApiHandler(platform);

  const res = await handler({ method: 'GET', url: 'not a valid url' });
  const body = await res.json();
  assert.equal(res.status, 500);
  assert.equal(body.error.code, 'INTERNAL_ERROR');
  assert.ok(events.some((entry) => entry.event === 'unhandled_exception'));
});

test('api auth endpoints return explicit invalid/user-not-found failures', async () => {
  const platform = createInMemoryPlatform();
  const handler = createApiHandler(platform);

  const invalid = await requestJson(handler, 'POST', '/v1/auth/token', {
    body: { username: 'admin', password: 'wrong' }
  });
  assert.equal(invalid.res.status, 401);
  assert.equal(invalid.json.error.code, 'AUTH_INVALID');

  await platform.store.saveRefreshToken('r_orphan', 'u_missing');
  const missingUser = await requestJson(handler, 'POST', '/v1/auth/refresh', {
    body: { refreshToken: 'r_orphan' }
  });
  assert.equal(missingUser.res.status, 401);
  assert.equal(missingUser.json.error.code, 'AUTH_USER_NOT_FOUND');
});

test('api document and media routes return not-found envelopes for missing resources', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const patchMissing = await requestJson(handler, 'PATCH', '/v1/documents/doc_missing', {
    token: accessToken,
    body: { title: 'Nope' }
  });
  assert.equal(patchMissing.res.status, 404);
  assert.equal(patchMissing.json.error.code, 'DOCUMENT_NOT_FOUND');

  const revisionMissing = await requestJson(handler, 'POST', '/v1/documents/doc_missing/revisions', {
    token: accessToken,
    body: {}
  });
  assert.equal(revisionMissing.res.status, 404);
  assert.equal(revisionMissing.json.error.code, 'DOCUMENT_NOT_FOUND');

  const mediaMissing = await requestJson(handler, 'GET', '/v1/media/med_missing', {
    token: accessToken
  });
  assert.equal(mediaMissing.res.status, 404);
  assert.equal(mediaMissing.json.error.code, 'MEDIA_NOT_FOUND');
});

test('api preview and private routes enforce token/signature/availability failures', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const previewMissingDoc = await requestJson(handler, 'GET', '/v1/preview/doc_missing', {
    token: accessToken
  });
  assert.equal(previewMissingDoc.res.status, 404);
  assert.equal(previewMissingDoc.json.error.code, 'DOCUMENT_NOT_FOUND');

  const previewMissing = await requestJson(handler, 'GET', '/preview/prv_missing');
  assert.equal(previewMissing.res.status, 404);
  assert.equal(previewMissing.json.error.code, 'PREVIEW_NOT_FOUND');

  const created = await requestJson(handler, 'POST', '/v1/documents', {
    token: accessToken,
    body: { title: 'Preview doc', content: '<p>x</p>' }
  });
  const docId = created.json.document.id;
  const previewCreated = await requestJson(handler, 'GET', `/v1/preview/${docId}`, { token: accessToken });
  const previewUrl = new URL(`http://test.local${previewCreated.json.previewUrl}`);
  const token = previewUrl.pathname.split('/').at(-1);

  const previewNoSig = await requestJson(handler, 'GET', `/preview/${token}`);
  assert.equal(previewNoSig.res.status, 401);
  assert.equal(previewNoSig.json.error.code, 'PREVIEW_TOKEN_INVALID');

  const privateNoRelease = await requestJson(handler, 'GET', `/v1/private/${encodeURIComponent(docId)}`, {
    token: accessToken
  });
  assert.equal(privateNoRelease.res.status, 404);
  assert.equal(privateNoRelease.json.error.code, 'RELEASE_NOT_ACTIVE');
});

test('api converts unexpected route-level exceptions into forbidden envelopes', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const originalListDocuments = platform.store.listDocuments;
  platform.store.listDocuments = async () => {
    throw new Error('db exploded');
  };
  const docs = await requestJson(handler, 'GET', '/v1/documents', { token: accessToken });
  assert.equal(docs.res.status, 403);
  assert.equal(docs.json.error.code, 'FORBIDDEN');
  platform.store.listDocuments = originalListDocuments;

  const originalCreatePublishJob = platform.store.createPublishJob;
  platform.store.createPublishJob = async () => {
    throw new Error('job creation failed');
  };
  const publish = await requestJson(handler, 'POST', '/v1/publish', {
    token: accessToken,
    body: {}
  });
  assert.equal(publish.res.status, 403);
  assert.equal(publish.json.error.code, 'FORBIDDEN');
  platform.store.createPublishJob = originalCreatePublishJob;
});
