import test from 'node:test';
import assert from 'node:assert/strict';
import { createReleaseStore } from '../../cloudflare/src/release-store.js';
import { D1_SQL } from '../../cloudflare/src/d1-sql.js';
import { createFakeD1, createFakeKV } from './helpers/cloudflareFakes.js';

function parseJsonSafe(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function createKvHelpers(kv) {
  return {
    kvGetJson: async (key) => parseJsonSafe(await kv.get(key)),
    kvPutJson: async (key, value) => kv.put(key, JSON.stringify(value))
  };
}

function createBlobStore() {
  const blobs = new Map();
  return {
    blobs,
    async putBlob(path, bytes, metadata = {}) {
      blobs.set(path, { bytes, metadata });
      return { path, ...metadata };
    }
  };
}

function createRuntime() {
  return {
    now: () => new Date('2026-02-06T00:00:00.000Z'),
    log: () => {}
  };
}

test('release-store returns base store when no d1/kv binding is available', async () => {
  const baseReleaseStore = { sentinel: true };
  const store = createReleaseStore({
    d1: null,
    kv: null,
    runtime: createRuntime(),
    blobStore: createBlobStore(),
    baseReleaseStore,
    kvGetJson: async () => null,
    kvPutJson: async () => {},
    parseJsonSafe,
    D1_SQL
  });

  assert.equal(store, baseReleaseStore);
});

test('release-store KV mode covers manifest/history/pointer unhappy branches', async () => {
  const kv = createFakeKV();
  const blobStore = createBlobStore();
  const runtime = createRuntime();
  const { kvGetJson, kvPutJson } = createKvHelpers(kv);
  const releaseStore = createReleaseStore({
    d1: null,
    kv,
    runtime,
    blobStore,
    baseReleaseStore: {},
    kvGetJson,
    kvPutJson,
    parseJsonSafe,
    D1_SQL
  });

  await releaseStore.writeArtifact('rel_kv', 'home', '<h1>home</h1>');
  const manifest = {
    releaseId: 'rel_kv',
    schemaVersion: 1,
    createdAt: '2026-02-06T00:00:00.000Z',
    publishedBy: 'u_admin',
    sourceRevisionId: null,
    artifacts: [{ route: 'home', path: 'rel_kv/home.html', contentType: 'text/html' }]
  };
  await releaseStore.writeManifest('rel_kv', manifest);
  await assert.rejects(
    () => releaseStore.writeManifest('rel_kv', manifest),
    /immutable/
  );
  assert.equal((await releaseStore.getManifest('rel_kv')).releaseId, 'rel_kv');
  assert.equal((await releaseStore.listReleases()).length, 1);
  await assert.rejects(() => releaseStore.activateRelease('rel_unknown'), /Unknown releaseId/);

  await releaseStore.activateRelease('rel_kv');
  assert.equal(await releaseStore.getActiveRelease(), 'rel_kv');
  const again = await releaseStore.activateRelease('rel_kv');
  assert.equal(again, 'rel_kv');

  const history = await releaseStore.getReleaseHistory();
  assert.ok(history.some((entry) => entry.type === 'artifact_written'));
  assert.ok(history.some((entry) => entry.type === 'manifest_written'));
  assert.equal(history.filter((entry) => entry.type === 'activated').length, 1);
});

test('release-store handles D1 insert errors that are not immutability conflicts', async () => {
  const d1 = createFakeD1();
  d1.__control.failManifestInsert = true;
  const releaseStore = createReleaseStore({
    d1,
    kv: null,
    runtime: createRuntime(),
    blobStore: createBlobStore(),
    baseReleaseStore: {},
    kvGetJson: async () => null,
    kvPutJson: async () => {},
    parseJsonSafe,
    D1_SQL
  });

  await assert.rejects(
    () =>
      releaseStore.writeManifest('rel_fail', {
        releaseId: 'rel_fail',
        schemaVersion: 1,
        createdAt: '2026-02-06T00:00:00.000Z',
        publishedBy: 'u_admin',
        sourceRevisionId: null,
        artifacts: []
      }),
    /manifest insert failed/
  );
});

test('release-store uses in-memory fallback when kv is partially bound', async () => {
  const values = new Map();
  const kvGetOnly = {
    __keys: [],
    async get(key) {
      return values.has(key) ? values.get(key) : null;
    }
  };
  const releaseStoreGetOnly = createReleaseStore({
    d1: null,
    kv: kvGetOnly,
    runtime: createRuntime(),
    blobStore: createBlobStore(),
    baseReleaseStore: {},
    kvGetJson: async () => null,
    kvPutJson: async () => {},
    parseJsonSafe,
    D1_SQL
  });
  await releaseStoreGetOnly.writeManifest('rel_mem', {
    releaseId: 'rel_mem',
    schemaVersion: 1,
    createdAt: '2026-02-06T00:00:00.000Z',
    publishedBy: 'u_admin',
    sourceRevisionId: null,
    artifacts: []
  });
  await assert.rejects(() => releaseStoreGetOnly.activateRelease('rel_mem'), /Unknown releaseId/);
  assert.equal(await releaseStoreGetOnly.getActiveRelease(), null);

  const kvPutOnly = {
    async put(key, value) {
      values.set(key, value);
    }
  };
  const releaseStorePutOnly = createReleaseStore({
    d1: null,
    kv: kvPutOnly,
    runtime: createRuntime(),
    blobStore: createBlobStore(),
    baseReleaseStore: {},
    kvGetJson: async () => null,
    kvPutJson: async () => {},
    parseJsonSafe,
    D1_SQL
  });
  await releaseStorePutOnly.writeManifest('rel_put_only', {
    releaseId: 'rel_put_only',
    schemaVersion: 1,
    createdAt: '2026-02-06T00:00:00.000Z',
    publishedBy: 'u_admin',
    sourceRevisionId: null,
    artifacts: []
  });
  assert.equal(await releaseStorePutOnly.getManifest('rel_put_only'), null);
});
