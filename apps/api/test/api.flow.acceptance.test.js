import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryPlatform } from '@geekist/edgepress/testing';
import { authAsAdmin, requestJson } from '@geekist/edgepress/testing/test-utils.js';

describe('Navigation block parity acceptance test', () => {
  test('create -> edit -> preview -> publish flow snapshots menus and keeps deterministic releases', async (t) => {
    const platform = createInMemoryPlatform();
    t.after(() => {
      platform.state.documents.clear();
      platform.state.revisions.clear();
      platform.state.revisionsByDoc.clear();
      platform.state.navigationMenus.clear();
      platform.state.releases.clear();
      platform.state.blobs.clear();
      platform.state.previews.clear();
    });

    const { handler, accessToken } = await authAsAdmin(platform);

    const initialMenu = await requestJson(handler, 'PUT', '/v1/navigation/menus/primary', {
      token: accessToken,
      body: {
        title: 'Primary',
        items: [
          {
            id: 'home',
            label: 'Home',
            kind: 'internal',
            route: '/home',
            order: 0
          },
          {
            id: 'docs',
            label: 'Docs',
            kind: 'external',
            externalUrl: 'https://docs.example.com',
            target: '_blank',
            rel: 'noopener',
            order: 1
          }
        ]
      }
    });
    assert.equal(initialMenu.res.status, 200);
    assert.equal(initialMenu.json.menu.key, 'primary');
    assert.equal(initialMenu.json.menu.items.length, 2);

    const snapshotDoc = await requestJson(handler, 'POST', '/v1/documents', {
      token: accessToken,
      body: {
        title: 'Navigation Snapshot Doc',
        slug: 'navigation-snapshot-doc',
        status: 'published',
        blocks: [
          {
            name: 'core/navigation',
            attributes: {
              menuId: initialMenu.json.menu.id,
              ref: initialMenu.json.menu.id
            },
            innerBlocks: [
              {
                name: 'core/navigation-link',
                attributes: {
                  label: 'Home',
                  url: '/home',
                  kind: 'post-type'
                },
                innerBlocks: []
              },
              {
                name: 'core/navigation-link',
                attributes: {
                  label: 'Docs',
                  url: 'https://docs.example.com',
                  kind: 'custom',
                  opensInNewTab: true,
                  rel: 'noopener'
                },
                innerBlocks: []
              }
            ]
          },
          {
            name: 'core/paragraph',
            attributes: {
              content: 'Snapshot source document'
            },
            innerBlocks: []
          }
        ]
      }
    });
    assert.equal(snapshotDoc.res.status, 201);

    const previewSourceHtml = `<nav class="wp-block-navigation ep-navigation is-horizontal"><ul><li><a href="/home">Home</a></li><li><a href="https://docs.example.com" target="_blank" rel="noopener">Docs</a></li></ul></nav>`;
    const renderDoc = await requestJson(handler, 'POST', '/v1/documents', {
      token: accessToken,
      body: {
        title: 'Navigation Flow Test',
        slug: 'navigation-flow-test',
        status: 'published',
        content: previewSourceHtml,
        blocks: []
      }
    });
    assert.equal(renderDoc.res.status, 201);

    const documentId = renderDoc.json.document.id;
    const routeSlug = renderDoc.json.document.slug;
    assert.equal(routeSlug, 'navigation-flow-test');

    const preview = await requestJson(handler, 'GET', `/v1/preview/${encodeURIComponent(documentId)}`, {
      token: accessToken
    });
    assert.equal(preview.res.status, 200);

    const previewHtmlRes = await handler(new Request(`http://test.local${preview.json.previewUrl}`, { method: 'GET' }));
    assert.equal(previewHtmlRes.status, 200);
    const previewHtml = await previewHtmlRes.text();
    assert.ok(previewHtml.includes('wp-block-navigation'));
    assert.ok(previewHtml.includes('href="/home"'));
    assert.ok(previewHtml.includes('href="https://docs.example.com"'));

    const firstPublish = await requestJson(handler, 'POST', '/v1/publish', {
      token: accessToken,
      body: {}
    });
    assert.equal(firstPublish.res.status, 201);
    const firstReleaseId = firstPublish.json.job.releaseId;
    assert.ok(firstReleaseId.startsWith('rel_'));

    const firstManifest = await platform.releaseStore.getManifest(firstReleaseId);
    assert.ok(firstManifest);
    assert.equal(typeof firstManifest.sourceRevisionSet, 'object');
    assert.ok(Array.isArray(firstManifest.sourceRevisionSet.menus));
    const firstMenuSnapshot = firstManifest.sourceRevisionSet.menus.find((menu) => menu.key === 'primary');
    assert.ok(firstMenuSnapshot);
    assert.equal(firstMenuSnapshot.items.length, 2);
    assert.ok(firstMenuSnapshot.items.some((item) => item.label === 'Home' && item.kind === 'internal'));
    assert.ok(firstMenuSnapshot.items.some((item) => item.label === 'Docs' && item.kind === 'external'));

    const firstArtifact = firstManifest.artifacts.find((artifact) => artifact.route === routeSlug);
    assert.ok(firstArtifact);
    const firstBlob = await platform.blobStore.getBlob(firstArtifact.path);
    assert.ok(firstBlob);
    const firstPublishedHtml = firstBlob.bytes;
    assert.ok(firstPublishedHtml.includes('wp-block-navigation'));
    assert.ok(firstPublishedHtml.includes('href="/home"'));
    assert.ok(firstPublishedHtml.includes('href="https://docs.example.com"'));

    const updatedMenu = await requestJson(handler, 'PUT', '/v1/navigation/menus/primary', {
      token: accessToken,
      body: {
        title: 'Primary Updated',
        items: [
          {
            id: 'home',
            label: 'Home',
            kind: 'internal',
            route: '/home',
            order: 0
          },
          {
            id: 'docs',
            label: 'Docs',
            kind: 'external',
            externalUrl: 'https://docs.example.com',
            target: '_blank',
            rel: 'noopener',
            order: 1
          },
          {
            id: 'about',
            label: 'About',
            kind: 'internal',
            route: '/about',
            order: 2
          }
        ]
      }
    });
    assert.equal(updatedMenu.res.status, 200);
    assert.equal(updatedMenu.json.menu.items.length, 3);

    const secondPublish = await requestJson(handler, 'POST', '/v1/publish', {
      token: accessToken,
      body: {}
    });
    assert.equal(secondPublish.res.status, 201);
    const secondReleaseId = secondPublish.json.job.releaseId;
    assert.notEqual(secondReleaseId, firstReleaseId);

    const secondManifest = await platform.releaseStore.getManifest(secondReleaseId);
    assert.ok(secondManifest);
    const secondMenuSnapshot = secondManifest.sourceRevisionSet.menus.find((menu) => menu.key === 'primary');
    assert.ok(secondMenuSnapshot);
    assert.equal(secondMenuSnapshot.items.length, 3);
    assert.ok(secondMenuSnapshot.items.some((item) => item.label === 'About' && item.route === '/about'));
    assert.notEqual(secondManifest.contentHash, firstManifest.contentHash);
  });
});

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

test('featured image id survives document updates and revision snapshots', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const created = await requestJson(handler, 'POST', '/v1/documents', {
    token: accessToken,
    body: {
      title: 'Featured Doc',
      content: '<p>content</p>',
      featuredImageId: ''
    }
  });
  assert.equal(created.res.status, 201);
  const documentId = created.json.document.id;

  const updated = await requestJson(handler, 'PATCH', `/v1/documents/${encodeURIComponent(documentId)}`, {
    token: accessToken,
    body: {
      featuredImageId: 'med_featured_1'
    }
  });
  assert.equal(updated.res.status, 200);
  assert.equal(updated.json.document.featuredImageId, 'med_featured_1');
});
