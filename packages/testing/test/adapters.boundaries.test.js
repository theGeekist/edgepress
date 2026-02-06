import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { createCloudflareReferencePlatform, D1_SQL } from '../../adapters-cloudflare/src/index.js';
import { createApiHandler } from '../../../apps/api-edge/src/app.js';
import { requestJson } from '../src/testUtils.js';

function createFakeKV() {
  const map = new Map();
  return {
    __keys: [],
    async get(key) {
      return map.has(key) ? map.get(key) : null;
    },
    async put(key, value) {
      map.set(key, value);
      if (!this.__keys.includes(key)) this.__keys.push(key);
    },
    async delete(key) {
      map.delete(key);
      this.__keys = this.__keys.filter((entry) => entry !== key);
    }
  };
}

function createFakeR2() {
  const map = new Map();
  return {
    async put(key, value, options = {}) {
      map.set(key, { value, options });
    },
    async get(key) {
      const stored = map.get(key);
      if (!stored) return null;
      return {
        async text() {
          return String(stored.value);
        },
        httpMetadata: {
          contentType: stored.options?.httpMetadata?.contentType
        }
      };
    }
  };
}

function createFakeD1() {
  const manifests = new Map();
  const state = { activeReleaseId: null };
  const history = [];
  const control = {
    failHistoryInsert: false,
    execCalls: [],
    batchCalls: 0
  };

  function restoreSnapshot(snapshot) {
    manifests.clear();
    for (const [key, value] of snapshot.manifests.entries()) {
      manifests.set(key, value);
    }
    state.activeReleaseId = snapshot.activeReleaseId;
    history.length = 0;
    history.push(...snapshot.history);
  }

  function takeSnapshot() {
    return {
      manifests: new Map(manifests),
      activeReleaseId: state.activeReleaseId,
      history: history.map((entry) => ({ ...entry }))
    };
  }

  const is = (sql, expected) => sql.trim() === expected.trim();
  function createBound(sql, args) {
    return {
      async run() {
        if (is(sql, D1_SQL.insertManifest)) {
          const [releaseId, manifestJson, manifestCreatedAt, createdAt] = args;
          if (manifests.has(releaseId)) {
            const error = new Error('UNIQUE constraint failed: release_manifests.release_id');
            error.code = 'SQLITE_CONSTRAINT';
            throw error;
          }
          manifests.set(releaseId, { releaseId, manifestJson, manifestCreatedAt, createdAt });
          return { success: true };
        }
        if (is(sql, D1_SQL.insertHistory)) {
          if (control.failHistoryInsert) {
            throw new Error('history insert failed');
          }
          const [eventJson, createdAt] = args;
          history.push({ id: history.length + 1, eventJson, createdAt });
          return { success: true };
        }
        if (is(sql, D1_SQL.upsertActiveRelease)) {
          const [activeReleaseId] = args;
          state.activeReleaseId = activeReleaseId;
          return { success: true };
        }
        return { success: true };
      },
      async first() {
        if (is(sql, D1_SQL.selectManifestId)) {
          const [releaseId] = args;
          const row = manifests.get(releaseId);
          return row ? { release_id: row.releaseId } : null;
        }
        if (is(sql, D1_SQL.selectManifestById)) {
          const [releaseId] = args;
          const row = manifests.get(releaseId);
          return row ? { manifest_json: row.manifestJson } : null;
        }
        if (is(sql, D1_SQL.selectActiveRelease)) {
          return state.activeReleaseId ? { active_release_id: state.activeReleaseId } : null;
        }
        return null;
      },
      async all() {
        if (is(sql, D1_SQL.selectAllManifests)) {
          return {
            results: Array.from(manifests.values())
              .sort((a, b) => {
                const aManifest = String(a.manifestCreatedAt);
                const bManifest = String(b.manifestCreatedAt);
                if (aManifest !== bManifest) return aManifest.localeCompare(bManifest);
                const aCreated = String(a.createdAt);
                const bCreated = String(b.createdAt);
                if (aCreated !== bCreated) return aCreated.localeCompare(bCreated);
                return String(a.releaseId).localeCompare(String(b.releaseId));
              })
              .map((entry) => ({ manifest_json: entry.manifestJson }))
          };
        }
        if (is(sql, D1_SQL.selectHistory)) {
          return {
            results: history
              .slice()
              .sort((a, b) => a.id - b.id)
              .map((entry) => ({ event_json: entry.eventJson }))
          };
        }
        return { results: [] };
      }
    };
  }
  return {
    __control: control,
    async exec(sql) {
      control.execCalls.push(sql);
    },
    prepare(sql) {
      return {
        ...createBound(sql, []),
        bind(...args) {
          return createBound(sql, args);
        }
      };
    },
    async batch(statements) {
      control.batchCalls += 1;
      const snapshot = takeSnapshot();
      try {
        for (const statement of statements) {
          await statement.run();
        }
      } catch (error) {
        restoreSnapshot(snapshot);
        throw error;
      }
      return [];
    }
  };
}

test('boundary check blocks Cloudflare terms outside adapters-cloudflare', async () => {
  const out = execSync('node scripts/check-boundaries.js', { encoding: 'utf8', cwd: process.cwd() });
  assert.match(out, /Boundary check passed/);
});

test('cloudflare reference adapter conforms to core auth + document flow', async () => {
  const platform = createCloudflareReferencePlatform({ TOKEN_KEY: 'cf-key' });
  const handler = createApiHandler(platform);

  const auth = await requestJson(handler, 'POST', '/v1/auth/token', {
    body: { username: 'admin', password: 'admin' }
  });
  assert.equal(auth.res.status, 200);
  const token = auth.json.accessToken;

  const created = await requestJson(handler, 'POST', '/v1/documents', {
    token,
    body: { title: 'CF', content: '<p>adapter</p>' }
  });
  assert.equal(created.res.status, 201);
});

test('cloudflare reference runtime requestContext and base64 helpers are wired', async () => {
  const platform = createCloudflareReferencePlatform({ TOKEN_KEY: 'cf-key' });

  const withHeaders = platform.runtime.requestContext(new Request('http://x.local/path', {
    headers: {
      'cf-ray': 'ray_test',
      'cf-connecting-ip': 'ip_test',
      'x-trace-id': 'trace_test',
      'user-agent': 'ua_test'
    }
  }));
  assert.equal(withHeaders.traceId, 'trace_test');
  assert.equal(withHeaders.ipHash, 'ip_test');
  assert.equal(withHeaders.userAgentHash, 'ua_test');
  assert.equal(withHeaders.requestId, 'ray_test');

  const withoutHeaders = platform.runtime.requestContext(new Request('http://x.local/path'));
  assert.ok(withoutHeaders.traceId.startsWith('ray_'));
  assert.equal(withoutHeaders.ipHash, 'cf_ip_unknown');
  assert.equal(withoutHeaders.userAgentHash, 'cf_ua_unknown');

  const encoded = platform.runtime.base64urlEncode('hello');
  const decoded = platform.runtime.base64urlDecode(encoded);
  assert.equal(decoded, 'hello');
});

test('cloudflare reference releaseStore explicitly supports writeArtifact', async () => {
  const platform = createCloudflareReferencePlatform({ TOKEN_KEY: 'cf-key' });

  const ref = await platform.releaseStore.writeArtifact(
    'rel_cf_demo',
    'route_demo',
    '<html>demo</html>',
    'text/html'
  );
  assert.equal(ref.path, 'rel_cf_demo/route_demo.html');
  assert.equal(ref.contentType, 'text/html');

  const blob = await platform.blobStore.getBlob(ref.path);
  assert.ok(blob);
  assert.equal(blob.bytes, '<html>demo</html>');
  assert.equal(blob.metadata.contentType, 'text/html');
});

test('cloudflare reference releaseStore manages manifest pointer and history', async () => {
  const platform = createCloudflareReferencePlatform({ TOKEN_KEY: 'cf-key' });
  const releaseA = {
    releaseId: 'rel_a',
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    publishedBy: 'u_admin',
    sourceRevisionId: null,
    artifacts: []
  };
  const releaseB = {
    releaseId: 'rel_b',
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    publishedBy: 'u_admin',
    sourceRevisionId: null,
    artifacts: []
  };

  await platform.releaseStore.writeManifest(releaseA.releaseId, releaseA);
  await platform.releaseStore.writeManifest(releaseB.releaseId, releaseB);
  await assert.rejects(
    () => platform.releaseStore.writeManifest(releaseA.releaseId, releaseA),
    /immutable/
  );

  const listed = await platform.releaseStore.listReleases();
  assert.equal(listed.length, 2);
  assert.equal((await platform.releaseStore.getManifest('rel_a')).releaseId, 'rel_a');
  assert.equal(await platform.releaseStore.getManifest('rel_missing'), null);

  await assert.rejects(() => platform.releaseStore.activateRelease('rel_missing'), /Unknown releaseId/);
  assert.equal(await platform.releaseStore.activateRelease('rel_a'), 'rel_a');
  assert.equal(await platform.releaseStore.activateRelease('rel_a'), 'rel_a');
  assert.equal(await platform.releaseStore.activateRelease('rel_b'), 'rel_b');
  assert.equal(await platform.releaseStore.getActiveRelease(), 'rel_b');

  const history = await platform.releaseStore.getReleaseHistory();
  const manifestEvents = history.filter((entry) => entry.type === 'manifest_written');
  const activationEvents = history.filter((entry) => entry.type === 'activated');
  assert.equal(manifestEvents.length, 2);
  assert.equal(activationEvents.length, 2);
  assert.equal(activationEvents[0].previousReleaseId, null);
  assert.equal(activationEvents[1].previousReleaseId, 'rel_a');
});

test('cloudflare reference adapter uses KV/R2 bindings for release and cache flows', async () => {
  const kv = createFakeKV();
  const r2 = createFakeR2();
  const platform = createCloudflareReferencePlatform({
    TOKEN_KEY: 'cf-key',
    KV: kv,
    R2_BUCKET: r2
  });

  await platform.cacheStore.set('demo', 'value', 60);
  assert.equal(await platform.cacheStore.get('demo'), 'value');
  await platform.cacheStore.del('demo');
  assert.equal(await platform.cacheStore.get('demo'), null);

  const release = {
    releaseId: 'rel_kv',
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    publishedBy: 'u_admin',
    sourceRevisionId: null,
    artifacts: []
  };
  await platform.releaseStore.writeManifest(release.releaseId, release);
  const ref = await platform.releaseStore.writeArtifact(
    release.releaseId,
    'route_kv',
    '<html>from-r2</html>',
    'text/html'
  );
  await platform.releaseStore.activateRelease(release.releaseId);

  const fetchedManifest = await platform.releaseStore.getManifest(release.releaseId);
  assert.equal(fetchedManifest.releaseId, release.releaseId);
  assert.equal(await platform.releaseStore.getActiveRelease(), release.releaseId);

  const blob = await platform.blobStore.getBlob(ref.path);
  assert.ok(blob);
  assert.equal(blob.bytes, '<html>from-r2</html>');
  assert.equal(blob.metadata.contentType, 'text/html');

  const history = await platform.releaseStore.getReleaseHistory();
  assert.ok(history.some((entry) => entry.type === 'manifest_written'));
  assert.ok(history.some((entry) => entry.type === 'artifact_written'));
  assert.ok(history.some((entry) => entry.type === 'activated'));
});

test('cloudflare reference adapter falls back to local stores without KV/R2 bindings', async () => {
  const platform = createCloudflareReferencePlatform({ TOKEN_KEY: 'cf-key' });

  await platform.cacheStore.set('fallback', 'ok', 60);
  assert.equal(await platform.cacheStore.get('fallback'), 'ok');
  await platform.cacheStore.del('fallback');
  assert.equal(await platform.cacheStore.get('fallback'), null);

  const release = {
    releaseId: 'rel_local',
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    publishedBy: 'u_admin',
    sourceRevisionId: null,
    artifacts: []
  };
  await platform.releaseStore.writeManifest(release.releaseId, release);
  await platform.releaseStore.activateRelease(release.releaseId);
  assert.equal(await platform.releaseStore.getActiveRelease(), release.releaseId);
  assert.equal((await platform.releaseStore.getManifest(release.releaseId)).releaseId, release.releaseId);

  const artifact = await platform.releaseStore.writeArtifact(
    release.releaseId,
    'route_local',
    '<html>local</html>',
    'text/html'
  );
  const blob = await platform.blobStore.getBlob(artifact.path);
  assert.equal(blob.bytes, '<html>local</html>');
  assert.ok((await platform.blobStore.signedReadUrl(artifact.path, 10)).includes('/blob/'));
});

test('cloudflare reference adapter handles KV list/parse edge cases and R2 shape variants', async () => {
  const kvMap = new Map();
  const kv = {
    async get(key) {
      return kvMap.has(key) ? kvMap.get(key) : null;
    },
    async put(key, value) {
      kvMap.set(key, value);
    },
    async delete(key) {
      kvMap.delete(key);
    },
    async list() {
      return {
        keys: [
          { name: 'release:manifest:valid' },
          { name: 'release:manifest:invalid' }
        ]
      };
    }
  };

  kvMap.set('release:manifest:valid', JSON.stringify({ releaseId: 'valid' }));
  kvMap.set('release:manifest:invalid', '{bad-json');

  let mode = 'arrayBuffer';
  const r2 = {
    async put() {},
    async get() {
      if (mode === 'arrayBuffer') {
        return {
          async arrayBuffer() {
            return new TextEncoder().encode('bytes-via-array-buffer').buffer;
          },
          contentType: 'text/plain'
        };
      }
      if (mode === 'body') {
        return {
          body: 'bytes-via-body',
          contentType: 'text/plain'
        };
      }
      return null;
    },
    createSignedUrl(path, ttlSeconds) {
      return `https://signed.local/${path}?ttl=${ttlSeconds}`;
    }
  };

  const platform = createCloudflareReferencePlatform({
    TOKEN_KEY: 'cf-key',
    KV: kv,
    R2_BUCKET: r2
  });

  const listed = await platform.releaseStore.listReleases();
  assert.equal(listed.length, 1);
  assert.equal(listed[0].releaseId, 'valid');

  const firstBlob = await platform.blobStore.getBlob('a');
  assert.equal(firstBlob.bytes, 'bytes-via-array-buffer');
  mode = 'body';
  const secondBlob = await platform.blobStore.getBlob('b');
  assert.equal(secondBlob.bytes, 'bytes-via-body');
  assert.equal(await platform.blobStore.signedReadUrl('route', 42), 'https://signed.local/route?ttl=42');
});

test('cloudflare reference adapter paginates KV manifest listing and activateRelease is context-safe', async () => {
  const pages = [
    {
      keys: [{ name: 'release:manifest:one' }],
      list_complete: false,
      cursor: 'c1'
    },
    {
      keys: [{ name: 'release:manifest:two' }],
      list_complete: true
    }
  ];
  const data = new Map([
    ['release:manifest:one', JSON.stringify({ releaseId: 'one' })],
    ['release:manifest:two', JSON.stringify({ releaseId: 'two' })]
  ]);

  const kv = {
    async get(key) {
      return data.has(key) ? data.get(key) : null;
    },
    async put(key, value) {
      data.set(key, value);
    },
    async delete(key) {
      data.delete(key);
    },
    async list() {
      return pages.shift();
    }
  };

  const platform = createCloudflareReferencePlatform({
    TOKEN_KEY: 'cf-key',
    KV: kv
  });

  const listed = await platform.releaseStore.listReleases();
  assert.equal(listed.length, 2);

  const release = {
    releaseId: 'one',
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    publishedBy: 'u_admin',
    sourceRevisionId: null,
    artifacts: []
  };
  await platform.releaseStore.writeManifest('one_local', release);
  const { activateRelease } = platform.releaseStore;
  assert.equal(await activateRelease('one'), 'one');
});

test('cloudflare reference adapter uses D1 for release state when bound', async () => {
  const d1 = createFakeD1();
  const kv = createFakeKV();
  const platform = createCloudflareReferencePlatform({
    TOKEN_KEY: 'cf-key',
    D1: d1,
    KV: kv
  });

  const releaseA = {
    releaseId: 'rel_d1_a',
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    publishedBy: 'u_admin',
    sourceRevisionId: null,
    artifacts: []
  };
  const releaseB = {
    releaseId: 'rel_d1_b',
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    publishedBy: 'u_admin',
    sourceRevisionId: null,
    artifacts: []
  };

  await platform.releaseStore.writeManifest(releaseA.releaseId, releaseA);
  await platform.releaseStore.writeManifest(releaseB.releaseId, releaseB);
  await assert.rejects(() => platform.releaseStore.writeManifest(releaseA.releaseId, releaseA), /immutable/);
  await platform.releaseStore.activateRelease(releaseA.releaseId);
  await platform.releaseStore.activateRelease(releaseB.releaseId);

  const listed = await platform.releaseStore.listReleases();
  assert.equal(listed.length, 2);
  assert.equal((await platform.releaseStore.getManifest(releaseA.releaseId)).releaseId, releaseA.releaseId);
  assert.equal(await platform.releaseStore.getActiveRelease(), releaseB.releaseId);

  const history = await platform.releaseStore.getReleaseHistory();
  assert.ok(history.some((entry) => entry.type === 'manifest_written' && entry.releaseId === releaseA.releaseId));
  assert.ok(history.some((entry) => entry.type === 'activated' && entry.releaseId === releaseB.releaseId));

  await platform.cacheStore.set('still_kv_cache', 'ok', 60);
  assert.equal(await platform.cacheStore.get('still_kv_cache'), 'ok');
  assert.equal(d1.__control.execCalls.length, 5);
  assert.ok(d1.__control.batchCalls >= 2);
});

test('cloudflare reference D1 release listing orders by manifest createdAt', async () => {
  const d1 = createFakeD1();
  const platform = createCloudflareReferencePlatform({ TOKEN_KEY: 'cf-key', D1: d1 });

  platform.runtime.now = () => new Date('2026-02-06T12:00:00.000Z');
  await platform.releaseStore.writeManifest('rel_later', {
    releaseId: 'rel_later',
    schemaVersion: 1,
    createdAt: '2026-02-06T12:00:10.000Z',
    publishedBy: 'u_admin',
    sourceRevisionId: null,
    artifacts: []
  });

  platform.runtime.now = () => new Date('2026-02-06T12:00:01.000Z');
  await platform.releaseStore.writeManifest('rel_earlier', {
    releaseId: 'rel_earlier',
    schemaVersion: 1,
    createdAt: '2026-02-06T12:00:05.000Z',
    publishedBy: 'u_admin',
    sourceRevisionId: null,
    artifacts: []
  });

  const listed = await platform.releaseStore.listReleases();
  assert.equal(listed[0].releaseId, 'rel_earlier');
  assert.equal(listed[1].releaseId, 'rel_later');
});

test('cloudflare reference D1 batches activation pointer + history atomically', async () => {
  const d1 = createFakeD1();
  const platform = createCloudflareReferencePlatform({ TOKEN_KEY: 'cf-key', D1: d1 });
  await platform.releaseStore.writeManifest('rel_atomic', {
    releaseId: 'rel_atomic',
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    publishedBy: 'u_admin',
    sourceRevisionId: null,
    artifacts: []
  });

  d1.__control.failHistoryInsert = true;
  await assert.rejects(() => platform.releaseStore.activateRelease('rel_atomic'), /history insert failed/);
  assert.equal(await platform.releaseStore.getActiveRelease(), null);
  const history = await platform.releaseStore.getReleaseHistory();
  assert.ok(!history.some((entry) => entry.type === 'activated' && entry.releaseId === 'rel_atomic'));
});

test('cloudflare reference logs when D1 atomic batch is unavailable', async () => {
  const d1 = createFakeD1();
  delete d1.batch;
  const platform = createCloudflareReferencePlatform({ TOKEN_KEY: 'cf-key', D1: d1 });
  const events = [];
  platform.runtime.log = (level, event, meta) => events.push({ level, event, meta });

  await platform.releaseStore.writeManifest('rel_no_batch', {
    releaseId: 'rel_no_batch',
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    publishedBy: 'u_admin',
    sourceRevisionId: null,
    artifacts: []
  });
  await platform.releaseStore.activateRelease('rel_no_batch');

  const fallbackEvents = events.filter((entry) => entry.event === 'd1_non_atomic_fallback');
  assert.equal(fallbackEvents.length, 2);
  assert.ok(fallbackEvents.some((entry) => entry.meta?.event === 'write_manifest'));
  assert.ok(fallbackEvents.some((entry) => entry.meta?.event === 'activate_release'));
});
