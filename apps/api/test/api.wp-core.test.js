import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryPlatform } from '@geekist/edgepress/testing';
import { authAsAdmin, createHandler, requestJson } from '@geekist/edgepress/testing/test-utils.js';
import {
  getPatterns,
  getPattern,
  createPattern,
  updatePattern,
  deletePattern
} from '../src/adapters/http/controllers/content/patterns.js';

function clearPlatformState(platform) {
  platform.state.documents?.clear?.();
  platform.state.revisions?.clear?.();
  platform.state.revisionsByDoc?.clear?.();
  platform.state.mediaSessions?.clear?.();
  platform.state.mediaAssets?.clear?.();
  platform.state.navigationMenus?.clear?.();
  platform.state.releases?.clear?.();
  platform.state.blobs?.clear?.();
  platform.state.previews?.clear?.();
}

async function setupWpCorePatternTest(t) {
  const platform = createInMemoryPlatform();
  t.after(() => clearPlatformState(platform));
  const { handler, accessToken } = await authAsAdmin(platform);
  return { platform, handler, accessToken };
}

function authzErrorResponse(e) {
  const status = Number.isInteger(e?.status) ? e.status : 403;
  const code = typeof e?.code === 'string' ? e.code : 'FORBIDDEN';
  const message = typeof e?.message === 'string' ? e.message : 'Forbidden';
  return new Response(JSON.stringify({ code, message, data: { status } }), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

function createControllerContext(platform) {
  return {
    runtime: platform.runtime,
    store: platform.store,
    authzErrorResponse
  };
}

function createJsonRequest(path, { method = 'GET', body, token } = {}) {
  const headers = new Headers();
  if (token) headers.set('authorization', `Bearer ${token}`);
  if (body !== undefined) headers.set('content-type', 'application/json');
  return new Request(`http://test.local${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

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
  const handler = createHandler(platform);

  const res = await handler(new Request('http://test.local/wp/v2/posts/999999999'));
  assert.equal(res.status, 401);
});

test('wp-core: GET /pages/:id requires authentication', async () => {
  const platform = createInMemoryPlatform();
  const handler = createHandler(platform);

  const res = await handler(new Request('http://test.local/wp/v2/pages/999999999'));
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
  assert.ok(pages.json.length > 0);
  const page = pages.json[0];
  assert.ok(typeof page.id === 'number');
  assert.ok(page.link);
  assert.ok(page.title?.raw);
  assert.ok(page.content?.raw);
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
  assert.ok(res.json.length > 0, 'Expected at least one theme');
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

  // Unknown types should fail fast instead of silently normalizing.
  const invalidType = await requestJson(handler, 'GET', '/wp/v2/types/invalid', { token: accessToken });
  assert.equal(invalidType.res.status, 404);
});

describe('Patterns and Templates', () => {
  test('listPatterns: getPatterns filters to type=pattern and excludes non-pattern docs', async (t) => {
    const { platform, handler, accessToken } = await setupWpCorePatternTest(t);
    const context = createControllerContext(platform);
    const listPatterns = getPatterns(context);

    const patternDoc = await requestJson(handler, 'POST', '/v1/documents', {
      token: accessToken,
      body: { title: 'Hero Pattern', slug: 'hero-pattern', type: 'pattern', content: '<p>hero</p>' }
    });
    assert.equal(patternDoc.res.status, 201);

    const postDoc = await requestJson(handler, 'POST', '/v1/documents', {
      token: accessToken,
      body: { title: 'Ignore Post', slug: 'ignore-post', type: 'post', content: '<p>post</p>' }
    });
    assert.equal(postDoc.res.status, 201);

    const response = await listPatterns(createJsonRequest('/v1/patterns', { token: accessToken }));
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(payload.items));
    assert.ok(payload.items.length >= 1);
    assert.ok(payload.items.every((item) => item.type === 'pattern'));
    assert.ok(payload.items.some((item) => item.slug === 'hero-pattern'));
    assert.ok(payload.items.every((item) => item.slug !== 'ignore-post'));
  });

  test('getPattern/createPattern/updatePattern/deletePattern perform full CRUD through controller handlers', async (t) => {
    const { platform, accessToken } = await setupWpCorePatternTest(t);
    const context = createControllerContext(platform);
    const listPatterns = getPatterns(context);
    const getSinglePattern = getPattern(context);
    const createSinglePattern = createPattern(context);
    const updateSinglePattern = updatePattern(context);
    const deleteSinglePattern = deletePattern(context);

    const createdResponse = await createSinglePattern(
      createJsonRequest('/v1/patterns', {
        method: 'POST',
        token: accessToken,
        body: {
          title: 'CRUD Pattern',
          slug: 'crud-pattern',
          content: '<p>before update</p>',
          blocks: []
        }
      })
    );
    const createdPayload = await createdResponse.json();
    assert.equal(createdResponse.status, 201);
    assert.equal(createdPayload.pattern.type, 'pattern');

    const patternId = createdPayload.pattern.id;
    const fetchedResponse = await getSinglePattern(createJsonRequest(`/v1/patterns/${patternId}`, { token: accessToken }), {
      id: patternId
    });
    const fetchedPayload = await fetchedResponse.json();
    assert.equal(fetchedResponse.status, 200);
    assert.equal(fetchedPayload.pattern.slug, 'crud-pattern');

    const updatedResponse = await updateSinglePattern(
      createJsonRequest(`/v1/patterns/${patternId}`, {
        method: 'PUT',
        token: accessToken,
        body: {
          title: 'CRUD Pattern Updated',
          content: '<p>after update</p>',
          blocks: []
        }
      }),
      { id: patternId }
    );
    const updatedPayload = await updatedResponse.json();
    assert.equal(updatedResponse.status, 200);
    assert.equal(updatedPayload.pattern.title, 'CRUD Pattern Updated');

    const listedResponse = await listPatterns(createJsonRequest('/v1/patterns', { token: accessToken }));
    const listedPayload = await listedResponse.json();
    assert.equal(listedResponse.status, 200);
    assert.ok(listedPayload.items.some((item) => item.id === patternId));

    const deletedResponse = await deleteSinglePattern(
      createJsonRequest(`/v1/patterns/${patternId}`, { method: 'DELETE', token: accessToken }),
      { id: patternId }
    );
    const deletedPayload = await deletedResponse.json();
    assert.equal(deletedResponse.status, 200);
    assert.equal(deletedPayload.deleted, true);

    const fetchDeleted = await getSinglePattern(createJsonRequest(`/v1/patterns/${patternId}`, { token: accessToken }), {
      id: patternId
    });
    assert.equal(fetchDeleted.status, 404);
  });

  test('createPattern/getPattern enforce authorization, validation, and not-found responses', async (t) => {
    const { platform, accessToken } = await setupWpCorePatternTest(t);
    const context = createControllerContext(platform);
    const getSinglePattern = getPattern(context);
    const createSinglePattern = createPattern(context);

    const unauthorizedCreate = await createSinglePattern(
      createJsonRequest('/v1/patterns', {
        method: 'POST',
        body: { title: 'Unauthorized pattern', content: '<p>x</p>' }
      })
    );
    assert.equal(unauthorizedCreate.status, 401);

    const invalidBodyCreate = await createSinglePattern(
      createJsonRequest('/v1/patterns', {
        method: 'POST',
        token: accessToken,
        body: []
      })
    );
    assert.equal(invalidBodyCreate.status, 400);

    const notFound = await getSinglePattern(createJsonRequest('/v1/patterns/doc_missing', { token: accessToken }), {
      id: 'doc_missing'
    });
    assert.equal(notFound.status, 404);
  });

  test('wp-core facade: GET /wp/v2/patterns enforces auth and returns pattern records only', async (t) => {
    const { handler, accessToken } = await setupWpCorePatternTest(t);

    const unauthenticated = await handler(new Request('http://test.local/wp/v2/patterns'));
    assert.equal(unauthenticated.status, 401);

    const patternDoc = await requestJson(handler, 'POST', '/v1/documents', {
      token: accessToken,
      body: { title: 'Facade Pattern', slug: 'facade-pattern', type: 'pattern', content: '<p>pattern</p>' }
    });
    assert.equal(patternDoc.res.status, 201);

    const templateDoc = await requestJson(handler, 'POST', '/v1/documents', {
      token: accessToken,
      body: { title: 'Facade Template', slug: 'facade-template', type: 'template', content: '<p>template</p>' }
    });
    assert.equal(templateDoc.res.status, 201);

    const listed = await requestJson(handler, 'GET', '/wp/v2/patterns?type=pattern', { token: accessToken });
    assert.equal(listed.res.status, 200);
    assert.ok(Array.isArray(listed.json));
    assert.ok(listed.json.length >= 1);
    assert.ok(listed.json.every((entry) => entry.type === 'pattern'));
    assert.ok(listed.json.some((entry) => entry.slug === 'facade-pattern'));
    assert.ok(listed.json.every((entry) => entry.slug !== 'facade-template'));
  });

  test('wp-core facade: GET /wp/v2/templates/lookup enforces auth and handles success/404/validation', async (t) => {
    const { handler, accessToken } = await setupWpCorePatternTest(t);

    const unauthenticated = await handler(new Request('http://test.local/wp/v2/templates/lookup?slug=front-page'));
    assert.equal(unauthenticated.status, 401);

    const createdTemplate = await requestJson(handler, 'POST', '/v1/documents', {
      token: accessToken,
      body: {
        title: 'Front Page Template',
        slug: 'front-page',
        type: 'template',
        content: '<p>front page template</p>'
      }
    });
    assert.equal(createdTemplate.res.status, 201);

    const lookup = await requestJson(handler, 'GET', '/wp/v2/templates/lookup?slug=front-page', { token: accessToken });
    assert.equal(lookup.res.status, 200);
    assert.equal(lookup.json.slug, 'front-page');
    assert.equal(lookup.json.type, 'template');

    const missing = await requestJson(handler, 'GET', '/wp/v2/templates/lookup?slug=unknown-template', {
      token: accessToken
    });
    assert.equal(missing.res.status, 404);

    const invalid = await requestJson(handler, 'GET', '/wp/v2/templates/lookup', { token: accessToken });
    assert.equal(invalid.res.status, 400);
  });
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
  assert.equal(updated.json.status, 'publish');
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
