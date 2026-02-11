import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiHandler } from '../../../apps/api/src/app.js';
import { createInMemoryPlatform } from '../src/store.js';
import { authAsAdmin, requestJson } from '../src/testUtils.js';

test('preview: preview route handles themeVars parameter validation', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const created = await requestJson(handler, 'POST', '/v1/documents', {
    token: accessToken,
    body: { title: 'Preview Test', content: '<p>content</p>' }
  });

  const valid = await requestJson(handler, 'GET', `/v1/preview/${created.json.document.id}?themeVars=` + encodeURIComponent(JSON.stringify({
    '--ep-color': '#000'
  })), { token: accessToken });
  assert.equal(valid.res.status, 200);
  assert.ok(valid.json.previewUrl);

  const existing = await requestJson(handler, 'GET', `/v1/preview/${created.json.document.id}`, { token: accessToken });
  assert.equal(existing.res.status, 200);

  const largePayload = '--ep-x:'.repeat(10000);
  const oversized = await requestJson(handler, 'GET', `/v1/preview/${created.json.document.id}?themeVars=${largePayload}`, { token: accessToken });
  // Oversized/invalid themeVars are intentionally ignored (best-effort), not request-fatal.
  assert.equal(oversized.res.status, 200);
});

test('preview: preview route requires valid signature', async () => {
  const platform = createInMemoryPlatform();
  const { handler, accessToken } = await authAsAdmin(platform);

  const created = await requestJson(handler, 'POST', '/v1/documents', {
    token: accessToken,
    body: { title: 'Preview Test', content: '<p>content</p>' }
  });

  const previewRes = await requestJson(handler, 'GET', `/v1/preview/${created.json.document.id}`, { token: accessToken });
  const previewUrl = new URL(`http://test.local${previewRes.json.previewUrl}`);
  const token = previewUrl.pathname.split('/').pop();

  const missingSig = await handler(new Request(`http://test.local/preview/${token}`));
  assert.equal(missingSig.status, 401);
  const missingSigBody = await missingSig.json();
  assert.equal(missingSigBody.error.code, 'PREVIEW_TOKEN_INVALID');

  const invalidSig = await handler(new Request(`http://test.local/preview/${token}?sig=invalid`));
  assert.equal(invalidSig.status, 401);
});

test('preview: preview route handles non-existent preview token', async () => {
  const platform = createInMemoryPlatform();
  const handler = createApiHandler(platform);

  const res = await handler(new Request('http://test.local/preview/prv_missing?sig=abc'));
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.error.code, 'PREVIEW_NOT_FOUND');
});
