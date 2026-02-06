import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { createCloudflareReferencePlatform } from '../../adapters-cloudflare/src/index.js';
import { createApiHandler } from '../../../apps/api-edge/src/app.js';
import { requestJson } from '../src/testUtils.js';

test('boundary check blocks Cloudflare terms outside adapters-cloudflare', async () => {
  const out = execSync('node scripts/check-boundaries.js', { encoding: 'utf8', cwd: process.cwd() });
  assert.match(out, /Boundary check passed/);
});

test('cloudflare reference adapter conforms to core auth + document flow', async () => {
  const platform = createCloudflareReferencePlatform({ TOKEN_KEY: 'cf-key' });
  const handler = createApiHandler(platform);

  const auth = await requestJson(handler, 'POST', '/v1/auth/token', {
    body: { username: 'admin', password: 'admin' }
  });
  assert.equal(auth.res.status, 200);
  const token = auth.json.accessToken;

  const created = await requestJson(handler, 'POST', '/v1/documents', {
    token,
    body: { title: 'CF', content: '<p>adapter</p>' }
  });
  assert.equal(created.res.status, 201);
});
