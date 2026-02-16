import { createNotFoundEntity } from './wp-core-shared.js';
import { registerWpCoreMetaRoutes } from './wp-core-meta-routes.js';
import { registerWpCoreSchemaRoutes } from './wp-core-schema-routes.js';
import { registerWpCorePostPageRoutes } from './wp-core-post-page-routes.js';

export function createWpCoreRoutes({ runtime, store, route, authzErrorResponse, auth, http }) {
  const { requireCapability } = auth;
  const { json, readJson } = http;
  const notFoundEntity = createNotFoundEntity(json);
  const prefixes = ['/wp/v2', '/v1/wp/v2'];
  const routes = [];

  function add(method, suffix, handler) {
    for (const prefix of prefixes) {
      routes.push(route(method, `${prefix}${suffix}`, handler));
    }
  }

  routes.push(
    route('GET', '/v1', async (request) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        return json({
          name: 'GCMS Site',
          description: '',
          url: new URL(request.url).origin,
          home: new URL(request.url).origin,
          gmt_offset: 0,
          timezone_string: 'UTC',
          site_icon: 0,
          site_icon_url: '',
          site_logo: 0,
          page_for_posts: 0,
          page_on_front: 0,
          show_on_front: 'posts'
        });
      } catch (e) {
        return authzErrorResponse(e);
      }
    })
  );

  registerWpCoreMetaRoutes({ add, runtime, store, authzErrorResponse, requireCapability, json });
  registerWpCoreSchemaRoutes({ add, runtime, store, authzErrorResponse, requireCapability, json, notFoundEntity });
  registerWpCorePostPageRoutes({
    add,
    runtime,
    store,
    authzErrorResponse,
    requireCapability,
    json,
    readJson,
    notFoundEntity
  });

  return routes;
}
