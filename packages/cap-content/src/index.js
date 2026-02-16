import { createDocumentRoutes } from './document-routes.js';
import { createContentModelRoutes } from './content-model-routes.js';
import { createFormRoutes } from './form-routes.js';
import { createMediaRoutes } from './media-routes.js';
import { createNavigationRoutes } from './navigation-routes.js';
import { createPrivateRoutes } from './private-routes.js';
import { createPublishRoutes } from './publish-routes.js';
import { createPreviewRoutes } from './preview-routes.js';

export {
  createDocumentRoutes,
  createContentModelRoutes,
  createFormRoutes,
  createMediaRoutes,
  createNavigationRoutes,
  createPrivateRoutes,
  createPublishRoutes,
  createPreviewRoutes
};

export function createContentRoutes(context) {
  return [
    ...createDocumentRoutes(context),
    ...createContentModelRoutes(context),
    ...createFormRoutes(context),
    ...createMediaRoutes(context),
    ...createNavigationRoutes(context),
    ...createPrivateRoutes(context),
    ...createPublishRoutes(context),
    ...createPreviewRoutes(context)
  ];
}
