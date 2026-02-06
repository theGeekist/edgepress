import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiHandler } from '../../../apps/api-edge/src/app.js';
import { createInMemoryPlatform } from '../src/inMemoryPlatform.js';

test('api handler CORS with DEV_CORS_ORIGIN', async () => {
    const platform = createInMemoryPlatform();
    platform.runtime.env = (key) => key === 'DEV_CORS_ORIGIN' ? 'http://dev.local' : null;
    const handler = createApiHandler(platform);

    const options = await handler(new Request('http://test.local/v1/documents', { method: 'OPTIONS' }));
    assert.equal(options.headers.get('Access-Control-Allow-Origin'), 'http://dev.local');

    const notFound = await handler(new Request('http://test.local/v1/does-not-exist', { method: 'GET' }));
    assert.equal(notFound.headers.get('Access-Control-Allow-Origin'), 'http://dev.local');
});
test('api handler authzErrorResponse specific mapping', async () => {
    const platform = createInMemoryPlatform();
    const handler = createApiHandler(platform);

    // Trigger AUTH_REQUIRED (Line 18 of app.js)
    const res = await handler(new Request('http://test.local/v1/documents', { method: 'GET' }));
    const body = await res.json();
    assert.equal(res.status, 401);
    assert.equal(body.error.code, 'AUTH_REQUIRED');
});

test('api handler path matching and 404', async () => {
    const platform = createInMemoryPlatform();
    const handler = createApiHandler(platform);

    // Mismatch method (Line 61)
    const resMethod = await handler(new Request('http://test.local/v1/auth/token', { method: 'GET' }));
    assert.equal(resMethod.status, 404);

    // Mismatch path (Line 63)
    const resPath = await handler(new Request('http://test.local/v1/unknown', { method: 'POST' }));
    assert.equal(resPath.status, 404);
});
