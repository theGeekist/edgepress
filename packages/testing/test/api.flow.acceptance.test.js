import test from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryPlatform } from '../src/store.js';
import { authAsAdmin, requestJson } from '../src/testUtils.js';

test('media blocks and featured images survive revision->preview->publish->private flow', async () => {
  const platform = createInMemoryPlatform();
  platform.blobStore.signedReadUrl = async (path, ttlSeconds = 300) => `/blob/${path}?ttl=${ttlSeconds}`;
  const { handler, accessToken } = await authAsAdmin(platform);

  // Create a media asset to reference in blocks
  const mediaInit = await requestJson(handler, 'POST', '/v1/media/init', {
    token: accessToken,
    body: {}
  });
  assert.equal(mediaInit.res.status, 201);
  const mediaId = mediaInit.json.mediaId;

  // Upload media bytes
  const uploadReq = new Request(`http://test.local/uploads/${mediaId}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'x-upload-token': mediaInit.json.uploadToken,
      'content-type': 'image/jpeg'
    },
    body: new Uint8Array([1, 2, 3, 4])
  });
  const uploadRes = await handler(uploadReq);
  assert.equal(uploadRes.status, 200);

  // Finalize media with metadata
  const mediaFinalize = await requestJson(handler, 'POST', `/v1/media/${mediaId}/finalize`, {
    token: accessToken,
    body: {
      uploadToken: mediaInit.json.uploadToken,
      filename: 'hero.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      width: 1200,
      height: 600,
      alt: 'Hero alt text',
      caption: 'Hero caption'
    }
  });
  assert.equal(mediaFinalize.res.status, 200);

  // Create document with media block and featured image
  const docCreated = await requestJson(handler, 'POST', '/v1/documents', {
    token: accessToken,
    body: {
      title: 'Media Flow Test',
      slug: 'media-flow-test',
      content: '<p>Legacy content</p>',
      featuredImageId: mediaId,
      blocks: [
        {
          name: 'core/image',
          attributes: {
            mediaId,
            url: 'https://example.com/placeholder.jpg', // Will be replaced during publish
            alt: 'Block alt text'
          },
          innerBlocks: []
        },
        {
          name: 'core/paragraph',
          attributes: { content: 'Text after image' },
          innerBlocks: []
        }
      ]
    }
  });
  assert.equal(docCreated.res.status, 201);
  const documentId = docCreated.json.document.id;
  assert.equal(docCreated.json.document.featuredImageId, mediaId);

  // PREVIEW: Verify preview resolves media blocks and featured image
  const preview = await requestJson(handler, 'GET', `/v1/preview/${encodeURIComponent(documentId)}`, {
    token: accessToken
  });
  assert.equal(preview.res.status, 200);

  const previewHtmlRes = await handler(new Request(`http://test.local${preview.json.previewUrl}`, { method: 'GET' }));
  assert.equal(previewHtmlRes.status, 200);
  const previewHtml = await previewHtmlRes.text();

  // Preview should contain the image URL (resolved from mediaId)
  assert.ok(previewHtml.includes('hero.jpg') || previewHtml.includes(`/blob/media/${mediaId}`), 'Preview should resolve image URL');

  // PUBLISH: Verify publish includes media in artifacts
  const publish = await requestJson(handler, 'POST', '/v1/publish', {
    token: accessToken,
    body: {}
  });
  assert.equal(publish.res.status, 201);
  const releaseId = publish.json.job.releaseId;

  // Verify manifest includes the document
  const manifest = await platform.releaseStore.getManifest(releaseId);
  assert.ok(manifest);
  assert.ok(manifest.artifacts.length >= 1);
  const routeSlug = String(docCreated.json.document.slug || '').trim();
  assert.ok(routeSlug.length > 0, 'Document slug should be non-empty');

  // Verify artifact contains the HTML with resolved media
  const artifact = manifest.artifacts.find((a) => a.route === routeSlug);
  assert.ok(artifact);

  const blob = await platform.blobStore.getBlob(artifact.path);
  assert.ok(blob);
  const publishedHtml = blob.bytes;
  assert.ok(publishedHtml.includes('hero.jpg') || publishedHtml.includes(`/blob/media/${mediaId}`), 'Published HTML should resolve image URL');
  assert.ok(publishedHtml.includes('Hero alt text') || publishedHtml.includes('Block alt text'), 'Published HTML should include alt text');

  // PRIVATE READ: Verify private read returns published content
  const privateRead = await requestJson(handler, 'GET', `/v1/private/${encodeURIComponent(documentId)}`, {
    token: accessToken
  });
  assert.equal(privateRead.res.status, 200);
  assert.equal(privateRead.json.releaseId, releaseId);
  assert.ok(privateRead.json.html.includes('hero.jpg') || privateRead.json.html.includes(`/blob/media/${mediaId}`), 'Private read should return published content with resolved media');

  // Verify featured image is included in published output
  assert.ok(publishedHtml.includes('<figure><img'), 'Published HTML should include featured image markup');
});

test('taxonomies and terms survive revision->preview->publish->private flow', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  // Create a taxonomy
  const taxonomy = await requestJson(handler, 'PUT', '/v1/taxonomies/topic', {
    token: accessToken,
    body: {
      label: 'Topics',
      hierarchical: true,
      objectTypes: ['post', 'page']
    }
  });
  assert.equal(taxonomy.res.status, 200);

  // Create some terms
  const term1 = await requestJson(handler, 'PUT', '/v1/terms/term_topic_ai', {
    token: accessToken,
    body: {
      taxonomySlug: 'topic',
      name: 'AI'
    }
  });
  assert.equal(term1.res.status, 200);

  const term2 = await requestJson(handler, 'POST', '/v1/terms', {
    token: accessToken,
    body: {
      taxonomySlug: 'topic',
      name: 'ML'
    }
  });
  assert.equal(term2.res.status, 200);

  // Create document with termIds
  const docCreated = await requestJson(handler, 'POST', '/v1/documents', {
    token: accessToken,
    body: {
      title: 'Post with Terms',
      content: '<p>Content about AI and ML</p>',
      type: 'post',
      termIds: ['term_topic_ai', term2.json.term.id]
    }
  });
  assert.equal(docCreated.res.status, 201);
  const documentId = docCreated.json.document.id;
  assert.deepEqual(docCreated.json.document.termIds, ['term_topic_ai', term2.json.term.id]);
  assert.equal(docCreated.json.revision.termIds[0], 'term_topic_ai');

  // Update document to change terms
  const docUpdated = await requestJson(handler, 'PATCH', `/v1/documents/${encodeURIComponent(documentId)}`, {
    token: accessToken,
    body: {
      termIds: [term2.json.term.id]
    }
  });
  assert.equal(docUpdated.res.status, 200);
  assert.deepEqual(docUpdated.json.document.termIds, [term2.json.term.id]);

  // Publish the document
  const publish = await requestJson(handler, 'POST', '/v1/publish', {
    token: accessToken,
    body: {}
  });
  assert.equal(publish.res.status, 201);
  const releaseId = publish.json.job.releaseId;

  // Verify private read still works (terms don't affect published HTML but should be preserved)
  const privateRead = await requestJson(handler, 'GET', `/v1/private/${encodeURIComponent(documentId)}`, {
    token: accessToken
  });
  assert.equal(privateRead.res.status, 200);
  assert.equal(privateRead.json.releaseId, releaseId);

  // Verify revisions preserve terms (revisions are the audit trail for term changes)
  const revisions = await requestJson(handler, 'GET', `/v1/documents/${encodeURIComponent(documentId)}/revisions`, {
    token: accessToken
  });
  assert.equal(revisions.res.status, 200);
  assert.ok(revisions.json.items.length >= 2);
  const latestRevision = [...revisions.json.items].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )[revisions.json.items.length - 1];
  assert.deepEqual(latestRevision.termIds, [term2.json.term.id]);

  // Verify we can list documents and find our document with its terms
  const allPosts = await requestJson(handler, 'GET', '/v1/documents?type=post', {
    token: accessToken
  });
  assert.equal(allPosts.res.status, 200);
  const ourPost = allPosts.json.items.find((d) => d.id === documentId);
  assert.ok(ourPost);
  assert.deepEqual(ourPost.termIds, [term2.json.term.id]);
});
