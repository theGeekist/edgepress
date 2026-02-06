import test from 'node:test';
import assert from 'node:assert/strict';
import { HOOK_NAMES, resolveHooks } from '../../../apps/api-edge/src/hooks.js';
import { createHooksRegistry } from '@hooks/src/index.js';
import { createInMemoryPlatform } from '../src/inMemoryPlatform.js';
import { authAsAdmin, requestJson } from '../src/testUtils.js';

async function createDoc(handler, token, suffix = 'hook') {
  const created = await requestJson(handler, 'POST', '/v1/documents', {
    token,
    body: { title: `Hook Doc ${suffix}`, content: `<p>${suffix}</p>` }
  });
  assert.equal(created.res.status, 201);
  return created.json.document.id;
}

test('beforePublish hook can veto publish with canonical envelope', async () => {
  const platform = createInMemoryPlatform();
  const hooks = createHooksRegistry();
  hooks.addFilter(
    HOOK_NAMES.publishProvenanceFilter,
    'edgepress/tests/veto',
    () => {
      const err = new Error('Publish blocked by policy');
      err.status = 409;
      err.code = 'PUBLISH_BLOCKED';
      throw err;
    }
  );
  platform.hooks = hooks;
  const { handler, accessToken } = await authAsAdmin(platform);
  await createDoc(handler, accessToken, 'veto');

  const publish = await requestJson(handler, 'POST', '/v1/publish', {
    token: accessToken,
    body: {}
  });
  assert.equal(publish.res.status, 409);
  assert.equal(publish.json.error.code, 'PUBLISH_BLOCKED');
});

test('beforePublish hook can transform provenance before publish', async () => {
  const platform = createInMemoryPlatform();
  const hooks = createHooksRegistry();
  hooks.addFilter(
    HOOK_NAMES.publishProvenanceFilter,
    'edgepress/tests/provenance_transform',
    (payload) => ({
      ...payload,
      provenance: {
        sourceRevisionId: 'rev_hook_override',
        sourceRevisionSet: ['rev_hook_override', ...(payload.provenance?.sourceRevisionSet || [])]
      }
    })
  );
  platform.hooks = hooks;

  const { handler, accessToken } = await authAsAdmin(platform);
  await createDoc(handler, accessToken, 'transform');

  const publish = await requestJson(handler, 'POST', '/v1/publish', {
    token: accessToken,
    body: { sourceRevisionSet: ['rev_from_request'] }
  });
  assert.equal(publish.res.status, 201);
  assert.equal(publish.json.job.sourceRevisionId, 'rev_hook_override');
  assert.deepEqual(publish.json.job.sourceRevisionSet, ['rev_hook_override', 'rev_from_request']);

  const manifest = await platform.releaseStore.getManifest(publish.json.job.releaseId);
  assert.equal(manifest.sourceRevisionId, 'rev_hook_override');
  assert.deepEqual(manifest.sourceRevisionSet, ['rev_hook_override', 'rev_from_request']);
});

test('async hooks run for document/revision/publish/activate lifecycle', async () => {
  const platform = createInMemoryPlatform();
  const pending = [];
  platform.runtime.waitUntil = (promise) => {
    pending.push(promise);
  };

  const events = [];
  const hooks = createHooksRegistry();
  hooks.addAction(
    HOOK_NAMES.documentWrittenAction,
    'edgepress/tests/document_written',
    (payload) => {
      events.push({ type: 'document.written', mode: payload.mode, documentId: payload.document?.id });
    }
  );
  hooks.addAction(
    HOOK_NAMES.revisionCreatedAction,
    'edgepress/tests/revision_created',
    (payload) => {
      events.push({ type: 'revision.created', mode: payload.mode, revisionId: payload.revision?.id });
    }
  );
  hooks.addAction(
    HOOK_NAMES.publishStartedAction,
    'edgepress/tests/publish_started',
    (payload) => {
      events.push({ type: 'publish.started', jobId: payload.job?.id });
    }
  );
  hooks.addAction(
    HOOK_NAMES.publishCompletedAction,
    'edgepress/tests/publish_completed',
    (payload) => {
      events.push({
        type: 'publish.completed',
        status: payload.job?.status,
        releaseId: payload.job?.releaseId || payload.manifest?.releaseId || null
      });
    }
  );
  hooks.addAction(
    HOOK_NAMES.releaseActivatedAction,
    'edgepress/tests/release_activated',
    (payload) => {
      events.push({ type: 'release.activated', releaseId: payload.releaseId, source: payload.source });
    }
  );
  platform.hooks = hooks;

  const { handler, accessToken } = await authAsAdmin(platform);
  const documentId = await createDoc(handler, accessToken, 'lifecycle');

  const patched = await requestJson(handler, 'PATCH', `/v1/documents/${encodeURIComponent(documentId)}`, {
    token: accessToken,
    body: { content: '<p>lifecycle-v2</p>' }
  });
  assert.equal(patched.res.status, 200);

  const publish = await requestJson(handler, 'POST', '/v1/publish', {
    token: accessToken,
    body: {}
  });
  assert.equal(publish.res.status, 201);
  const releaseId = publish.json.job.releaseId;

  const activate = await requestJson(handler, 'POST', `/v1/releases/${encodeURIComponent(releaseId)}/activate`, {
    token: accessToken,
    body: {}
  });
  assert.equal(activate.res.status, 200);

  await Promise.all(pending.map((entry) => entry.catch(() => {})));

  assert.ok(events.some((entry) => entry.type === 'document.written' && entry.mode === 'create'));
  assert.ok(events.some((entry) => entry.type === 'document.written' && entry.mode === 'update'));
  assert.ok(events.some((entry) => entry.type === 'revision.created' && entry.mode === 'create'));
  assert.ok(events.some((entry) => entry.type === 'revision.created' && entry.mode === 'update'));
  assert.ok(events.some((entry) => entry.type === 'publish.started'));
  assert.ok(events.some((entry) => entry.type === 'publish.completed' && entry.status === 'completed'));
  assert.ok(events.some((entry) => entry.type === 'release.activated' && entry.source === 'publish_auto'));
  assert.ok(events.some((entry) => entry.type === 'release.activated' && entry.source === 'manual'));
});

test('partial hook registry falls back to shared edgepress hooks', async () => {
  const platform = createInMemoryPlatform();
  platform.hooks = {
    addAction() {},
    applyFilters(_hook, payload) {
      return payload;
    }
  };

  const { handler, accessToken } = await authAsAdmin(platform);
  await createDoc(handler, accessToken, 'partial-registry');

  const publish = await requestJson(handler, 'POST', '/v1/publish', {
    token: accessToken,
    body: {}
  });
  assert.equal(publish.res.status, 201);
  assert.equal(publish.json.job.status, 'completed');
});

test('resolveHooks requires the broader WordPress-compatible method surface', () => {
  const minimal = {
    addAction() {},
    doAction() {},
    addFilter() {},
    applyFilters(_name, payload) {
      return payload;
    }
  };
  const minimalResolved = resolveHooks({ hooks: minimal });
  assert.notEqual(minimalResolved, minimal);

  const full = createHooksRegistry();
  const fullResolved = resolveHooks({ hooks: full });
  assert.equal(fullResolved, full);
});
