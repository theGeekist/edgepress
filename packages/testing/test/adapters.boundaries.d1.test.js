import test from 'node:test';
import assert from 'node:assert/strict';
import { createCloudflareReferencePlatform } from '../../cloudflare/src/index.js';
import { createApiHandler } from '../../../apps/api-edge/src/app.js';
import { requestJson } from '../src/testUtils.js';
import { createFakeD1, createFakeKV } from './helpers/cloudflareFakes.js';

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

test('cloudflare reference adapter persists core store state via D1 across instances', async () => {
  const kv = createFakeKV();
  const d1 = createFakeD1();
  const env = {
    TOKEN_KEY: 'cf-key',
    PREVIEW_TOKEN_KEY: 'preview-key',
    PRIVATE_CACHE_SCOPE_KEY: 'scope-key',
    BOOTSTRAP_ADMIN_USERNAME: 'admin',
    BOOTSTRAP_ADMIN_PASSWORD: 'admin-pass',
    D1: d1,
    KV: kv
  };

  const first = createCloudflareReferencePlatform(env);
  const firstHandler = createApiHandler(first);

  const auth = await requestJson(firstHandler, 'POST', '/v1/auth/token', {
    body: { username: 'admin', password: 'admin-pass' }
  });
  assert.equal(auth.res.status, 200);
  const token = auth.json.accessToken;

  const created = await requestJson(firstHandler, 'POST', '/v1/documents', {
    token,
    body: { title: 'Persisted', content: '<p>persisted</p>' }
  });
  assert.equal(created.res.status, 201);
  const docId = created.json.document.id;

  const publish = await requestJson(firstHandler, 'POST', '/v1/publish', { token, body: {} });
  assert.equal(publish.res.status, 201);
  const jobId = publish.json.job.id;
  assert.equal(publish.json.job.status, 'completed');

  const second = createCloudflareReferencePlatform(env);
  const secondHandler = createApiHandler(second);

  const listed = await requestJson(secondHandler, 'GET', '/v1/documents', { token });
  assert.equal(listed.res.status, 200);
  assert.ok(listed.json.items.some((doc) => doc.id === docId));

  const fetchedJob = await requestJson(secondHandler, 'GET', `/v1/publish/${jobId}`, { token });
  assert.equal(fetchedJob.res.status, 200);
  assert.equal(fetchedJob.json.job.status, 'completed');

  const preview = await requestJson(secondHandler, 'GET', `/v1/preview/${docId}`, { token });
  assert.equal(preview.res.status, 200);
  assert.ok(typeof preview.json.previewUrl === 'string');
});
