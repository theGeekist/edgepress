import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../../cloudflare/src/worker.js';

function createFakeExecutionContext() {
  return {
    _promises: [],
    waitUntil(promise) {
      this._promises.push(promise);
    },
    passThroughOnException() {}
  };
}

test('worker entrypoint boots API handler with Cloudflare-style env bindings', async () => {
  const kvMap = new Map();
  const env = {
    TOKEN_KEY: 'cf-token',
    KV: {
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
        return { keys: [] };
      }
    },
    R2_BUCKET: {
      async put() {},
      async get() {
        return null;
      }
    }
  };

  const ctx = createFakeExecutionContext();
  const response = await worker.fetch(
    new Request('https://worker.local/v1/documents', { method: 'GET' }),
    env,
    ctx
  );
  assert.equal(response.status, 401);
  const json = await response.json();
  assert.equal(json.error.code, 'AUTH_REQUIRED');
});
