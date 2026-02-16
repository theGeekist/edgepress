import { createContentModelRoutes } from '../controllers/content/content-model.js';
import { createDocumentRoutes } from '../controllers/content/document.js';
import { createFormRoutes } from '../controllers/content/form.js';
import { createMediaRoutes } from '../controllers/content/media.js';
import { createNavigationRoutes } from '../controllers/content/navigation.js';
import { createPreviewRoutes } from '../controllers/content/preview.js';
import { createPrivateRoutes } from '../controllers/content/private.js';
import { createPublishRoutes } from '../controllers/content/publish.js';

export function createContentHttpRoutes(context) {
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
