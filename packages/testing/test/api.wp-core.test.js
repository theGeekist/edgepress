import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiHandler } from '../../../apps/api/src/app.js';
import { createInMemoryPlatform } from '../src/store.js';
import { authAsAdmin, requestJson } from '../src/testUtils.js';

test('wp-core: POST /posts with various content formats parses correctly', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  // String content
  const stringContent = await requestJson(handler, 'POST', '/wp/v2/posts', {
    token: accessToken,
    body: { title: 'String Content', content: 'raw content' }
  });
  assert.equal(stringContent.res.status, 201);
  assert.equal(stringContent.json.content.raw, 'raw content');

  // Object with raw field
  const objContent = await requestJson(handler, 'POST', '/wp/v2/posts', {
    token: accessToken,
    body: { title: 'Object Content', content: { raw: 'raw content' } }
  });
  assert.equal(objContent.res.status, 201);
  assert.equal(objContent.json.content.raw, 'raw content');

  // Object with rendered field
  const renderedContent = await requestJson(handler, 'POST', '/wp/v2/posts', {
    token: accessToken,
    body: { title: 'Rendered Content', content: { rendered: 'rendered content' } }
  });
  assert.equal(renderedContent.res.status, 201);
  assert.equal(renderedContent.json.content.rendered, 'rendered content');

  // Null/empty content defaults to empty string
  const emptyContent = await requestJson(handler, 'POST', '/wp/v2/posts', {
    token: accessToken,
    body: { title: 'Empty Content', content: null }
  });
  assert.equal(emptyContent.res.status, 201);
  assert.equal(emptyContent.json.content.raw, '');
});

test('wp-core: GET /posts/:id requires authentication', async () => {
  const platform = createInMemoryPlatform();
  const handler = createApiHandler(platform);

  const res = await handler(new Request('http://test.local/wp/v2/posts/999999999'));
  assert.equal(res.status, 401);
});

test('wp-core: GET /pages/:id requires authentication', async () => {
  const platform = createInMemoryPlatform();
  const handler = createApiHandler(platform);

  const res = await handler(new Request('http://test.local/wp/v2/pages/page_missing'));
  assert.equal(res.status, 401);
});

test('wp-core: GET /posts returns posts with WP-compatible format', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  await requestJson(handler, 'POST', '/v1/documents', {
    token: accessToken,
    body: { title: 'WP Test Post', content: '<p>content</p>', type: 'post', status: 'published' }
  });

  const posts = await requestJson(handler, 'GET', '/wp/v2/posts', { token: accessToken });
  assert.equal(posts.res.status, 200);
  assert.ok(Array.isArray(posts.json));
  assert.ok(posts.json.length > 0);
  const post = posts.json[0];
  assert.ok(typeof post.id === 'number');
  assert.ok(post.date);
  assert.ok(post.link);
  assert.ok(post.title.raw);
  assert.ok(post.content.raw);
});

test('wp-core: GET /pages returns pages with WP-compatible format', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  await requestJson(handler, 'POST', '/v1/documents', {
    token: accessToken,
    body: { title: 'WP Test Page', content: '<p>content</p>', type: 'page', status: 'published' }
  });

  const pages = await requestJson(handler, 'GET', '/wp/v2/pages', { token: accessToken });
  assert.equal(pages.res.status, 200);
  assert.ok(Array.isArray(pages.json));
});

test('wp-core: GET /settings returns settings object', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const res = await requestJson(handler, 'GET', '/wp/v2/settings', { token: accessToken });
  assert.equal(res.res.status, 200);
  assert.ok(typeof res.json.title === 'string');
  assert.ok(typeof res.json.description === 'string');
  assert.ok(typeof res.json.url === 'string');
});

test('wp-core: GET /themes returns active theme', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const res = await requestJson(handler, 'GET', '/wp/v2/themes', { token: accessToken });
  assert.equal(res.res.status, 200);
  assert.ok(Array.isArray(res.json));
  assert.equal(res.json[0].status, 'active');
});

test('wp-core: GET /types returns content types', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const res = await requestJson(handler, 'GET', '/wp/v2/types', { token: accessToken });
  assert.equal(res.res.status, 200);
  assert.ok(res.json.post);
  assert.ok(res.json.page);
  assert.equal(res.json.post.slug, 'post');
});

test('wp-core: GET /types/:type returns single type record', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const postType = await requestJson(handler, 'GET', '/wp/v2/types/post', { token: accessToken });
  assert.equal(postType.res.status, 200);
  assert.equal(postType.json.slug, 'post');
  assert.ok(postType.json.labels);
  assert.ok(postType.json.supports);

  const pageType = await requestJson(handler, 'GET', '/wp/v2/types/page', { token: accessToken });
  assert.equal(pageType.res.status, 200);
  assert.equal(pageType.json.slug, 'page');

  // Intentional WP-compat fallback: unknown types normalize to page instead of 404.
  const invalidType = await requestJson(handler, 'GET', '/wp/v2/types/invalid', { token: accessToken });
  assert.equal(invalidType.res.status, 200);
  assert.equal(invalidType.json.slug, 'page');
});

test('wp-core: POST /posts/:id updates existing post', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const created = await requestJson(handler, 'POST', '/wp/v2/posts', {
    token: accessToken,
    body: { title: 'Original Title', content: 'original content', status: 'draft' }
  });
  assert.equal(created.res.status, 201);
  const postId = created.json.id;

  const updated = await requestJson(handler, 'POST', `/wp/v2/posts/${postId}`, {
    token: accessToken,
    body: { title: 'Updated Title', content: 'updated content', status: 'published' }
  });
  assert.equal(updated.res.status, 200);
  assert.equal(updated.json.title.raw, 'Updated Title');
  assert.equal(updated.json.content.raw, 'updated content');
  assert.equal(updated.json.status, 'published');
});

test('wp-core: POST /pages/:id updates existing page', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const created = await requestJson(handler, 'POST', '/wp/v2/pages', {
    token: accessToken,
    body: { title: 'Original Page', content: 'original page content', slug: 'test-page' }
  });
  assert.equal(created.res.status, 201);
  const pageId = created.json.id;

  const updated = await requestJson(handler, 'POST', `/wp/v2/pages/${pageId}`, {
    token: accessToken,
    body: { title: 'Updated Page', content: 'updated page content', slug: 'updated-page' }
  });
  assert.equal(updated.res.status, 200);
  assert.equal(updated.json.title.raw, 'Updated Page');
  assert.equal(updated.json.slug, 'updated-page');
});

test('wp-core: POST /posts/:id with internal ID works', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const doc = await requestJson(handler, 'POST', '/v1/documents', {
    token: accessToken,
    body: { title: 'Test Post', content: 'content', type: 'post' }
  });
  const internalId = doc.json.document.id;

  const updated = await requestJson(handler, 'POST', `/wp/v2/posts/${internalId}`, {
    token: accessToken,
    body: { title: 'Updated via Internal ID' }
  });
  assert.equal(updated.res.status, 200);
  assert.equal(updated.json.title.raw, 'Updated via Internal ID');
});

test('wp-core: POST /posts/:id returns 404 for non-existent post', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const res = await requestJson(handler, 'POST', '/wp/v2/posts/999999999', {
    token: accessToken,
    body: { title: 'Should not work' }
  });
  assert.equal(res.res.status, 404);
  assert.equal(res.json.code, 'rest_post_invalid_id');
});
