import test from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryPlatform } from '../src/store.js';
import { authAsAdmin, requestJson } from '../src/testUtils.js';

test('publish: GET /v1/publish/:jobId returns 404 for missing job', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const res = await requestJson(handler, 'GET', '/v1/publish/job_missing', { token: accessToken });
  assert.equal(res.res.status, 404);
  assert.equal(res.json.error.code, 'PUBLISH_JOB_NOT_FOUND');
});

test('publish: POST /v1/releases/:id/activate returns 404 for unknown release', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const res = await requestJson(handler, 'POST', '/v1/releases/rel_unknown/activate', {
    token: accessToken
  });
  assert.equal(res.res.status, 404);
  assert.equal(res.json.error.code, 'RELEASE_NOT_FOUND');
});

test('publish: GET /v1/releases returns releases list', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const res = await requestJson(handler, 'GET', '/v1/releases', { token: accessToken });
  assert.equal(res.res.status, 200);
  assert.ok(Array.isArray(res.json.items));
  assert.ok(res.json.activeRelease === null || typeof res.json.activeRelease === 'string');
});

test('publish: POST /v1/publish creates publish job and returns job info', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const doc = await requestJson(handler, 'POST', '/v1/documents', {
    token: accessToken,
    body: { title: 'Publish Test', content: '<p>content</p>' }
  });

  const rev = await requestJson(handler, 'POST', `/v1/documents/${doc.json.document.id}/revisions`, {
    token: accessToken,
    body: {}
  });

  const publish = await requestJson(handler, 'POST', '/v1/publish', {
    token: accessToken,
    body: { sourceRevisionId: rev.json.revision.id }
  });
  assert.equal(publish.res.status, 201);
  assert.ok(publish.json.job.id);
  assert.equal(publish.json.job.status, 'completed');

  const jobStatus = await requestJson(handler, 'GET', `/v1/publish/${publish.json.job.id}`, { token: accessToken });
  assert.equal(jobStatus.res.status, 200);
  assert.equal(jobStatus.json.job.id, publish.json.job.id);
});
