import test from 'node:test';
import assert from 'node:assert/strict';

import { applyDocumentQuery, applyMediaQuery } from '../../cloudflare/src/shared/query.js';
import { createCloudflareRuntime } from '../../cloudflare/src/runtime.js';

test('cloudflare shared query helpers cover branch paths', () => {
  const docs = [
    { id: 'a', title: 'Alpha', type: 'post', status: 'draft', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'b', title: 'Beta', type: 'page', status: 'publish', updatedAt: '2026-01-02T00:00:00.000Z' }
  ];
  const q1 = applyDocumentQuery(docs);
  assert.equal(q1.items.length, 2);
  const q2 = applyDocumentQuery(docs, { type: 'post', status: 'draft', q: 'alp', sortDir: 'asc', page: 9, pageSize: 1 });
  assert.equal(q2.items.length, 1);
  assert.equal(q2.pagination.page, 1);

  const media = [
    { id: 'm1', filename: 'a.jpg', mimeType: 'image/jpeg', status: 'ready', updatedAt: '2', alt: 'hero' },
    { id: 'm2', filename: 'b.png', mimeType: 'image/png', status: 'pending', updatedAt: '1' }
  ];
  const mq = applyMediaQuery(media, { q: 'hero', mimeType: 'image/jpeg', sortDir: 'desc', page: 1, pageSize: 10 });
  assert.equal(mq.items.length, 1);
  assert.equal(mq.items[0].id, 'm1');
});

test('cloudflare runtime covers secret errors and waitUntil branches', async () => {
  const waitUntilCalls = [];
  const baseRuntime = {
    waitUntil: (p) => waitUntilCalls.push(p),
    base64urlEncode: (v) => Buffer.from(v).toString('base64url'),
    base64urlDecode: (v) => Buffer.from(v, 'base64url').toString('utf8')
  };
  const runtimeWithCtx = createCloudflareRuntime({
    baseRuntime,
    env: { TOKEN_KEY: 'secret' },
    ctx: { waitUntil: (p) => waitUntilCalls.push(`ctx:${String(Boolean(p))}`) }
  });
  const sig = await runtimeWithCtx.hmacSign('abc');
  assert.equal(typeof sig, 'string');
  runtimeWithCtx.waitUntil(Promise.resolve());
  assert.equal(waitUntilCalls.length, 1);

  const runtimeNoCtx = createCloudflareRuntime({ baseRuntime, env: {}, ctx: null });
  await assert.rejects(() => runtimeNoCtx.hmacSign('abc'), /Missing required runtime secret/);
  runtimeNoCtx.waitUntil(Promise.resolve());
  assert.equal(waitUntilCalls.length, 2);
});
