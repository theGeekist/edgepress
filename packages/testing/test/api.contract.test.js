import test from 'node:test';
import assert from 'node:assert/strict';
import { routes, assertKeys } from '../../contracts/src/index.js';
import { createInMemoryPlatform } from '../src/inMemoryPlatform.js';
import { authAsAdmin, requestJson } from '../src/testUtils.js';

async function createSampleDocument(handler, token, { title = 'Sample', content = '<p>body</p>' } = {}) {
  const created = await requestJson(handler, 'POST', '/v1/documents', {
    token,
    body: { title, content }
  });
  assert.equal(created.res.status, 201);
  return created.json.document;
}

function assertResponseShape(routeName, payload) {
  const route = routes[routeName];
  assert.ok(route, `Unknown route in contract test: ${routeName}`);
  assertKeys(payload, route.response);
}

test('canonical API contracts return required response keys', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken, refreshToken } = await authAsAdmin(platform);

  const logout = await requestJson(handler, 'POST', '/v1/auth/logout', { body: { refreshToken } });
  assert.equal(logout.res.status, 200);
  assertResponseShape('POST /v1/auth/logout', logout.json);

  const auth = await requestJson(handler, 'POST', '/v1/auth/token', {
    body: { username: 'admin', password: 'admin' }
  });
  assert.equal(auth.res.status, 200);
  assertResponseShape('POST /v1/auth/token', auth.json);
  const token = auth.json.accessToken;

  const docsList0 = await requestJson(handler, 'GET', '/v1/documents', { token });
  assert.equal(docsList0.res.status, 200);
  assertResponseShape('GET /v1/documents', docsList0.json);

  const created = await requestJson(handler, 'POST', '/v1/documents', {
    token,
    body: { title: 'Hello', content: '<p>world</p>' }
  });
  assert.equal(created.res.status, 201);
  assertResponseShape('POST /v1/documents', created.json);
  const docId = created.json.document.id;

  const updated = await requestJson(handler, 'PATCH', `/v1/documents/${docId}`, {
    token,
    body: { title: 'Hello 2', content: '<p>world 2</p>' }
  });
  assert.equal(updated.res.status, 200);
  assertResponseShape('PATCH /v1/documents/:id', updated.json);

  const revisions = await requestJson(handler, 'GET', `/v1/documents/${docId}/revisions`, { token });
  assert.equal(revisions.res.status, 200);
  assertResponseShape('GET /v1/documents/:id/revisions', revisions.json);

  const addRevision = await requestJson(handler, 'POST', `/v1/documents/${docId}/revisions`, { token, body: {} });
  assert.equal(addRevision.res.status, 201);
  assertResponseShape('POST /v1/documents/:id/revisions', addRevision.json);

  const mediaInit = await requestJson(handler, 'POST', '/v1/media', { token, body: {} });
  assert.equal(mediaInit.res.status, 201);
  assertResponseShape('POST /v1/media', mediaInit.json);

  const mediaInitAlias = await requestJson(handler, 'POST', '/v1/media/init', { token, body: {} });
  assert.equal(mediaInitAlias.res.status, 201);
  assertResponseShape('POST /v1/media/init', mediaInitAlias.json);

  const mediaFinalize = await requestJson(handler, 'POST', `/v1/media/${mediaInit.json.mediaId}/finalize`, {
    token,
    body: {
      uploadToken: mediaInit.json.uploadToken,
      filename: 'hero.jpg',
      mimeType: 'image/jpeg',
      size: 1234,
      width: 800,
      height: 600,
      alt: 'Hero',
      caption: 'Cover image',
      description: 'A hero image'
    }
  });
  assert.equal(mediaFinalize.res.status, 200);
  assertResponseShape('POST /v1/media/:id/finalize', mediaFinalize.json);

  const mediaList = await requestJson(handler, 'GET', '/v1/media', { token });
  assert.equal(mediaList.res.status, 200);
  assertResponseShape('GET /v1/media', mediaList.json);

  const mediaGet = await requestJson(handler, 'GET', `/v1/media/${mediaInit.json.mediaId}`, { token });
  assert.equal(mediaGet.res.status, 200);
  assertResponseShape('GET /v1/media/:id', mediaGet.json);

  const mediaPatch = await requestJson(handler, 'PATCH', `/v1/media/${mediaInit.json.mediaId}`, {
    token,
    body: { alt: 'Updated alt', caption: 'Updated caption', description: 'Updated description' }
  });
  assert.equal(mediaPatch.res.status, 200);
  assertResponseShape('PATCH /v1/media/:id', mediaPatch.json);

  const mediaDelete = await requestJson(handler, 'DELETE', `/v1/media/${mediaInit.json.mediaId}`, { token });
  assert.equal(mediaDelete.res.status, 200);
  assertResponseShape('DELETE /v1/media/:id', mediaDelete.json);

  const publish = await requestJson(handler, 'POST', '/v1/publish', { token, body: {} });
  assert.equal(publish.res.status, 201);
  assertResponseShape('POST /v1/publish', publish.json);

  const publishJob = await requestJson(handler, 'GET', `/v1/publish/${publish.json.job.id}`, { token });
  assert.equal(publishJob.res.status, 200);
  assertResponseShape('GET /v1/publish/:jobId', publishJob.json);

  const releases = await requestJson(handler, 'GET', '/v1/releases', { token });
  assert.equal(releases.res.status, 200);
  assertResponseShape('GET /v1/releases', releases.json);

  const activate = await requestJson(handler, 'POST', `/v1/releases/${publish.json.job.releaseId}/activate`, { token, body: {} });
  assert.equal(activate.res.status, 200);
  assertResponseShape('POST /v1/releases/:id/activate', activate.json);

  const navMenus = await requestJson(handler, 'GET', '/v1/navigation/menus', { token });
  assert.equal(navMenus.res.status, 200);
  assertResponseShape('GET /v1/navigation/menus', navMenus.json);

  const navPrimary = await requestJson(handler, 'GET', '/v1/navigation/menus/primary', { token });
  assert.equal(navPrimary.res.status, 200);
  assertResponseShape('GET /v1/navigation/menus/:key', navPrimary.json);

  const navPut = await requestJson(handler, 'PUT', '/v1/navigation/menus/primary', {
    token,
    body: {
      title: 'Primary',
      items: [{ label: 'Home', kind: 'internal', route: 'home' }]
    }
  });
  assert.equal(navPut.res.status, 200);
  assertResponseShape('PUT /v1/navigation/menus/:key', navPut.json);

  const preview = await requestJson(handler, 'GET', `/v1/preview/${docId}`, { token });
  assert.equal(preview.res.status, 200);
  assertResponseShape('GET /v1/preview/:documentId', preview.json);

  const form = await requestJson(handler, 'POST', '/v1/forms/contact/submit', {
    body: { payload: { email: 'x@example.com' } }
  });
  assert.equal(form.res.status, 202);
  assertResponseShape('POST /v1/forms/:formId/submit', form.json);

  const privateRead = await requestJson(handler, 'GET', `/v1/private/${encodeURIComponent(docId)}`, { token });
  assert.equal(privateRead.res.status, 200);
  assertResponseShape('GET /v1/private/:route', privateRead.json);

  const refresh = await requestJson(handler, 'POST', '/v1/auth/refresh', {
    body: { refreshToken: auth.json.refreshToken }
  });
  assert.equal(refresh.res.status, 200);
  assertResponseShape('POST /v1/auth/refresh', refresh.json);

  assert.ok(accessToken);
});

test('error envelope covers auth failures and contract stays stable', async () => {
  const platform = createInMemoryPlatform();
  const { handler } = await authAsAdmin(platform);

  const unauthorized = await requestJson(handler, 'GET', '/v1/documents');
  assert.equal(unauthorized.res.status, 401);
  assert.deepStrictEqual(Object.keys(unauthorized.json), ['error']);
  assert.equal(unauthorized.json.error.code, 'AUTH_REQUIRED');
  assert.ok(unauthorized.json.error.message.includes('Authentication required'));
});

test('preview tokens expire and invalid tokens return envelope', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);
  const document = await createSampleDocument(handler, accessToken);

  const preview = await requestJson(handler, 'GET', `/v1/preview/${document.id}`, { token: accessToken });
  assert.equal(preview.res.status, 200);
  const previewPath = preview.json.previewUrl;
  const previewUrl = new URL(`http://localhost${previewPath}`);
  const previewToken = previewUrl.pathname.replace('/preview/', '');

  const previewEntry = platform.state.previews.get(previewToken);
  previewEntry.expiresAt = new Date(Date.now() - 1000).toISOString();

  const expired = await requestJson(handler, 'GET', previewPath);
  assert.equal(expired.res.status, 410);
  assert.equal(expired.json.error.code, 'PREVIEW_EXPIRED');
  assert.ok(expired.json.error.message.includes('expired'));

  const invalidSignature = await requestJson(handler, 'GET', `${previewUrl.pathname}?sig=bad_signature`);
  assert.equal(invalidSignature.res.status, 401);
  assert.equal(invalidSignature.json.error.code, 'PREVIEW_TOKEN_INVALID');

  const missing = await requestJson(handler, 'GET', '/preview/not-a-token');
  assert.equal(missing.res.status, 404);
  assert.equal(missing.json.error.code, 'PREVIEW_NOT_FOUND');
});
