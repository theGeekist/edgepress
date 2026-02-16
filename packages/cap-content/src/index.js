import { createDocumentRoutes } from './document-routes.js';
import { createContentModelRoutes } from './content-model-routes.js';
import { createFormRoutes } from './form-routes.js';
import { createPublishRoutes } from './publish-routes.js';
import { createPreviewRoutes } from './preview-routes.js';

export {
  createDocumentRoutes,
  createContentModelRoutes,
  createFormRoutes,
  createPublishRoutes,
  createPreviewRoutes
};

export function createContentRoutes(context) {
  return [
    ...createDocumentRoutes(context),
    ...createContentModelRoutes(context),
    ...createFormRoutes(context),
    ...createPublishRoutes(context),
    ...createPreviewRoutes(context)
  ];
}
