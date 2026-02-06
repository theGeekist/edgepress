import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminShell } from '../../../apps/admin-web/src/editor-shell.js';
import { createInMemoryPlatform } from '../src/inMemoryPlatform.js';
import { createApiHandler } from '../../../apps/api-edge/src/app.js';

function createLocalFetch(handler) {
  return async (url, init = {}) => {
    const request = new Request(url, {
      method: init.method || 'GET',
      headers: init.headers,
      body: init.body
    });
    return handler(request);
  };
}

test('admin shell login + CRUD uses canonical SDK client', async () => {
  const platform = createInMemoryPlatform();
  const handler = createApiHandler(platform);
  const shell = createAdminShell({
    baseUrl: 'http://api.local',
    fetchImpl: createLocalFetch(handler)
  });

  const user = await shell.login('admin', 'admin');
  assert.equal(user.username, 'admin');
  assert.ok(shell.session.accessToken);

  await shell.createDocument({ title: 'Shell', content: '<p>doc</p>' });
  const listed = await shell.listDocuments();
  assert.equal(listed.items.length, 1);

  await shell.logout();
  assert.equal(shell.session.accessToken, null);
});

test('admin shell auto-refreshes on expired access token', async () => {
  const platform = createInMemoryPlatform();
  const handler = createApiHandler(platform);
  const shell = createAdminShell({
    baseUrl: 'http://api.local',
    fetchImpl: createLocalFetch(handler)
  });

  await shell.login('admin', 'admin');
  const previous = shell.session.accessToken;
  shell.session.accessToken = 'bad.token';

  const listed = await shell.listDocuments();
  assert.ok(Array.isArray(listed.items));
  assert.notEqual(shell.session.accessToken, 'bad.token');
  assert.notEqual(shell.session.accessToken, previous);
});

test('admin shell refresh/logout handle empty session safely', async () => {
  const platform = createInMemoryPlatform();
  const handler = createApiHandler(platform);
  const shell = createAdminShell({
    baseUrl: 'http://api.local',
    fetchImpl: createLocalFetch(handler)
  });

  const refreshed = await shell.refreshSession();
  assert.equal(refreshed, false);

  await shell.logout();
  assert.equal(shell.session.accessToken, null);
  assert.equal(shell.session.refreshToken, null);
  assert.equal(shell.session.user, null);
});
