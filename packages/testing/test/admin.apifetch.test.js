import test from 'node:test';
import assert from 'node:assert/strict';
import { configureApiFetch, createApiFetchMiddlewares } from '../../../apps/admin-web/src/gutenberg-integration.js';

function composeMiddlewares(outer, middle, inner, terminal) {
  return (options) =>
    outer(options, (o1) =>
      middle(o1, (o2) =>
        inner(o2, (o3) => terminal(o3))
      )
    );
}

test('configureApiFetch registers root + refresh/auth/trace in deterministic order', async () => {
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
    'root:http://localhost:8787/',
    'refreshMiddleware',
    'authMiddleware',
    'traceMiddleware'
  ]);
});

test('refresh middleware retry path reuses updated auth token', async () => {
  let token = 'old_token';
  let attempts = 0;
  const middlewares = createApiFetchMiddlewares({
    getAccessToken: () => token,
    refresh: async () => {
      token = 'new_token';
      return true;
    }
  });

  const call = composeMiddlewares(
    middlewares.refreshMiddleware,
    middlewares.authMiddleware,
    middlewares.traceMiddleware,
    async (options) => {
      attempts += 1;
      if (attempts === 1) {
        const err = new Error('unauthorized');
        err.status = 401;
        throw err;
      }
      return options;
    }
  );

  const result = await call({ headers: {} });
  assert.equal(result.headers.authorization, 'Bearer new_token');
  assert.equal(attempts, 2);
  assert.ok(result.headers['x-trace-id']);
});
