import { createAuthHttpRoutes } from './auth.js';
import { createContentHttpRoutes } from './content.js';
import { createWpCoreHttpRoutes } from './wp-core.js';

export function createApiRoutes(context) {
  return [
    ...createAuthHttpRoutes(context),
    ...createContentHttpRoutes(context),
    ...createWpCoreHttpRoutes(context)
  ];
}
