import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { configureApiFetch, createApiFetchMiddlewares } from '../../../apps/admin-web/src/gutenberg-integration.js';

const require = createRequire(import.meta.url);
let moduleVersion = 0;

function headerOf(headers, key) {
  if (!headers) return undefined;
  if (typeof headers.get === 'function') return headers.get(key);
  return headers[key];
}

async function loadFreshApiFetch() {
  const packageJsonPath = require.resolve('@wordpress/api-fetch/package.json');
  const modulePath = path.join(path.dirname(packageJsonPath), 'build-module', 'index.mjs');
  moduleVersion += 1;
  const moduleUrl = `${pathToFileURL(modulePath).href}?fresh=${moduleVersion}`;
  const mod = await import(moduleUrl);
  return mod.default;
}

test('configureApiFetch registers middleware in deterministic order', () => {
  const used = [];
  const apiFetch = {
    createRootURLMiddleware(root) {
      const fn = (_options, next) => next(_options);
      fn._name = `root:${root}`;
      return fn;
    },
    use(fn) {
      used.push(fn._name || fn.name || 'anonymous');
    }
  };

  configureApiFetch(apiFetch, {
    getAccessToken: () => null,
    refresh: async () => false,
    apiRoot: 'http://localhost:8787'
  });

  assert.deepEqual(used, [
    'authMiddleware',
    'traceMiddleware',
    'root:http://localhost:8787/',
    'refreshMiddleware'
  ]);
});

test('configureApiFetch uses real apiFetch chain with refresh retry and updated auth header', async () => {
  const apiFetch = await loadFreshApiFetch();
  let token = 'old_token';
  let attempts = 0;
  const seen = [];

  configureApiFetch(apiFetch, {
    getAccessToken: () => token,
    refresh: async () => {
      token = 'new_token';
      return true;
    },
    apiRoot: 'http://localhost:8787'
  });

  apiFetch.setFetchHandler(async (options) => {
    attempts += 1;
    seen.push(options);
    if (attempts === 1) {
      const err = new Error('unauthorized');
      err.status = 401;
      throw err;
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  });

  const response = await apiFetch({ path: '/v1/documents' });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(result, { ok: true });
  assert.equal(attempts, 2);

  assert.equal(headerOf(seen[0].headers, 'authorization'), 'Bearer old_token');
  assert.equal(headerOf(seen[1].headers, 'authorization'), 'Bearer new_token');
  assert.ok(headerOf(seen[1].headers, 'x-trace-id'));
  assert.ok(seen[1].url.startsWith('http://localhost:8787/v1/documents'));
  assert.ok(seen[1].url.includes('_locale=user'));
});

test('refresh middleware does not retry non-401 and propagates 401 when refresh fails', async () => {
  const middlewares = createApiFetchMiddlewares({
    getAccessToken: () => 'token_a',
    refresh: async () => false
  });

  await assert.rejects(
    () =>
      middlewares.refreshMiddleware({}, async () => {
        const err = new Error('forbidden');
        err.status = 403;
        throw err;
      }),
    (error) => error.status === 403
  );

  await assert.rejects(
    () =>
      middlewares.refreshMiddleware({}, async () => {
        const err = new Error('unauthorized');
        err.status = 401;
        throw err;
      }),
    (error) => error.status === 401
  );
});
