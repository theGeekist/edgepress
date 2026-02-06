import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppStores } from '../../adapters-cloudflare/src/app-store.js';
import { D1_SQL } from '../../adapters-cloudflare/src/d1-sql.js';
import { createInMemoryPlatform } from '../src/inMemoryPlatform.js';
import { createFakeD1, createFakeKV } from './helpers/cloudflareFakes.js';

function parseJsonSafe(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function makeKvHelpers(kv) {
  return {
    kvGetJson: async (key) => {
      const raw = await kv.get(key);
      return parseJsonSafe(raw);
    },
    kvPutJson: async (key, value) => kv.put(key, JSON.stringify(value)),
    kvGetString: async (key) => {
      const raw = await kv.get(key);
      return typeof raw === 'string' ? raw : null;
    },
    kvPutString: async (key, value) => kv.put(key, String(value))
  };
}

test('app-store falls back to base stores when D1/KV are not bound', async () => {
  const base = createInMemoryPlatform();
  const runtime = base.runtime;
  const appStores = createAppStores({
    d1: null,
    kv: null,
    runtime,
    baseStore: base.store,
    basePreviewStore: base.previewStore,
    D1_SQL,
    parseJsonSafe,
    kvGetJson: async () => null,
    kvPutJson: async () => {},
    kvGetString: async () => null,
    kvPutString: async () => {},
    bootstrapAdmin: null
  });

  assert.equal(appStores.store, base.store);
  assert.equal(appStores.previewStore, base.previewStore);
});

test('app-store KV mode covers bootstrap + CRUD paths', async () => {
  const kv = createFakeKV();
  const runtime = createInMemoryPlatform().runtime;
  const { kvGetJson, kvPutJson, kvGetString, kvPutString } = makeKvHelpers(kv);

  const { store, previewStore } = createAppStores({
    d1: null,
    kv,
    runtime,
    baseStore: {},
    basePreviewStore: {},
    D1_SQL,
    parseJsonSafe,
    kvGetJson,
    kvPutJson,
    kvGetString,
    kvPutString,
    bootstrapAdmin: {
      username: 'admin',
      password: 'pass',
      role: 'admin'
    }
  });

  await store.tx(async () => null);
  const bootstrapped = await store.getUserByUsername('admin');
  assert.equal(bootstrapped.username, 'admin');
  assert.equal((await store.getUserById('u_admin')).id, 'u_admin');

  await store.seedUser({ id: 'u2', username: 'editor', password: 'p', role: 'editor' });
  assert.equal((await store.getUserByUsername('editor')).id, 'u2');
  assert.equal((await store.getUserByUsername('none')), null);

  await store.saveRefreshToken('rt1', 'u2');
  assert.equal(await store.getRefreshTokenUser('rt1'), 'u2');
  await store.revokeRefreshToken('rt1');
  assert.equal(await store.getRefreshTokenUser('rt1'), null);

  const createdDoc = await store.createDocument({ title: 'Doc 1', content: '<p>one</p>' });
  const updatedDoc = await store.updateDocument(createdDoc.id, { title: 'Doc 1b' });
  assert.equal(updatedDoc.title, 'Doc 1b');
  assert.equal(await store.updateDocument('missing', { title: 'x' }), null);
  assert.equal((await store.listDocuments()).length, 1);
  assert.equal((await store.getDocument(createdDoc.id)).id, createdDoc.id);

  const revision = await store.createRevision({
    documentId: createdDoc.id,
    content: '<p>rev</p>',
    authorId: 'u2'
  });
  assert.equal((await store.getRevision(revision.id)).id, revision.id);
  assert.equal((await store.listRevisions(createdDoc.id)).length, 1);

  const media = await store.createMediaSession({
    ownerId: 'u2',
    filename: 'img.png',
    contentType: 'image/png',
    size: 10
  });
  assert.equal((await store.getMedia(media.id)).id, media.id);
  const finalized = await store.finalizeMedia(media.id, {
    storageKey: 'r2/key',
    checksum: 'abc',
    size: 11
  });
  assert.equal(finalized.status, 'ready');
  assert.equal(await store.finalizeMedia('missing', { storageKey: 'x', checksum: 'y', size: 1 }), null);

  const job = await store.createPublishJob({
    actorUserId: 'u2',
    sourceRevisionId: revision.id
  });
  assert.equal((await store.getPublishJob(job.id)).id, job.id);
  assert.equal((await store.updatePublishJob(job.id, { status: 'failed' })).status, 'failed');
  assert.equal(await store.updatePublishJob('missing', { status: 'failed' }), null);

  const form = await store.createFormSubmission({
    formId: 'contact',
    payload: { email: 'a@example.com' }
  });
  assert.equal(form.formId, 'contact');

  await previewStore.createPreview({ previewToken: 'p1', releaseId: 'r1', expiresAt: '2999-01-01T00:00:00.000Z' });
  assert.equal((await previewStore.getPreview('p1')).releaseId, 'r1');
});

test('app-store KV mode handles missing kv.delete during revoke', async () => {
  const kv = createFakeKV();
  delete kv.delete;
  const runtime = createInMemoryPlatform().runtime;
  const { kvGetJson, kvPutJson, kvGetString, kvPutString } = makeKvHelpers(kv);
  const { store } = createAppStores({
    d1: null,
    kv,
    runtime,
    baseStore: {},
    basePreviewStore: {},
    D1_SQL,
    parseJsonSafe,
    kvGetJson,
    kvPutJson,
    kvGetString,
    kvPutString,
    bootstrapAdmin: null
  });

  await store.saveRefreshToken('rt2', 'u3');
  await store.revokeRefreshToken('rt2');
  assert.equal(await store.getRefreshTokenUser('rt2'), 'u3');
});

test('app-store D1 mode covers schema setup + CRUD paths', async () => {
  const d1 = createFakeD1();
  const runtime = createInMemoryPlatform().runtime;
  const { store, previewStore } = createAppStores({
    d1,
    kv: null,
    runtime,
    baseStore: {},
    basePreviewStore: {},
    D1_SQL,
    parseJsonSafe,
    kvGetJson: async () => null,
    kvPutJson: async () => {},
    kvGetString: async () => null,
    kvPutString: async () => {},
    bootstrapAdmin: {
      username: 'admin',
      password: 'pass',
      role: 'admin'
    }
  });

  await store.tx(async () => null);
  assert.ok(d1.__control.execCalls.length >= 10);
  assert.equal((await store.getUserByUsername('admin')).id, 'u_admin');
  assert.equal((await store.getUserById('u_admin')).username, 'admin');
  await store.seedUser({ id: 'u2', username: 'editor', password: 'p', role: 'editor' });
  assert.equal((await store.getUserByUsername('editor')).id, 'u2');

  await store.saveRefreshToken('rt1', 'u2');
  assert.equal(await store.getRefreshTokenUser('rt1'), 'u2');
  await store.revokeRefreshToken('rt1');
  assert.equal(await store.getRefreshTokenUser('rt1'), null);

  const doc = await store.createDocument({ title: 'Doc', content: '<p>x</p>' });
  assert.equal((await store.getDocument(doc.id)).id, doc.id);
  assert.equal((await store.listDocuments()).length, 1);
  assert.equal((await store.updateDocument(doc.id, { title: 'Doc2' })).title, 'Doc2');
  assert.equal(await store.updateDocument('missing', { title: 'x' }), null);

  const rev = await store.createRevision({
    documentId: doc.id,
    content: '<p>rev</p>',
    authorId: 'u2'
  });
  assert.equal((await store.getRevision(rev.id)).id, rev.id);
  assert.equal((await store.listRevisions(doc.id)).length, 1);

  const media = await store.createMediaSession({
    ownerId: 'u2',
    filename: 'doc.pdf',
    contentType: 'application/pdf',
    size: 22
  });
  assert.equal((await store.getMedia(media.id)).id, media.id);
  assert.equal((await store.finalizeMedia(media.id, { storageKey: 'r2/a', checksum: 'sum', size: 22 })).status, 'ready');
  assert.equal(await store.finalizeMedia('missing', { storageKey: 'a', checksum: 'b', size: 1 }), null);

  const job = await store.createPublishJob({ actorUserId: 'u2', sourceRevisionId: rev.id });
  assert.equal((await store.getPublishJob(job.id)).id, job.id);
  assert.equal((await store.updatePublishJob(job.id, { status: 'completed' })).status, 'completed');
  assert.equal(await store.updatePublishJob('missing', { status: 'failed' }), null);

  const submission = await store.createFormSubmission({
    formId: 'lead',
    payload: { name: 'Jane' }
  });
  assert.equal(submission.formId, 'lead');

  await previewStore.createPreview({
    previewToken: 'pv_d1',
    releaseId: 'r1',
    expiresAt: '2999-01-01T00:00:00.000Z'
  });
  assert.equal((await previewStore.getPreview('pv_d1')).releaseId, 'r1');
});

test('app-store D1 permanent delete is atomic when batch fails', async () => {
  const d1 = createFakeD1();
  const runtime = createInMemoryPlatform().runtime;
  const { store } = createAppStores({
    d1,
    kv: null,
    runtime,
    baseStore: {},
    basePreviewStore: {},
    D1_SQL,
    parseJsonSafe,
    kvGetJson: async () => null,
    kvPutJson: async () => {},
    kvGetString: async () => null,
    kvPutString: async () => {},
    bootstrapAdmin: null
  });

  const doc = await store.createDocument({ title: 'Delete me', content: '<p>x</p>' });
  await store.createRevision({
    documentId: doc.id,
    content: '<p>rev</p>',
    authorId: 'u2'
  });

  const originalBatch = d1.batch.bind(d1);
  d1.batch = async () => {
    throw new Error('batch failed');
  };
  await assert.rejects(() => store.deleteDocument(doc.id, { permanent: true }));
  d1.batch = originalBatch;

  assert.equal((await store.getDocument(doc.id)).id, doc.id);
  assert.equal((await store.listRevisions(doc.id)).length, 1);
});

test('app-store listDocuments query branch covers filtering and pagination for D1 and KV', async () => {
  const runtime = createInMemoryPlatform().runtime;

  const d1Stores = createAppStores({
    d1: createFakeD1(),
    kv: null,
    runtime,
    baseStore: {},
    basePreviewStore: {},
    D1_SQL,
    parseJsonSafe,
    kvGetJson: async () => null,
    kvPutJson: async () => {},
    kvGetString: async () => null,
    kvPutString: async () => {},
    bootstrapAdmin: null
  });
  const kv = createFakeKV();
  const kvHelpers = makeKvHelpers(kv);
  const kvStores = createAppStores({
    d1: null,
    kv,
    runtime,
    baseStore: {},
    basePreviewStore: {},
    D1_SQL,
    parseJsonSafe,
    ...kvHelpers,
    bootstrapAdmin: null
  });

  for (const store of [d1Stores.store, kvStores.store]) {
    await store.createDocument({ id: 'doc_1', title: 'Alpha Page', type: 'page', status: 'draft', content: '<p>a</p>' });
    await store.createDocument({ id: 'doc_2', title: 'Beta Post', type: 'post', status: 'published', content: '<p>b</p>' });
    await store.createDocument({ id: 'doc_3', title: 'Gamma Post', type: 'post', status: 'draft', content: '<p>c</p>' });

    const filtered = await store.listDocuments({
      q: 'post',
      type: 'post',
      status: 'draft',
      sortBy: 'updatedAt',
      sortDir: 'desc',
      page: 1,
      pageSize: 1
    });
    assert.equal(filtered.pagination.totalItems, 1);
    assert.equal(filtered.items.length, 1);
    assert.equal(filtered.items[0].title, 'Gamma Post');
  }
});
