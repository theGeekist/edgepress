import test from 'node:test';
import assert from 'node:assert/strict';
import { registerWpCoreMetaRoutes } from '../src/adapters/http/controllers/wp-core/meta.js';
import { registerWpCoreSchemaRoutes } from '../src/adapters/http/controllers/wp-core/schema.js';

function createCollector() {
  const handlers = new Map();
  return {
    add(method, path, handler) {
      handlers.set(`${method} ${path}`, handler);
    },
    get(method, path) {
      const key = `${method} ${path}`;
      const handler = handlers.get(key);
      if (!handler) throw new Error(`missing handler ${key}`);
      return handler;
    }
  };
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

test('wp-core meta routes: /users/me maps roles and registered date fallbacks', async () => {
  const routes = createCollector();
  let user = { id: 'u1', username: 'alice', role: 'admin', createdAt: 'bad-date' };

  registerWpCoreMetaRoutes({
    add: routes.add,
    runtime: { env: () => null },
    store: {},
    authzErrorResponse: (e) => json({ code: e.code || 'AUTH' }, e.status || 401),
    requireCapability: async () => user,
    json
  });

  const meHandler = routes.get('GET', '/users/me');

  const adminMe = await meHandler(new Request('http://test.local/wp/v2/users/me'));
  const adminBody = await adminMe.json();
  assert.equal(adminMe.status, 200);
  assert.deepEqual(adminBody.roles, ['administrator']);
  assert.ok(!Number.isNaN(new Date(adminBody.registered_date).getTime()));

  user = { id: 'u2', username: 'bob', roles: [' editor ', '', 'author'] };
  const explicitRes = await meHandler(new Request('http://test.local/wp/v2/users/me'));
  const explicitBody = await explicitRes.json();
  assert.deepEqual(explicitBody.roles, ['editor', 'author']);

  user = { id: 'u3', username: 'eve', role: 'custom_role' };
  const customRes = await meHandler(new Request('http://test.local/wp/v2/users/me'));
  const customBody = await customRes.json();
  assert.deepEqual(customBody.roles, ['custom_role']);
});

test('wp-core meta routes: authz errors are normalized through authzErrorResponse', async () => {
  const routes = createCollector();

  registerWpCoreMetaRoutes({
    add: routes.add,
    runtime: { env: () => null },
    store: {},
    authzErrorResponse: (e) => json({ error: e.code }, e.status),
    requireCapability: async () => {
      const err = new Error('nope');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    },
    json
  });

  const settings = routes.get('GET', '/settings');
  const res = await settings(new Request('http://test.local/wp/v2/settings'));
  const body = await res.json();
  assert.equal(res.status, 403);
  assert.equal(body.error, 'FORBIDDEN');
});

test('wp-core schema routes: /types and /taxonomies cover filters/defaults/notFound', async () => {
  const routes = createCollector();
  const store = {
    async listContentTypes() {
      return [
        { kind: 'content', slug: 'article' },
        { kind: 'system', slug: 'ignored' }
      ];
    },
    async listTaxonomies() {
      return [
        { slug: '', name: 'invalid' },
        { slug: 'genre', name: 'Genre', label: 'Genres', hierarchical: false, objectTypes: ['post'] }
      ];
    }
  };

  registerWpCoreSchemaRoutes({
    add: routes.add,
    runtime: {},
    store,
    authzErrorResponse: (e) => json({ code: e.code || 'AUTH' }, e.status || 401),
    requireCapability: async () => ({ id: 'u_admin' }),
    json,
    notFoundEntity: (entity) => json({ code: `${entity}_not_found` }, 404)
  });

  const listTypesRes = await routes.get('GET', '/types')(new Request('http://test.local/wp/v2/types'));
  const listTypesBody = await listTypesRes.json();
  assert.equal(listTypesRes.status, 200);
  assert.ok(listTypesBody.article);
  assert.ok(listTypesBody.post);
  assert.ok(listTypesBody.page);
  assert.equal(listTypesBody.ignored, undefined);

  const invalidTypeRes = await routes.get('GET', '/types/:type')(
    new Request('http://test.local/wp/v2/types/%20%20'),
    { type: '   ' }
  );
  assert.equal(invalidTypeRes.status, 404);

  const missingTypeRes = await routes.get('GET', '/types/:type')(
    new Request('http://test.local/wp/v2/types/product'),
    { type: 'product' }
  );
  assert.equal(missingTypeRes.status, 404);

  const taxRes = await routes.get('GET', '/taxonomies')(new Request('http://test.local/wp/v2/taxonomies'));
  const taxBody = await taxRes.json();
  assert.equal(taxRes.status, 200);
  assert.ok(taxBody.genre);
  assert.ok(taxBody.category);
  assert.ok(taxBody.post_tag);
});

test('wp-core meta routes: ancillary endpoints return expected shapes', async () => {
  const routes = createCollector();

  registerWpCoreMetaRoutes({
    add: routes.add,
    runtime: { env: () => null },
    store: {
      async listDocuments({ slug }) {
        if (slug) {
          return { items: [{ id: 'tpl_1', slug, title: 'Template', type: 'template' }] };
        }
        return { items: [] };
      }
    },
    authzErrorResponse: (e) => json({ code: e.code || 'AUTH' }, e.status || 401),
    requireCapability: async () => ({ id: 'u_admin' }),
    json
  });

  const categories = await routes.get('GET', '/block-patterns/categories')(
    new Request('http://test.local/wp/v2/block-patterns/categories')
  );
  assert.equal(categories.status, 200);
  assert.deepEqual(await categories.json(), []);

  const patterns = await routes.get('GET', '/block-patterns/patterns')(
    new Request('http://test.local/wp/v2/block-patterns/patterns')
  );
  assert.equal(patterns.status, 200);
  assert.deepEqual(await patterns.json(), []);

  const globalStyles = await routes.get('GET', '/global-styles/themes/:stylesheet')(
    new Request('http://test.local/wp/v2/global-styles/themes/my-theme'),
    { stylesheet: 'my-theme' }
  );
  const globalStylesBody = await globalStyles.json();
  assert.equal(globalStyles.status, 200);
  assert.equal(globalStylesBody.id, 'global-styles-my-theme');
  assert.equal(globalStylesBody.stylesheet, 'my-theme');

  const lookup = await routes.get('GET', '/templates/lookup')(
    new Request('http://test.local/wp/v2/templates/lookup?slug=my-template')
  );
  assert.equal(lookup.status, 200);
  const lookupBody = await lookup.json();
  assert.equal(lookupBody.slug, 'my-template');
  assert.equal(lookupBody.type, 'template');
});
