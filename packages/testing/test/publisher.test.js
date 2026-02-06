import test from 'node:test';
import assert from 'node:assert/strict';
import { createRelease } from '../../publish/src/publisher.js';

function createRuntime() {
  return {
    now: () => new Date('2026-02-06T00:00:00.000Z'),
    uuid: () => 'fixeduuid0001'
  };
}

function createStore() {
  return {
    async listDocuments() {
      return [{ id: 'doc_1', title: 'Hello', content: '<p>world</p>' }];
    }
  };
}

test('createRelease writes artifacts via releaseStore.writeArtifact when available', async () => {
  const runtime = createRuntime();
  const store = createStore();
  const calls = [];
  const releaseStore = {
    async writeArtifact(releaseId, route, bytes, contentType) {
      calls.push({ releaseId, route, bytes, contentType });
      return { path: `${releaseId}/${route}.html`, contentType };
    },
    async getManifest() {
      return null;
    },
    async writeManifest() {}
  };

  const manifest = await createRelease({
    runtime,
    store,
    releaseStore,
    sourceRevisionId: 'rev_1',
    sourceRevisionSet: ['rev_2'],
    publishedBy: 'u_admin'
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].releaseId, 'rel_fixeduuid0001');
  assert.equal(calls[0].route, 'doc_1');
  assert.equal(calls[0].contentType, 'text/html');
  assert.equal(manifest.artifacts[0].path, 'rel_fixeduuid0001/doc_1.html');
  assert.equal(manifest.schemaVersion, 2);
  assert.equal(manifest.sourceRevisionId, 'rev_1');
  assert.deepEqual(manifest.sourceRevisionSet, ['rev_1', 'rev_2']);
  assert.ok(Array.isArray(manifest.artifactHashes));
  assert.equal(manifest.artifactHashes.length, 1);
  assert.equal(typeof manifest.contentHash, 'string');
  assert.ok(manifest.contentHash.length > 0);
  assert.equal(typeof manifest.releaseHash, 'string');
  assert.ok(manifest.releaseHash.length > 0);
});

test('createRelease canonicalizes sourceRevisionId from sourceRevisionSet when id is omitted', async () => {
  const runtime = createRuntime();
  const store = createStore();
  const releaseStore = {
    async writeArtifact(releaseId, route, bytes, contentType) {
      return { path: `${releaseId}/${route}.html`, contentType };
    },
    async getManifest() {
      return null;
    },
    async writeManifest() {}
  };

  const manifest = await createRelease({
    runtime,
    store,
    releaseStore,
    sourceRevisionSet: ['rev_only'],
    publishedBy: 'u_admin'
  });

  assert.equal(manifest.sourceRevisionId, 'rev_only');
  assert.deepEqual(manifest.sourceRevisionSet, ['rev_only']);
});

test('createRelease throws when releaseStore.writeArtifact is missing', async () => {
  const runtime = createRuntime();
  const store = createStore();
  const releaseStore = {
    async getManifest() {
      return null;
    },
    async writeManifest() {}
  };

  await assert.rejects(
    () =>
      createRelease({
        runtime,
        store,
        releaseStore,
        sourceRevisionId: null,
        publishedBy: 'u_admin'
      }),
    /Missing required port method: writeArtifact/
  );
});
