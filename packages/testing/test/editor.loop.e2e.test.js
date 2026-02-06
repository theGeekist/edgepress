import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '@wordpress/blocks';
import { createInMemoryPlatform } from '../src/inMemoryPlatform.js';
import { authAsAdmin, requestJson } from '../src/testUtils.js';

test('editor loop covers update, preview, publish, activate, and private delivery', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const created = await requestJson(handler, 'POST', '/v1/documents', {
    token: accessToken,
    body: {
      title: 'Loop Doc',
      content: '<p>v1</p>'
    }
  });
  assert.equal(created.res.status, 201);
  const documentId = created.json.document.id;
  assert.ok(documentId);

  const firstUpdate = await requestJson(handler, 'PATCH', `/v1/documents/${encodeURIComponent(documentId)}`, {
    token: accessToken,
    body: {
      title: 'Loop Doc v2',
      content: '<p>v2</p>'
    }
  });
  assert.equal(firstUpdate.res.status, 200);
  assert.equal(firstUpdate.json.document.title, 'Loop Doc v2');
  assert.ok(firstUpdate.json.revision.sourceRevisionId);

  const revisions = await requestJson(handler, 'GET', `/v1/documents/${encodeURIComponent(documentId)}/revisions`, {
    token: accessToken
  });
  assert.equal(revisions.res.status, 200);
  assert.ok(Array.isArray(revisions.json.items));
  assert.ok(revisions.json.items.length >= 2);

  const preview = await requestJson(handler, 'GET', `/v1/preview/${encodeURIComponent(documentId)}`, {
    token: accessToken
  });
  assert.equal(preview.res.status, 200);
  assert.ok(typeof preview.json.previewUrl === 'string');

  const previewHtmlRes = await handler(new Request(`http://test.local${preview.json.previewUrl}`, { method: 'GET' }));
  assert.equal(previewHtmlRes.status, 200);
  const html = await previewHtmlRes.text();
  assert.ok(typeof html === 'string');
  assert.ok(html.includes('<p>v2</p>'));

  const firstPublish = await requestJson(handler, 'POST', '/v1/publish', {
    token: accessToken,
    body: {}
  });
  assert.equal(firstPublish.res.status, 201);
  assert.equal(firstPublish.json.job.status, 'completed');
  const firstReleaseId = firstPublish.json.job.releaseId;
  assert.ok(firstReleaseId);

  const secondUpdate = await requestJson(handler, 'PATCH', `/v1/documents/${encodeURIComponent(documentId)}`, {
    token: accessToken,
    body: {
      title: 'Loop Doc v3',
      content: '<p>v3</p>'
    }
  });
  assert.equal(secondUpdate.res.status, 200);
  assert.equal(secondUpdate.json.document.title, 'Loop Doc v3');

  const secondPublish = await requestJson(handler, 'POST', '/v1/publish', {
    token: accessToken,
    body: {}
  });
  assert.equal(secondPublish.res.status, 201);
  assert.equal(secondPublish.json.job.status, 'completed');
  const secondReleaseId = secondPublish.json.job.releaseId;
  assert.ok(secondReleaseId);
  assert.notEqual(secondReleaseId, firstReleaseId);

  const activated = await requestJson(handler, 'POST', `/v1/releases/${encodeURIComponent(secondReleaseId)}/activate`, {
    token: accessToken,
    body: {}
  });
  assert.equal(activated.res.status, 200);
  assert.equal(activated.json.activeRelease, secondReleaseId);

  const releases = await requestJson(handler, 'GET', '/v1/releases', {
    token: accessToken
  });
  assert.equal(releases.res.status, 200);
  assert.equal(releases.json.activeRelease, secondReleaseId);

  const privateRead = await requestJson(handler, 'GET', `/v1/private/${encodeURIComponent(documentId)}`, {
    token: accessToken
  });
  assert.equal(privateRead.res.status, 200);
  assert.equal(privateRead.json.releaseId, secondReleaseId);
  assert.equal(typeof privateRead.json.html, 'string');
  assert.ok(privateRead.json.html.includes('<p>v3</p>'));
});

test('block-json round-trip preserves canonical source through revisions and publish', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const v1Blocks = parse('<!-- wp:paragraph --><p>v1 block</p><!-- /wp:paragraph -->');
  const created = await requestJson(handler, 'POST', '/v1/documents', {
    token: accessToken,
    body: {
      title: 'Block Roundtrip',
      content: '<p>v1 block</p>',
      blocks: v1Blocks
    }
  });
  assert.equal(created.res.status, 201);
  const documentId = created.json.document.id;

  const v2Blocks = parse('<!-- wp:paragraph --><p>v2 block</p><!-- /wp:paragraph -->');
  const updated = await requestJson(handler, 'PATCH', `/v1/documents/${encodeURIComponent(documentId)}`, {
    token: accessToken,
    body: {
      title: 'Block Roundtrip v2',
      content: '<p>v2 block</p>',
      blocks: v2Blocks
    }
  });
  assert.equal(updated.res.status, 200);
  assert.deepEqual(updated.json.document.blocks, v2Blocks);

  const revisions = await requestJson(handler, 'GET', `/v1/documents/${encodeURIComponent(documentId)}/revisions`, {
    token: accessToken
  });
  assert.equal(revisions.res.status, 200);
  const latestRevision = revisions.json.items.at(-1);
  assert.deepEqual(latestRevision.blocks, v2Blocks);

  const publish = await requestJson(handler, 'POST', '/v1/publish', {
    token: accessToken,
    body: {}
  });
  assert.equal(publish.res.status, 201);
  const releaseId = publish.json.job.releaseId;

  const manifest = await platform.releaseStore.getManifest(releaseId);
  assert.ok(Array.isArray(manifest.blockHashes));
  assert.equal(manifest.blockHashes.length, 1);

  const privateRead = await requestJson(handler, 'GET', `/v1/private/${encodeURIComponent(documentId)}`, {
    token: accessToken
  });
  assert.equal(privateRead.res.status, 200);
  assert.ok(privateRead.json.html.includes('<p>v2 block</p>'));
});
