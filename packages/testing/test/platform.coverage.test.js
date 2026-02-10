import test from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryPlatform } from '../src/store.js';

test('in-memory runtime covers log/waitUntil paths and tx passthrough', async () => {
  const platform = createInMemoryPlatform();

  const originalEnv = process.env.NODE_ENV;
  const originalLog = console.log;
  const logs = [];
  process.env.NODE_ENV = 'development';
  console.log = (...args) => logs.push(args.join(' '));

  try {
    platform.runtime.log('info', 'runtime_test', { ok: true });
    platform.runtime.waitUntil(Promise.reject(new Error('boom')));
    await new Promise((resolve) => setTimeout(resolve, 0));
  } finally {
    process.env.NODE_ENV = originalEnv;
    console.log = originalLog;
  }

  assert.ok(logs.some((line) => line.includes('runtime_test')));
  assert.ok(logs.some((line) => line.includes('waitUntil_failure')));

  const admin = await platform.store.tx((store) => store.getUserById('u_admin'));
  assert.equal(admin.username, 'admin');
});

test('in-memory store/cache/release/coordination covers edge branches', async () => {
  const platform = createInMemoryPlatform();

  const missingUser = await platform.store.getUserByUsername('missing-user');
  assert.equal(missingUser, null);

  const emptyRevisions = await platform.store.listRevisions('doc_missing');
  assert.deepEqual(emptyRevisions, []);

  await platform.cacheStore.set('k1', { ok: true }, 60);
  platform.state.cache.get('k1').expiresAt = Date.now() - 1;
  const expired = await platform.cacheStore.get('k1');
  assert.equal(expired, null);

  await assert.rejects(() => platform.releaseStore.activateRelease('rel_missing'), /Unknown releaseId/);

  const lock = await platform.coordination.acquireLock('publish');
  assert.ok(lock.token.startsWith('lock:publish'));
  await platform.coordination.releaseLock(lock.token);
});
