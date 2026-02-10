import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminShell } from '../../../apps/admin-web/src/features/editor/shell.js';
import { createInMemoryPlatform } from '../src/store.js';
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

test('admin shell supports full editor-to-publish loop operations', async () => {
  const platform = createInMemoryPlatform();
  const handler = createApiHandler(platform);
  const shell = createAdminShell({
    baseUrl: 'http://api.local',
    fetchImpl: createLocalFetch(handler)
  });

  await shell.login('admin', 'admin');

  const created = await shell.createDocument({ title: 'Loop', content: '<p>v1</p>' });
  const docId = created.document.id;
  await shell.updateDocument(docId, { title: 'Loop v2', content: '<p>v2</p>' });

  const revisions = await shell.listRevisions(docId);
  assert.ok(Array.isArray(revisions.items));
  assert.ok(revisions.items.length >= 2);

  const preview = await shell.preview(docId);
  assert.ok(typeof preview.previewUrl === 'string');

  const firstPublish = await shell.publish({});
  assert.equal(firstPublish.job.status, 'completed');
  const firstRelease = firstPublish.job.releaseId;

  await shell.updateDocument(docId, { title: 'Loop v3', content: '<p>v3</p>' });
  const secondPublish = await shell.publish({});
  const secondRelease = secondPublish.job.releaseId;
  assert.notEqual(secondRelease, firstRelease);

  const activated = await shell.activateRelease(secondRelease);
  assert.equal(activated.activeRelease, secondRelease);

  const releases = await shell.listReleases();
  assert.equal(releases.activeRelease, secondRelease);

  const privateRead = await shell.verifyPrivate(docId);
  assert.equal(privateRead.releaseId, secondRelease);
  assert.equal(typeof privateRead.html, 'string');
});

test('admin shell can load and save navigation menus', async () => {
  const platform = createInMemoryPlatform();
  const handler = createApiHandler(platform);
  const shell = createAdminShell({
    baseUrl: 'http://api.local',
    fetchImpl: createLocalFetch(handler)
  });

  await shell.login('admin', 'admin');

  const initial = await shell.getNavigationMenu('primary');
  assert.equal(initial.menu.key, 'primary');
  assert.ok(Array.isArray(initial.menu.items));

  const saved = await shell.upsertNavigationMenu('primary', {
    title: 'Primary Menu',
    items: [
      { id: 'home', label: 'Home', kind: 'internal', route: 'home', order: 0 }
    ]
  });
  assert.equal(saved.menu.title, 'Primary Menu');
  assert.equal(saved.menu.items.length, 1);

  const listed = await shell.listNavigationMenus();
  assert.equal(listed.items.length, 1);
  assert.equal(listed.items[0].key, 'primary');
});
