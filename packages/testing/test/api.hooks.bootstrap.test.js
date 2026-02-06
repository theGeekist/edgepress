import test from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryPlatform } from '../src/inMemoryPlatform.js';
import { authAsAdmin, requestJson } from '../src/testUtils.js';
import {
  attachServerHooks,
  registerServerHookRegistrar,
  resetServerHookRegistrarsForTests
} from '../../../apps/api-edge/src/hooks-bootstrap.js';

test.afterEach(() => {
  resetServerHookRegistrarsForTests();
});

async function createDoc(handler, token, suffix = 'bootstrap') {
  const created = await requestJson(handler, 'POST', '/v1/documents', {
    token,
    body: { title: `Bootstrap Doc ${suffix}`, content: `<p>${suffix}</p>` }
  });
  assert.equal(created.res.status, 201);
  return created.json.document.id;
}

test('server hook registrar can register filters via addFilter/applyFilters contract', async () => {
  resetServerHookRegistrarsForTests();
  registerServerHookRegistrar(({ hooks, hookNames }) => {
    hooks.addFilter(
      hookNames.publishProvenanceFilter,
      'edgepress/tests/bootstrap_filter',
      (payload) => ({
        ...payload,
        provenance: {
          sourceRevisionId: 'rev_bootstrap_override',
          sourceRevisionSet: ['rev_bootstrap_override', ...(payload.provenance?.sourceRevisionSet || [])]
        }
      })
    );
  });

  const platform = createInMemoryPlatform();
  attachServerHooks(platform);

  const { handler, accessToken } = await authAsAdmin(platform);
  await createDoc(handler, accessToken, 'filter');

  const publish = await requestJson(handler, 'POST', '/v1/publish', {
    token: accessToken,
    body: { sourceRevisionSet: ['rev_client_input'] }
  });
  assert.equal(publish.res.status, 201);
  assert.equal(publish.json.job.sourceRevisionId, 'rev_bootstrap_override');
  assert.deepEqual(publish.json.job.sourceRevisionSet, ['rev_bootstrap_override', 'rev_client_input']);
});

test('server hook registrar can register actions via addAction/doAction contract', async () => {
  resetServerHookRegistrarsForTests();
  const events = [];

  registerServerHookRegistrar(({ hooks, hookNames }) => {
    hooks.addAction(
      hookNames.publishCompletedAction,
      'edgepress/tests/bootstrap_action',
      (payload) => {
        events.push({
          status: payload.job?.status || 'unknown',
          releaseId: payload.job?.releaseId || payload.manifest?.releaseId || null
        });
      }
    );
  });

  const platform = createInMemoryPlatform();
  attachServerHooks(platform);

  const { handler, accessToken } = await authAsAdmin(platform);
  await createDoc(handler, accessToken, 'action');

  const publish = await requestJson(handler, 'POST', '/v1/publish', {
    token: accessToken,
    body: {}
  });
  assert.equal(publish.res.status, 201);
  assert.ok(events.some((event) => event.status === 'completed' && typeof event.releaseId === 'string'));
});

test('attachServerHooks is idempotent for the same registry and registrar', async () => {
  resetServerHookRegistrarsForTests();
  let registrations = 0;
  registerServerHookRegistrar(({ hooks, hookNames }) => {
    registrations += 1;
    hooks.addAction(
      hookNames.publishCompletedAction,
      'edgepress/tests/bootstrap_idempotent',
      () => {}
    );
  });

  const platform = createInMemoryPlatform();
  attachServerHooks(platform);
  attachServerHooks(platform);

  assert.equal(registrations, 1);
});

test('attachServerHooks continues when one registrar throws', async () => {
  resetServerHookRegistrarsForTests();
  registerServerHookRegistrar(() => {
    throw new Error('broken registrar');
  });
  registerServerHookRegistrar(({ hooks, hookNames }) => {
    hooks.addFilter(
      hookNames.publishProvenanceFilter,
      'edgepress/tests/bootstrap_after_error',
      (payload) => ({
        ...payload,
        provenance: {
          sourceRevisionId: 'rev_after_error',
          sourceRevisionSet: ['rev_after_error']
        }
      })
    );
  });

  const platform = createInMemoryPlatform();
  attachServerHooks(platform);
  const { handler, accessToken } = await authAsAdmin(platform);
  await createDoc(handler, accessToken, 'after-error');

  const publish = await requestJson(handler, 'POST', '/v1/publish', {
    token: accessToken,
    body: {}
  });
  assert.equal(publish.res.status, 201);
  assert.equal(publish.json.job.sourceRevisionId, 'rev_after_error');
});

test('attachServerHooks retries failing registrars without repeated log spam', () => {
  resetServerHookRegistrarsForTests();
  let attempts = 0;
  registerServerHookRegistrar(() => {
    attempts += 1;
    throw new Error('broken registrar');
  });

  const logs = [];
  const platform = createInMemoryPlatform();
  platform.runtime.log = (level, event, meta) => {
    logs.push({ level, event, meta });
  };

  attachServerHooks(platform);
  attachServerHooks(platform);

  assert.equal(attempts, 2);
  const failureLogs = logs.filter((entry) => entry.event === 'hooks_registrar_attach_failed');
  assert.equal(failureLogs.length, 1);
});
