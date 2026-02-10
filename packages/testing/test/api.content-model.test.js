import test from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryPlatform } from '../src/store.js';
import { authAsAdmin, requestJson } from '../src/testUtils.js';

test('content-model: GET /v1/content-types returns content types list', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const res = await requestJson(handler, 'GET', '/v1/content-types', { token: accessToken });
  assert.equal(res.res.status, 200);
  assert.ok(Array.isArray(res.json.items));
});

test('content-model: PUT /content-types creates and updates content types', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const created = await requestJson(handler, 'PUT', '/v1/content-types/article', {
    token: accessToken,
    body: {
      label: 'Article',
      kind: 'content',
      supports: { title: true, editor: true },
      taxonomies: ['category'],
      statusOptions: ['draft', 'published']
    }
  });
  assert.equal(created.res.status, 200);
  assert.equal(created.json.contentType.slug, 'article');
  assert.equal(created.json.contentType.label, 'Article');

  const updated = await requestJson(handler, 'PUT', '/v1/content-types/article', {
    token: accessToken,
    body: {
      label: 'Articles',
      kind: 'content',
      supports: { title: true, editor: true, excerpt: true },
      taxonomies: ['category', 'post_tag'],
      statusOptions: ['draft', 'published', 'archived']
    }
  });
  assert.equal(updated.res.status, 200);
  assert.equal(updated.json.contentType.label, 'Articles');
});

test('content-model: PUT /taxonomies creates and updates taxonomies', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const created = await requestJson(handler, 'PUT', '/v1/taxonomies/tag', {
    token: accessToken,
    body: {
      label: 'Tags',
      hierarchical: false,
      objectTypes: ['page', 'post']
    }
  });
  assert.equal(created.res.status, 200);
  assert.equal(created.json.taxonomy.slug, 'tag');
  assert.equal(created.json.taxonomy.hierarchical, false);

  const updated = await requestJson(handler, 'PUT', '/v1/taxonomies/tag', {
    token: accessToken,
    body: {
      label: 'Post Tags',
      hierarchical: false,
      objectTypes: ['post']
    }
  });
  assert.equal(updated.res.status, 200);
  assert.equal(updated.json.taxonomy.label, 'Post Tags');
});

test('content-model: PUT /taxonomies sets allowParent=false for flat taxonomies', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const created = await requestJson(handler, 'PUT', '/v1/taxonomies/keyword', {
    token: accessToken,
    body: {
      label: 'Keywords',
      hierarchical: false,
      objectTypes: ['post'],
      constraints: { allowParent: true, maxDepth: 5 }
    }
  });
  assert.equal(created.res.status, 200);
  assert.equal(created.json.taxonomy.constraints.allowParent, false);
});

test('content-model: PUT /taxonomies preserves constraints for hierarchical taxonomies', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const created = await requestJson(handler, 'PUT', '/v1/taxonomies/category', {
    token: accessToken,
    body: {
      label: 'Categories',
      hierarchical: true,
      objectTypes: ['post'],
      constraints: { allowParent: true, maxDepth: 3 }
    }
  });
  assert.equal(created.res.status, 200);
  assert.equal(created.json.taxonomy.constraints.allowParent, true);
  assert.equal(created.json.taxonomy.constraints.maxDepth, 3);
});

test('content-model: PUT /terms creates terms in taxonomies', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  await requestJson(handler, 'PUT', '/v1/taxonomies/genre', {
    token: accessToken,
    body: {
      label: 'Genres',
      hierarchical: false,
      objectTypes: ['post']
    }
  });

  const created = await requestJson(handler, 'PUT', '/v1/terms/term_genre_rock', {
    token: accessToken,
    body: {
      taxonomySlug: 'genre',
      name: 'Rock',
      slug: 'rock'
    }
  });
  assert.equal(created.res.status, 200);
  assert.equal(created.json.term.slug, 'rock');

  const duplicate = await requestJson(handler, 'POST', '/v1/terms', {
    token: accessToken,
    body: {
      taxonomySlug: 'genre',
      name: 'Rock Music',
      slug: 'rock'
    }
  });
  assert.equal(duplicate.res.status, 409);
  assert.equal(duplicate.json.error.code, 'TERM_SLUG_CONFLICT');
});

test('content-model: upsertTerm rejects parent in flat taxonomy', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  await requestJson(handler, 'PUT', '/v1/taxonomies/keyword', {
    token: accessToken,
    body: {
      label: 'Keywords',
      hierarchical: false,
      objectTypes: ['post']
    }
  });

  const res = await requestJson(handler, 'POST', '/v1/terms', {
    token: accessToken,
    body: {
      taxonomySlug: 'keyword',
      name: 'Keyword',
      parentId: 'term_parent'
    }
  });
  assert.equal(res.res.status, 400);
  assert.equal(res.json.error.code, 'TERM_INVALID_PARENT');
});

test('content-model: upsertTerm rejects parent from different taxonomy', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  await requestJson(handler, 'PUT', '/v1/taxonomies/genre', {
    token: accessToken,
    body: {
      label: 'Genres',
      hierarchical: true,
      objectTypes: ['post']
    }
  });

  await requestJson(handler, 'PUT', '/v1/taxonomies/mood', {
    token: accessToken,
    body: {
      label: 'Moods',
      hierarchical: true,
      objectTypes: ['post']
    }
  });

  const parent = await requestJson(handler, 'POST', '/v1/terms', {
    token: accessToken,
    body: {
      taxonomySlug: 'genre',
      name: 'Rock',
      slug: 'rock'
    }
  });
  assert.equal(parent.res.status, 200);
  const parentId = parent.json.term.id;

  const res = await requestJson(handler, 'POST', '/v1/terms', {
    token: accessToken,
    body: {
      taxonomySlug: 'mood',
      name: 'Happy',
      slug: 'happy',
      parentId: parentId
    }
  });
  assert.equal(res.res.status, 400);
  assert.equal(res.json.error.code, 'TERM_INVALID_PARENT');
  assert.ok(res.json.error.message.includes('same taxonomy'));
});

test('content-model: GET /terms supports filtering by taxonomy', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const all = await requestJson(handler, 'GET', '/v1/terms', { token: accessToken });
  assert.equal(all.res.status, 200);
  assert.ok(Array.isArray(all.json.items));

  const byTaxonomy = await requestJson(handler, 'GET', '/v1/terms?taxonomySlug=category', { token: accessToken });
  assert.equal(byTaxonomy.res.status, 200);
});
