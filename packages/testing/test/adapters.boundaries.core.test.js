import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { createCloudflareReferencePlatform } from '../../cloudflare/src/index.js';
import { createApiHandler } from '../../../apps/api-edge/src/app.js';
import { requestJson } from '../src/testUtils.js';
import { createFakeD1, createFakeKV, createFakeR2 } from './helpers/cloudflareFakes.js';

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

test('cloudflare reference adapter fails closed when token signing secrets are missing', async () => {
  const platform = createCloudflareReferencePlatform({});
  await assert.rejects(
    () => platform.runtime.hmacSign('payload', 'TOKEN_KEY'),
    /Missing required runtime secret: TOKEN_KEY/
  );
});

test('cloudflare reference adapter does not create default admin without bootstrap creds', async () => {
  const platform = createCloudflareReferencePlatform({
    TOKEN_KEY: 'cf-key',
    D1: createFakeD1()
  });
  const handler = createApiHandler(platform);
  const auth = await requestJson(handler, 'POST', '/v1/auth/token', {
    body: { username: 'admin', password: 'admin' }
  });
  assert.equal(auth.res.status, 401);
  assert.equal(auth.json.error.code, 'AUTH_INVALID');
});
