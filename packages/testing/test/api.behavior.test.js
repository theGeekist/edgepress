import test from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryPlatform } from '../src/store.js';
import { authAsAdmin, requestJson } from '../src/testUtils.js';

async function createDoc(handler, token) {
  const created = await requestJson(handler, 'POST', '/v1/documents', {
    token,
    body: { title: 'Behavior Doc', content: '<p>body</p>' }
  });
  assert.equal(created.res.status, 201);
  return created.json.document.id;
}

test('auth refresh rejects invalid and revoked refresh tokens with envelope', async () => {
  const platform = createInMemoryPlatform();
  const { handler, refreshToken } = await authAsAdmin(platform);

  const invalid = await requestJson(handler, 'POST', '/v1/auth/refresh', {
    body: { refreshToken: 'r_invalid' }
  });
  assert.equal(invalid.res.status, 401);
  assert.equal(invalid.json.error.code, 'AUTH_INVALID_REFRESH');

  await requestJson(handler, 'POST', '/v1/auth/logout', { body: { refreshToken } });
  const revoked = await requestJson(handler, 'POST', '/v1/auth/refresh', {
    body: { refreshToken }
  });
  assert.equal(revoked.res.status, 401);
  assert.equal(revoked.json.error.code, 'AUTH_INVALID_REFRESH');
});

test('media finalize enforces token and not-found semantics', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const init = await requestJson(handler, 'POST', '/v1/media', { token: accessToken, body: {} });
  assert.equal(init.res.status, 201);

  const wrongToken = await requestJson(handler, 'POST', `/v1/media/${init.json.mediaId}/finalize`, {
    token: accessToken,
    body: {
      uploadToken: 'up_wrong',
      filename: 'hero.jpg',
      mimeType: 'image/jpeg',
      size: 11
    }
  });
  assert.equal(wrongToken.res.status, 401);
  assert.equal(wrongToken.json.error.code, 'MEDIA_UPLOAD_TOKEN_INVALID');

  const missing = await requestJson(handler, 'POST', '/v1/media/med_missing/finalize', {
    token: accessToken,
    body: {
      uploadToken: 'up_missing',
      filename: 'hero.jpg',
      mimeType: 'image/jpeg',
      size: 11
    }
  });
  assert.equal(missing.res.status, 404);
  assert.equal(missing.json.error.code, 'MEDIA_NOT_FOUND');
});

test('media list and metadata updates persist canonical fields', async () => {
  const platform = createInMemoryPlatform();
  platform.blobStore.signedReadUrl = async (path, ttlSeconds = 300) => `/blob/${path}?ttl=${ttlSeconds}`;
  const { handler, accessToken } = await authAsAdmin(platform);

  const init = await requestJson(handler, 'POST', '/v1/media/init', { token: accessToken, body: {} });
  assert.equal(init.res.status, 201);

  const uploadReq = new Request(`http://test.local/uploads/${init.json.mediaId}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'x-upload-token': init.json.uploadToken,
      'content-type': 'image/jpeg'
    },
    body: new Uint8Array([1, 2, 3, 4])
  });
  const uploadRes = await handler(uploadReq);
  assert.equal(uploadRes.status, 200);

  const finalized = await requestJson(handler, 'POST', `/v1/media/${init.json.mediaId}/finalize`, {
    token: accessToken,
    body: {
      uploadToken: init.json.uploadToken,
      filename: 'hero.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      width: 1200,
      height: 630,
      alt: 'Hero image',
      caption: 'Primary hero',
      description: 'Homepage hero media'
    }
  });
  assert.equal(finalized.res.status, 200);
  assert.equal(finalized.json.media.width, 1200);
  assert.equal(finalized.json.media.height, 630);
  assert.equal(finalized.json.media.alt, 'Hero image');
  assert.ok(/^http:\/\/test\.local\/blob\//.test(finalized.json.media.url));

  const mediaUrl = new URL(finalized.json.media.url);
  const blobRes = await handler(new Request(mediaUrl.toString(), { method: 'GET' }));
  assert.equal(blobRes.status, 200);
  assert.equal(blobRes.headers.get('content-type'), 'image/jpeg');
  const blobBytes = new Uint8Array(await blobRes.arrayBuffer());
  assert.deepEqual(Array.from(blobBytes), [1, 2, 3, 4]);

  const updated = await requestJson(handler, 'PATCH', `/v1/media/${init.json.mediaId}`, {
    token: accessToken,
    body: {
      alt: 'Updated alt',
      caption: 'Updated caption',
      description: 'Updated description'
    }
  });
  assert.equal(updated.res.status, 200);
  assert.equal(updated.json.media.alt, 'Updated alt');

  const listed = await requestJson(handler, 'GET', '/v1/media?q=updated&mimeType=image%2Fjpeg', {
    token: accessToken
  });
  assert.equal(listed.res.status, 200);
  assert.equal(listed.json.items.length, 1);
  assert.equal(listed.json.items[0].id, init.json.mediaId);
  assert.equal(listed.json.pagination.totalItems, 1);

  const deleted = await requestJson(handler, 'DELETE', `/v1/media/${init.json.mediaId}`, {
    token: accessToken
  });
  assert.equal(deleted.res.status, 200);
  assert.equal(deleted.json.deleted, true);

  const listedAfterDelete = await requestJson(handler, 'GET', '/v1/media', {
    token: accessToken
  });
  assert.equal(listedAfterDelete.res.status, 200);
  assert.equal(listedAfterDelete.json.items.length, 0);
});

test('release activation and publish job errors use canonical envelopes', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const missingActivation = await requestJson(handler, 'POST', '/v1/releases/rel_missing/activate', {
    token: accessToken,
    body: {}
  });
  assert.equal(missingActivation.res.status, 404);
  assert.equal(missingActivation.json.error.code, 'RELEASE_NOT_FOUND');

  const missingJob = await requestJson(handler, 'GET', '/v1/publish/job_missing', { token: accessToken });
  assert.equal(missingJob.res.status, 404);
  assert.equal(missingJob.json.error.code, 'PUBLISH_JOB_NOT_FOUND');
});

test('preview TTL parsing falls back and clamps from runtime env', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);
  const docId = await createDoc(handler, accessToken);

  platform.runtime.envOverrides.PREVIEW_TTL_SECONDS = 'NaN';
  const fallbackPreview = await requestJson(handler, 'GET', `/v1/preview/${docId}`, { token: accessToken });
  assert.equal(fallbackPreview.res.status, 200);
  const fallbackMs = new Date(fallbackPreview.json.expiresAt).getTime() - Date.now();
  assert.ok(fallbackMs > 14 * 60 * 1000);

  platform.runtime.envOverrides.PREVIEW_TTL_SECONDS = '1';
  const minRejectedPreview = await requestJson(handler, 'GET', `/v1/preview/${docId}`, { token: accessToken });
  assert.equal(minRejectedPreview.res.status, 200);
  const minRejectedMs = new Date(minRejectedPreview.json.expiresAt).getTime() - Date.now();
  assert.ok(minRejectedMs > 14 * 60 * 1000);

  platform.runtime.envOverrides.PREVIEW_TTL_SECONDS = String(7 * 24 * 60 * 60);
  const clampedPreview = await requestJson(handler, 'GET', `/v1/preview/${docId}`, { token: accessToken });
  assert.equal(clampedPreview.res.status, 200);
  const clampedMs = new Date(clampedPreview.json.expiresAt).getTime() - Date.now();
  assert.ok(clampedMs <= 24 * 60 * 60 * 1000 + 5000);
});

test('forms endpoint returns 429 envelope when rate limit exceeded', async () => {
  const platform = createInMemoryPlatform();
  const { handler } = await authAsAdmin(platform);

  let limited;
  for (let i = 0; i < 6; i += 1) {
    limited = await requestJson(handler, 'POST', '/v1/forms/contact/submit', {
      headers: { 'x-ip-hash': 'ip_same', 'x-ua-hash': 'ua_same' },
      body: { payload: { idx: i } }
    });
  }

  assert.equal(limited.res.status, 429);
  assert.equal(limited.json.error.code, 'RATE_LIMITED');
});

test('publish validates sourceRevisionSet payload shape', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const notArray = await requestJson(handler, 'POST', '/v1/publish', {
    token: accessToken,
    body: { sourceRevisionSet: 'rev_bad' }
  });
  assert.equal(notArray.res.status, 400);
  assert.equal(notArray.json.error.code, 'PUBLISH_INVALID_SOURCE_SET');

  const invalidEntry = await requestJson(handler, 'POST', '/v1/publish', {
    token: accessToken,
    body: { sourceRevisionSet: ['rev_ok', 42] }
  });
  assert.equal(invalidEntry.res.status, 400);
  assert.equal(invalidEntry.json.error.code, 'PUBLISH_INVALID_SOURCE_SET');
});

test('publish canonicalizes sourceRevisionId from sourceRevisionSet when omitted', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const publish = await requestJson(handler, 'POST', '/v1/publish', {
    token: accessToken,
    body: { sourceRevisionSet: ['rev_derived'] }
  });
  assert.equal(publish.res.status, 201);
  assert.equal(publish.json.job.sourceRevisionId, 'rev_derived');
  assert.deepEqual(publish.json.job.sourceRevisionSet, ['rev_derived']);
});

test('content model routes manage content types, taxonomies, and terms', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const contentTypes = await requestJson(handler, 'GET', '/v1/content-types', { token: accessToken });
  assert.equal(contentTypes.res.status, 200);
  assert.ok(contentTypes.json.items.some((entry) => entry.slug === 'page'));

  const updatedType = await requestJson(handler, 'PUT', '/v1/content-types/article', {
    token: accessToken,
    body: {
      label: 'Article',
      supports: { title: true, editor: true },
      fields: [{ key: 'subtitle', label: 'Subtitle', kind: 'text', required: false, default: '' }],
      taxonomies: ['category', 'post_tag'],
      statusOptions: ['draft', 'published', 'trash']
    }
  });
  assert.equal(updatedType.res.status, 200);
  assert.equal(updatedType.json.contentType.slug, 'article');

  const taxonomy = await requestJson(handler, 'PUT', '/v1/taxonomies/topic', {
    token: accessToken,
    body: {
      label: 'Topics',
      hierarchical: true,
      objectTypes: ['article']
    }
  });
  assert.equal(taxonomy.res.status, 200);
  assert.equal(taxonomy.json.taxonomy.slug, 'topic');

  const term = await requestJson(handler, 'PUT', '/v1/terms/term_topic_ai', {
    token: accessToken,
    body: {
      taxonomySlug: 'topic',
      name: 'AI'
    }
  });
  assert.equal(term.res.status, 200);
  assert.equal(term.json.term.taxonomySlug, 'topic');

  const createdByPost = await requestJson(handler, 'POST', '/v1/terms', {
    token: accessToken,
    body: {
      taxonomySlug: 'topic',
      name: 'ML'
    }
  });
  assert.equal(createdByPost.res.status, 200);
  assert.equal(createdByPost.json.term.taxonomySlug, 'topic');

  const terms = await requestJson(handler, 'GET', '/v1/terms?taxonomySlug=topic', { token: accessToken });
  assert.equal(terms.res.status, 200);
  assert.equal(terms.json.items.length, 2);
});

test('document revisions snapshot publish-relevant metadata fields', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const created = await requestJson(handler, 'POST', '/v1/documents', {
    token: accessToken,
    body: {
      title: 'Snapshot Doc',
      type: 'post',
      slug: 'snapshot-doc',
      excerpt: 'short',
      status: 'draft',
      featuredImageId: 'med_123',
      fields: { subtitle: 'sub' },
      termIds: ['term_news'],
      blocks: [{ name: 'core/paragraph', attributes: {}, innerBlocks: [], originalContent: '<p>x</p>' }]
    }
  });
  assert.equal(created.res.status, 201);
  assert.equal(created.json.revision.excerpt, 'short');
  assert.equal(created.json.revision.slug, 'snapshot-doc');
  assert.equal(created.json.revision.status, 'draft');
  assert.equal(created.json.revision.featuredImageId, 'med_123');
  assert.deepEqual(created.json.revision.fields, { subtitle: 'sub' });
  assert.deepEqual(created.json.revision.termIds, ['term_news']);

  const docId = created.json.document.id;
  const updated = await requestJson(handler, 'PATCH', `/v1/documents/${docId}`, {
    token: accessToken,
    body: {
      excerpt: 'short-2',
      slug: 'snapshot-doc-2',
      status: 'published',
      featuredImageId: 'med_456',
      fields: { subtitle: 'sub2' },
      termIds: ['term_release']
    }
  });
  assert.equal(updated.res.status, 200);
  assert.equal(updated.json.revision.excerpt, 'short-2');
  assert.equal(updated.json.revision.slug, 'snapshot-doc-2');
  assert.equal(updated.json.revision.status, 'published');
  assert.equal(updated.json.revision.featuredImageId, 'med_456');
  assert.deepEqual(updated.json.revision.fields, { subtitle: 'sub2' });
  assert.deepEqual(updated.json.revision.termIds, ['term_release']);
});

test('wp-compatible page routes read and update entities for editor core-data', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const created = await requestJson(handler, 'POST', '/v1/documents', {
    token: accessToken,
    body: { title: 'WP Page', content: '<p>hello</p>', type: 'page' }
  });
  const docId = created.json.document.id;

  const typeRecord = await requestJson(handler, 'GET', '/wp/v2/types/page', {
    token: accessToken
  });
  assert.equal(typeRecord.res.status, 200);
  assert.equal(typeRecord.json.slug, 'page');
  assert.equal(typeRecord.json.labels.view_item, 'View Page');

  const pageEntity = await requestJson(handler, 'GET', `/wp/v2/pages/${docId}`, {
    token: accessToken
  });
  assert.equal(pageEntity.res.status, 200);
  assert.equal(typeof pageEntity.json.id, 'number');
  assert.equal(pageEntity.json.title.raw, 'WP Page');
  assert.equal(pageEntity.json.content.raw, '<p>hello</p>');

  const wpNumericId = pageEntity.json.id;
  const pageEntityByNumeric = await requestJson(handler, 'GET', `/wp/v2/pages/${wpNumericId}`, {
    token: accessToken
  });
  assert.equal(pageEntityByNumeric.res.status, 200);
  assert.equal(pageEntityByNumeric.json.id, wpNumericId);

  const updated = await requestJson(handler, 'POST', `/wp/v2/pages/${wpNumericId}`, {
    token: accessToken,
    body: {
      title: 'Updated via wp/v2',
      content: '<p>updated</p>'
    }
  });
  assert.equal(updated.res.status, 200);
  assert.equal(updated.json.title.raw, 'Updated via wp/v2');
  assert.equal(updated.json.content.raw, '<p>updated</p>');

  const prefixedTypes = await requestJson(handler, 'GET', '/v1/wp/v2/types/page', {
    token: accessToken
  });
  assert.equal(prefixedTypes.res.status, 200);
  assert.equal(prefixedTypes.json.slug, 'page');

  const prefixedPage = await requestJson(handler, 'GET', `/v1/wp/v2/pages/${wpNumericId}`, {
    token: accessToken
  });
  assert.equal(prefixedPage.res.status, 200);
  assert.equal(prefixedPage.json.id, wpNumericId);

  const settings = await requestJson(handler, 'GET', '/v1/wp/v2/settings', {
    token: accessToken
  });
  assert.equal(settings.res.status, 200);
  assert.equal(typeof settings.json.title, 'string');

  const themes = await requestJson(handler, 'GET', '/v1/wp/v2/themes', {
    token: accessToken
  });
  assert.equal(themes.res.status, 200);
  assert.equal(Array.isArray(themes.json), true);
  assert.equal(themes.json[0].status, 'active');

  const siteRoot = await requestJson(
    handler,
    'GET',
    '/v1?_fields=description,gmt_offset,home,name,site_icon,site_icon_url,site_logo,timezone_string,url,page_for_posts,page_on_front,show_on_front'
    ,
    { token: accessToken }
  );
  assert.equal(siteRoot.res.status, 200);
  assert.equal(typeof siteRoot.json.name, 'string');
});

test('private cache TTL parsing falls back and clamps from runtime env', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const created = await requestJson(handler, 'POST', '/v1/documents', {
    token: accessToken,
    body: { title: 'TTL doc', content: '<p>ttl</p>' }
  });
  const docId = created.json.document.id;
  await requestJson(handler, 'POST', '/v1/publish', { token: accessToken, body: {} });

  platform.runtime.envOverrides.PRIVATE_CACHE_TTL_SECONDS = 'NaN';
  await requestJson(handler, 'GET', `/v1/private/${encodeURIComponent(docId)}`, { token: accessToken });
  const fallbackEntry = Array.from(platform.state.cache.values()).at(-1);
  assert.ok(fallbackEntry.expiresAt - Date.now() > 115 * 1000);

  platform.state.cache.clear();
  platform.runtime.envOverrides.PRIVATE_CACHE_TTL_SECONDS = String(24 * 60 * 60);
  await requestJson(handler, 'GET', `/v1/private/${encodeURIComponent(docId)}`, { token: accessToken });
  const clampedEntry = Array.from(platform.state.cache.values()).at(-1);
  assert.ok(clampedEntry.expiresAt - Date.now() <= 3600 * 1000 + 5000);
});

test('document create/update validates and persists canonical block metadata', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const invalidCreate = await requestJson(handler, 'POST', '/v1/documents', {
    token: accessToken,
    body: {
      title: 'Invalid blocks',
      blocks: [{ attributes: {} }]
    }
  });
  assert.equal(invalidCreate.res.status, 400);
  assert.equal(invalidCreate.json.error.code, 'BLOCKS_INVALID');

  const created = await requestJson(handler, 'POST', '/v1/documents', {
    token: accessToken,
    body: {
      title: 'Valid blocks',
      content: '<p>seed</p>',
      featuredImageId: 'med_featured_1',
      blocks: [
        {
          name: 'core/paragraph',
          attributes: { content: 'seed' }
        }
      ]
    }
  });
  assert.equal(created.res.status, 201);
  assert.equal(created.json.document.blocksSchemaVersion, 1);
  assert.equal(created.json.revision.blocksSchemaVersion, 1);
  assert.equal(created.json.document.featuredImageId, 'med_featured_1');

  const documentId = created.json.document.id;
  const updated = await requestJson(handler, 'PATCH', `/v1/documents/${encodeURIComponent(documentId)}`, {
    token: accessToken,
    body: {
      featuredImageId: 'med_featured_2',
      blocks: [
        {
          name: 'core/paragraph',
          attributes: { content: 'updated' }
        }
      ]
    }
  });
  assert.equal(updated.res.status, 200);
  assert.equal(updated.json.document.blocksSchemaVersion, 1);
  assert.equal(updated.json.revision.blocksSchemaVersion, 1);
  assert.equal(updated.json.document.featuredImageId, 'med_featured_2');
});

test('document delete route supports soft-trash and permanent delete', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const created = await requestJson(handler, 'POST', '/v1/documents', {
    token: accessToken,
    body: { title: 'Delete target', content: '<p>x</p>' }
  });
  const documentId = created.json.document.id;

  const softDelete = await requestJson(handler, 'DELETE', `/v1/documents/${encodeURIComponent(documentId)}`, {
    token: accessToken
  });
  assert.equal(softDelete.res.status, 200);
  assert.equal(softDelete.json.ok, true);
  assert.equal(softDelete.json.document.status, 'trash');

  const listedAfterSoftDelete = await requestJson(handler, 'GET', '/v1/documents', { token: accessToken });
  const trashed = listedAfterSoftDelete.json.items.find((entry) => entry.id === documentId);
  assert.equal(trashed.status, 'trash');

  const hardDelete = await requestJson(handler, 'DELETE', `/v1/documents/${encodeURIComponent(documentId)}?permanent=1`, {
    token: accessToken
  });
  assert.equal(hardDelete.res.status, 200);
  assert.equal(hardDelete.json.deleted, true);

  const listedAfterHardDelete = await requestJson(handler, 'GET', '/v1/documents', { token: accessToken });
  assert.equal(listedAfterHardDelete.json.items.find((entry) => entry.id === documentId), undefined);
});
