import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiHandler } from '../../../apps/api-edge/src/app.js';
import { createInMemoryPlatform } from '../src/store.js';

test('api handler CORS with DEV_CORS_ORIGIN', async () => {
    const platform = createInMemoryPlatform();
    platform.runtime.envOverrides.DEV_CORS_ORIGIN = 'http://dev.local';
    const handler = createApiHandler(platform);

    const options = await handler(new Request('http://test.local/v1/documents', { method: 'OPTIONS' }));
    assert.equal(options.status, 204);
    assert.equal(options.headers.get('Access-Control-Allow-Origin'), 'http://dev.local');

    const notFound = await handler(new Request('http://test.local/v1/does-not-exist', { method: 'GET' }));
    assert.equal(notFound.status, 404);
    assert.equal(notFound.headers.get('Access-Control-Allow-Origin'), 'http://dev.local');
});
test('api handler authzErrorResponse specific mapping', async () => {
    const platform = createInMemoryPlatform();
    const handler = createApiHandler(platform);

    // Protected route without auth should yield AUTH_REQUIRED.
    const res = await handler(new Request('http://test.local/v1/documents', { method: 'GET' }));
    const body = await res.json();
    assert.equal(res.status, 401);
    assert.equal(body.error.code, 'AUTH_REQUIRED');
});

test('api handler path matching and 404', async () => {
    const platform = createInMemoryPlatform();
    const handler = createApiHandler(platform);

    // POST-only endpoint accessed via GET should 404.
    const resMethod = await handler(new Request('http://test.local/v1/auth/token', { method: 'GET' }));
    assert.equal(resMethod.status, 404);

    // Unknown path should 404.
    const resPath = await handler(new Request('http://test.local/v1/unknown', { method: 'POST' }));
    assert.equal(resPath.status, 404);
});
