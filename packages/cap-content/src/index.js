import { createDocumentRoutes } from './document-routes.js';
import { createPublishRoutes } from './publish-routes.js';
import { createPreviewRoutes } from './preview-routes.js';

export { createDocumentRoutes, createPublishRoutes, createPreviewRoutes };

export function createContentRoutes(context) {
  return [
    ...createDocumentRoutes(context),
    ...createPublishRoutes(context),
    ...createPreviewRoutes(context)
  ];
}
