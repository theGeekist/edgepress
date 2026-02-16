import test from 'node:test';
import assert from 'node:assert/strict';
import { createReleaseStore } from '../../cloudflare/src/release-store.js';
import { D1_SQL } from '../../cloudflare/src/d1-sql.js';
import { createFakeD1 } from '@geekist/edgepress/testing/cf-fakes.js';
import { parseJsonSafe } from '@geekist/edgepress/testing/coverage-fakes.js';

test('release-store uses non-atomic D1 fallback when batch is unavailable', async () => {
  const d1 = createFakeD1();
  delete d1.batch;
  const logs = [];

  const releaseStore = createReleaseStore({
    d1,
    kv: null,
    runtime: {
      now: () => new Date('2026-02-06T00:00:00.000Z'),
      log: (...args) => logs.push(args)
    },
    blobStore: { async putBlob() {} },
    baseReleaseStore: {},
    kvGetJson: async () => null,
    kvPutJson: async () => {},
    parseJsonSafe,
    D1_SQL
  });

  await releaseStore.writeManifest('rel_batchless', {
    releaseId: 'rel_batchless',
    schemaVersion: 1,
    createdAt: '2026-02-06T00:00:00.000Z',
    publishedBy: 'u_admin',
    sourceRevisionId: null,
    artifacts: []
  });

  await releaseStore.activateRelease('rel_batchless');

  const warnEvents = logs.filter((entry) => entry[1] === 'd1_non_atomic_fallback');
  assert.ok(warnEvents.length >= 2);
});

test('release-store KV list pagination and activateIfNone no-op branch', async () => {
  const pagesByCursor = {
    '': { keys: [{ name: 'release:manifest:rel_a' }], list_complete: false, cursor: 'next' },
    next: { keys: [{ name: 'release:manifest:rel_b' }], list_complete: true }
  };
  const kvValues = new Map([
    ['release:manifest:rel_a', JSON.stringify({ releaseId: 'rel_a', createdAt: '2026-02-06T00:00:00.000Z' })],
    ['release:manifest:rel_b', JSON.stringify({ releaseId: 'rel_b', createdAt: '2026-02-07T00:00:00.000Z' })],
    ['release:active', 'rel_a']
  ]);

  const kv = {
    async get(key) {
      return kvValues.get(key) || null;
    },
    async put(key, value) {
      kvValues.set(key, value);
    },
    async list(options = {}) {
      assert.equal(options.prefix, 'release:manifest:');
      const cursor = options.cursor || '';
      return pagesByCursor[cursor] || { keys: [], list_complete: true };
    }
  };

  const releaseStore = createReleaseStore({
    d1: null,
    kv,
    runtime: { now: () => new Date('2026-02-06T00:00:00.000Z'), log: () => {} },
    blobStore: { async putBlob() {} },
    baseReleaseStore: {},
    kvGetJson: async (key) => parseJsonSafe(await kv.get(key)),
    kvPutJson: async (key, value) => kv.put(key, JSON.stringify(value)),
    parseJsonSafe,
    D1_SQL
  });

  const releases = await releaseStore.listReleases();
  assert.equal(releases.length, 2);

  // Already active release should return null for activateIfNone.
  const activated = await releaseStore.activateIfNone('rel_a');
  assert.equal(activated, null);
});

test('release-store KV __keys fallback and in-memory active release branches', async () => {
  const kvValues = new Map([
    ['release:manifest:rel_c', JSON.stringify({ releaseId: 'rel_c', createdAt: '2026-02-08T00:00:00.000Z' })]
  ]);
  const kv = {
    __keys: ['release:manifest:rel_c', 'unrelated:key'],
    async get(key) {
      return kvValues.get(key) || null;
    },
    async put(key, value) {
      kvValues.set(key, value);
    }
  };

  const releaseStore = createReleaseStore({
    d1: null,
    kv,
    runtime: { now: () => new Date('2026-02-06T00:00:00.000Z'), log: () => {} },
    blobStore: { async putBlob() {} },
    baseReleaseStore: {},
    kvGetJson: async (key) => parseJsonSafe(await kv.get(key)),
    kvPutJson: async (key, value) => kv.put(key, JSON.stringify(value)),
    parseJsonSafe,
    D1_SQL
  });

  const releases = await releaseStore.listReleases();
  assert.equal(releases.length, 1);
  assert.equal(releases[0].releaseId, 'rel_c');
  assert.equal(await releaseStore.getActiveRelease(), null);
});

test('release-store D1 activateIfNone covers changed and unchanged branches', async () => {
  const calls = [];
  let active = null;
  const manifests = new Set(['rel_d1']);

  const d1 = {
    async exec() {},
    prepare(sql) {
      const makeStmt = (args = []) => ({
        async first() {
          if (sql === D1_SQL.selectManifestId) {
            return manifests.has(args[0]) ? { release_id: args[0] } : null;
          }
          if (sql === D1_SQL.selectActiveRelease) {
            return active ? { active_release_id: active } : null;
          }
          return null;
        },
        async run() {
          if (sql === D1_SQL.upsertActiveReleaseIfNone) {
            if (active) return { meta: { changes: 0 } };
            active = args[0];
            return { meta: { changes: 1 } };
          }
          if (sql === D1_SQL.insertHistory) {
            calls.push({ sql, args });
            return { success: true };
          }
          return { success: true };
        },
        async all() {
          return { results: [] };
        }
      });
      return {
        ...makeStmt([]),
        bind(...args) {
          return makeStmt(args);
        }
      };
    }
  };

  const releaseStore = createReleaseStore({
    d1,
    kv: null,
    runtime: { now: () => new Date('2026-02-06T00:00:00.000Z'), log: () => {} },
    blobStore: { async putBlob() {} },
    baseReleaseStore: {},
    kvGetJson: async () => null,
    kvPutJson: async () => {},
    parseJsonSafe,
    D1_SQL
  });

  const first = await releaseStore.activateIfNone('rel_d1');
  assert.equal(first, 'rel_d1');
  assert.equal(calls.length, 1);

  const second = await releaseStore.activateIfNone('rel_d1');
  assert.equal(second, null);
  assert.equal(calls.length, 1);
});
