import test from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryPlatform } from '../src/inMemoryPlatform.js';
import { authAsAdmin, requestJson } from '../src/testUtils.js';

async function seedDoc(handler, token) {
  const created = await requestJson(handler, 'POST', '/v1/documents', {
    token,
    body: { title: 'Post', content: '<p>Body</p>' }
  });
  return created.json.document.id;
}

test('release manifest is immutable and active release pointer is atomic', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);
  await seedDoc(handler, accessToken);

  const first = await requestJson(handler, 'POST', '/v1/publish', { token: accessToken, body: {} });
  assert.equal(first.res.status, 201);

  const releaseId = first.json.job.releaseId;
  const manifest = await platform.releaseStore.getManifest(releaseId);
  assert.ok(manifest);

  await assert.rejects(
    () => platform.releaseStore.writeManifest(releaseId, manifest),
    /immutable/
  );

  const before = await platform.releaseStore.getActiveRelease();
  await platform.releaseStore.activateRelease(releaseId);
  const after = await platform.releaseStore.getActiveRelease();
  assert.equal(after, releaseId);
  assert.ok(before === null || before === releaseId);
});

test('release history is append-only for manifest writes and pointer switches', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  await seedDoc(handler, accessToken);
  const first = await requestJson(handler, 'POST', '/v1/publish', { token: accessToken, body: {} });
  assert.equal(first.res.status, 201);
  const firstReleaseId = first.json.job.releaseId;

  await seedDoc(handler, accessToken);
  const second = await requestJson(handler, 'POST', '/v1/publish', { token: accessToken, body: {} });
  assert.equal(second.res.status, 201);
  const secondReleaseId = second.json.job.releaseId;

  // Only first publish auto-activates.
  assert.equal(await platform.releaseStore.getActiveRelease(), firstReleaseId);

  // Activating the currently active release is idempotent and should not append history.
  const beforeNoop = (await platform.releaseStore.getReleaseHistory()).length;
  await platform.releaseStore.activateRelease(firstReleaseId);
  const afterNoop = (await platform.releaseStore.getReleaseHistory()).length;
  assert.equal(afterNoop, beforeNoop);

  await platform.releaseStore.activateRelease(secondReleaseId);
  assert.equal(await platform.releaseStore.getActiveRelease(), secondReleaseId);

  const history = await platform.releaseStore.getReleaseHistory();
  const activationEvents = history.filter((entry) => entry.type === 'activated');
  const manifestEvents = history.filter((entry) => entry.type === 'manifest_written');

  assert.equal(manifestEvents.length, 2);
  assert.equal(activationEvents.length, 2);
  assert.equal(activationEvents[0].releaseId, firstReleaseId);
  assert.equal(activationEvents[0].previousReleaseId, null);
  assert.equal(activationEvents[1].releaseId, secondReleaseId);
  assert.equal(activationEvents[1].previousReleaseId, firstReleaseId);
});

test('publish writes release artifacts through releaseStore and persists blob refs', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);
  const docId = await seedDoc(handler, accessToken);

  const publish = await requestJson(handler, 'POST', '/v1/publish', { token: accessToken, body: {} });
  assert.equal(publish.res.status, 201);
  const releaseId = publish.json.job.releaseId;

  const history = await platform.releaseStore.getReleaseHistory();
  const artifactEvents = history.filter((entry) => entry.type === 'artifact_written');
  assert.ok(artifactEvents.length >= 1);
  assert.ok(artifactEvents.some((entry) => entry.releaseId === releaseId && entry.route === docId));

  const manifest = await platform.releaseStore.getManifest(releaseId);
  const artifact = manifest.artifacts.find((entry) => entry.route === docId);
  assert.ok(artifact);

  const blob = await platform.blobStore.getBlob(artifact.path);
  assert.ok(blob);
  assert.equal(blob.metadata.contentType, 'text/html');
});

test('publish manifest captures provenance and release hash fields', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);
  await seedDoc(handler, accessToken);

  const publish = await requestJson(handler, 'POST', '/v1/publish', {
    token: accessToken,
    body: {
      sourceRevisionId: 'rev_manual_a',
      sourceRevisionSet: ['rev_manual_b']
    }
  });
  assert.equal(publish.res.status, 201);

  const releaseId = publish.json.job.releaseId;
  const manifest = await platform.releaseStore.getManifest(releaseId);
  assert.equal(manifest.schemaVersion, 2);
  assert.equal(manifest.sourceRevisionId, 'rev_manual_a');
  assert.deepEqual(manifest.sourceRevisionSet, ['rev_manual_a', 'rev_manual_b']);
  assert.ok(Array.isArray(manifest.artifactHashes));
  assert.equal(manifest.artifactHashes.length, manifest.artifacts.length);
  assert.equal(typeof manifest.contentHash, 'string');
  assert.ok(manifest.contentHash.length > 0);
  assert.equal(typeof manifest.releaseHash, 'string');
  assert.ok(manifest.releaseHash.length > 0);
});

test('preview returns tokenized URL and serves temporary release-like HTML', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);
  const docId = await seedDoc(handler, accessToken);

  const preview = await requestJson(handler, 'GET', `/v1/preview/${docId}`, { token: accessToken });
  assert.equal(preview.res.status, 200);
  assert.ok(preview.json.previewUrl.startsWith('/preview/'));
  assert.ok(preview.json.releaseLikeRef.startsWith('preview_'));

  const view = await requestJson(handler, 'GET', preview.json.previewUrl, {});
  assert.equal(view.res.status, 200);
});

test('private route reads static artifact and uses auth-scoped cache', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);
  const docId = await seedDoc(handler, accessToken);
  await requestJson(handler, 'POST', '/v1/publish', { token: accessToken, body: {} });

  const first = await requestJson(handler, 'GET', `/v1/private/${encodeURIComponent(docId)}`, { token: accessToken });
  assert.equal(first.res.status, 200);
  assert.equal(first.json.cache, 'miss');

  const second = await requestJson(handler, 'GET', `/v1/private/${encodeURIComponent(docId)}`, { token: accessToken });
  assert.equal(second.res.status, 200);
  assert.equal(second.json.cache, 'hit');
});
