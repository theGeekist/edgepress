import test from 'node:test';
import assert from 'node:assert/strict';

import { createInMemoryPlatform } from '../src/store.js';
import { authAsAdmin, requestJson } from '../src/testUtils.js';

test('document type filtering is backed by canonical stored type', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const pageDoc = await requestJson(handler, 'POST', '/v1/documents', {
    token: accessToken,
    body: { title: 'Page Doc', content: '<p>page</p>', type: 'page' }
  });
  const postDoc = await requestJson(handler, 'POST', '/v1/documents', {
    token: accessToken,
    body: { title: 'Post Doc', content: '<p>post</p>', type: 'post' }
  });
  assert.equal(pageDoc.res.status, 201);
  assert.equal(postDoc.res.status, 201);

  const pagesOnly = await requestJson(handler, 'GET', '/v1/documents?type=page', { token: accessToken });
  assert.equal(pagesOnly.res.status, 200);
  assert.ok(pagesOnly.json.items.length >= 1);
  assert.ok(pagesOnly.json.items.every((doc) => (doc.type || 'page') === 'page'));

  const postsOnly = await requestJson(handler, 'GET', '/v1/documents?type=post', { token: accessToken });
  assert.equal(postsOnly.res.status, 200);
  assert.ok(postsOnly.json.items.length >= 1);
  assert.ok(postsOnly.json.items.every((doc) => (doc.type || 'page') === 'post'));
});

test('document creation enforces unique slugs and private read supports slug routes', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const first = await requestJson(handler, 'POST', '/v1/documents', {
    token: accessToken,
    body: { title: 'Hello World', content: '<p>one</p>' }
  });
  const second = await requestJson(handler, 'POST', '/v1/documents', {
    token: accessToken,
    body: { title: 'Hello World', content: '<p>two</p>' }
  });
  assert.equal(first.res.status, 201);
  assert.equal(second.res.status, 201);
  assert.equal(first.json.document.slug, 'hello-world');
  assert.equal(second.json.document.slug, 'hello-world-2');

  const publish = await requestJson(handler, 'POST', '/v1/publish', { token: accessToken, body: {} });
  assert.equal(publish.res.status, 201);

  const bySlug = await requestJson(handler, 'GET', '/v1/private/hello-world', { token: accessToken });
  assert.equal(bySlug.res.status, 200);
  assert.equal(bySlug.json.releaseId, publish.json.job.releaseId);

  const byLegacyDocId = await requestJson(
    handler,
    'GET',
    `/v1/private/${encodeURIComponent(first.json.document.id)}`,
    { token: accessToken }
  );
  assert.equal(byLegacyDocId.res.status, 200);
  assert.equal(byLegacyDocId.json.releaseId, publish.json.job.releaseId);
});

test('slug normalization transliterates diacritics for document create and patch', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const created = await requestJson(handler, 'POST', '/v1/documents', {
    token: accessToken,
    body: { title: 'Café Résumé', content: '<p>body</p>' }
  });
  assert.equal(created.res.status, 201);
  assert.equal(created.json.document.slug, 'cafe-resume');

  const updated = await requestJson(handler, 'PATCH', `/v1/documents/${encodeURIComponent(created.json.document.id)}`, {
    token: accessToken,
    body: { slug: 'Señor Niño' }
  });
  assert.equal(updated.res.status, 200);
  assert.equal(updated.json.document.slug, 'senor-nino');
});

test('route edits are reflected after republish while doc-id private reads stay stable', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const created = await requestJson(handler, 'POST', '/v1/documents', {
    token: accessToken,
    body: { title: 'Route Edit Me', content: '<p>v1</p>' }
  });
  assert.equal(created.res.status, 201);
  const docId = created.json.document.id;
  const initialSlug = created.json.document.slug;
  assert.equal(initialSlug, 'route-edit-me');

  const firstPublish = await requestJson(handler, 'POST', '/v1/publish', { token: accessToken, body: {} });
  assert.equal(firstPublish.res.status, 201);
  const firstReleaseId = firstPublish.json.job.releaseId;

  const firstBySlug = await requestJson(handler, 'GET', `/v1/private/${encodeURIComponent(initialSlug)}`, { token: accessToken });
  assert.equal(firstBySlug.res.status, 200);
  assert.equal(firstBySlug.json.releaseId, firstReleaseId);

  const patched = await requestJson(handler, 'PATCH', `/v1/documents/${encodeURIComponent(docId)}`, {
    token: accessToken,
    body: { slug: 'route-edit-me-v2', content: '<p>v2</p>' }
  });
  assert.equal(patched.res.status, 200);
  assert.equal(patched.json.document.slug, 'route-edit-me-v2');

  const secondPublish = await requestJson(handler, 'POST', '/v1/publish', { token: accessToken, body: {} });
  assert.equal(secondPublish.res.status, 201);
  const secondReleaseId = secondPublish.json.job.releaseId;
  const activateSecond = await requestJson(handler, 'POST', `/v1/releases/${encodeURIComponent(secondReleaseId)}/activate`, {
    token: accessToken,
    body: {}
  });
  assert.equal(activateSecond.res.status, 200);

  const oldSlugRead = await requestJson(handler, 'GET', `/v1/private/${encodeURIComponent(initialSlug)}`, { token: accessToken });
  assert.equal(oldSlugRead.res.status, 404);

  const newSlugRead = await requestJson(handler, 'GET', '/v1/private/route-edit-me-v2', { token: accessToken });
  assert.equal(newSlugRead.res.status, 200);
  assert.equal(newSlugRead.json.releaseId, secondReleaseId);

  const stableByDocId = await requestJson(handler, 'GET', `/v1/private/${encodeURIComponent(docId)}`, { token: accessToken });
  assert.equal(stableByDocId.res.status, 200);
  assert.equal(stableByDocId.json.releaseId, secondReleaseId);
});

test('navigation menus support default read and persisted upsert', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const initialList = await requestJson(handler, 'GET', '/v1/navigation/menus', { token: accessToken });
  assert.equal(initialList.res.status, 200);
  assert.deepEqual(initialList.json.items, []);

  const defaultPrimary = await requestJson(handler, 'GET', '/v1/navigation/menus/primary', { token: accessToken });
  assert.equal(defaultPrimary.res.status, 200);
  assert.equal(defaultPrimary.json.menu.key, 'primary');
  assert.ok(Array.isArray(defaultPrimary.json.menu.items));
  assert.equal(defaultPrimary.json.menu.items.length, 0);

  const saved = await requestJson(handler, 'PUT', '/v1/navigation/menus/primary', {
    token: accessToken,
    body: {
      title: 'Primary Nav',
      items: [
        { label: 'Home', kind: 'internal', route: 'home' },
        { label: 'Blog', kind: 'internal', route: 'blog' }
      ]
    }
  });
  assert.equal(saved.res.status, 200);
  assert.equal(saved.json.menu.title, 'Primary Nav');
  assert.equal(saved.json.menu.items.length, 2);
  assert.equal(saved.json.menu.items[0].order, 0);
  assert.equal(saved.json.menu.items[1].order, 1);

  const listed = await requestJson(handler, 'GET', '/v1/navigation/menus', { token: accessToken });
  assert.equal(listed.res.status, 200);
  assert.equal(listed.json.items.length, 1);
  assert.equal(listed.json.items[0].key, 'primary');
});
