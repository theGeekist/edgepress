import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '../../sdk/src/client.js';

function jsonResponse(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

test('sdk attaches bearer token and returns payload', async () => {
  const calls = [];
  const client = createClient({
    baseUrl: 'http://api.local',
    getAccessToken: () => 'token_a',
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return jsonResponse(200, { items: [] });
    }
  });

  const payload = await client.listDocuments();
  assert.deepEqual(payload, { items: [] });
  assert.equal(calls[0].init.headers.authorization, 'Bearer token_a');
});

test('sdk retries once on 401 after refresh and uses new token', async () => {
  let accessToken = 'old_token';
  let requestCount = 0;

  const client = createClient({
    baseUrl: 'http://api.local',
    getAccessToken: () => accessToken,
    onTokenRefresh: async () => {
      accessToken = 'new_token';
      return true;
    },
    fetchImpl: async (_url, init) => {
      requestCount += 1;
      if (requestCount === 1) {
        assert.equal(init.headers.authorization, 'Bearer old_token');
        return jsonResponse(401, { error: { code: 'FORBIDDEN', message: 'Expired' } });
      }
      assert.equal(init.headers.authorization, 'Bearer new_token');
      return jsonResponse(200, { items: ['ok'] });
    }
  });

  const payload = await client.listDocuments();
  assert.deepEqual(payload, { items: ['ok'] });
  assert.equal(requestCount, 2);
});

test('sdk throws structured ApiRequestError payload', async () => {
  const client = createClient({
    baseUrl: 'http://api.local',
    fetchImpl: async () => jsonResponse(404, { error: { code: 'NOT_FOUND', message: 'Missing' } })
  });

  await assert.rejects(
    () => client.getPublishJob('job_missing'),
    (error) => {
      assert.equal(error.name, 'ApiRequestError');
      assert.equal(error.status, 404);
      assert.equal(error.code, 'NOT_FOUND');
      assert.equal(error.path, '/v1/publish/job_missing');
      return true;
    }
  );
});

test('sdk calls onAuthFailure when refresh cannot recover 401', async () => {
  let authFailureCalls = 0;
  const client = createClient({
    baseUrl: 'http://api.local',
    onTokenRefresh: async () => false,
    onAuthFailure: async () => {
      authFailureCalls += 1;
    },
    fetchImpl: async () => jsonResponse(401, { error: { code: 'FORBIDDEN', message: 'Denied' } })
  });

  await assert.rejects(() => client.listDocuments());
  assert.equal(authFailureCalls, 1);
});

test('sdk handles invalid json payload fallback and plain-text errors', async () => {
  const invalidJsonClient = createClient({
    baseUrl: 'http://api.local',
    fetchImpl: async () =>
      new Response('not-json', {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
  });
  const invalidJsonPayload = await invalidJsonClient.listDocuments();
  assert.equal(invalidJsonPayload, null);

  const plainTextClient = createClient({
    baseUrl: 'http://api.local',
    fetchImpl: async () =>
      new Response('Plain failure', {
        status: 500,
        headers: { 'content-type': 'text/plain' }
      })
  });

  await assert.rejects(
    () => plainTextClient.listDocuments(),
    (error) => {
      assert.equal(error.name, 'ApiRequestError');
      assert.equal(error.status, 500);
      assert.equal(error.code, 'REQUEST_FAILED');
      assert.equal(error.message, 'Plain failure');
      return true;
    }
  );
});

test('sdk does not call auth-failure callback when no token refresh handler is configured', async () => {
  let authFailureCalls = 0;
  const client = createClient({
    baseUrl: 'http://api.local',
    onAuthFailure: async () => {
      authFailureCalls += 1;
    },
    fetchImpl: async () => jsonResponse(401, { error: { code: 'AUTH_REQUIRED', message: 'Unauthorized' } })
  });

  await assert.rejects(() => client.listDocuments());
  assert.equal(authFailureCalls, 0);
});
