import { createWpCoreRoutes as createWpCoreCapabilityRoutes } from '@geekist/edgepress/cap-wp-core';
import { requireCapability } from '../auth.js';
import { json, readJson } from '../http.js';

export function createWpCoreRoutes(context) {
  return createWpCoreCapabilityRoutes({
    ...context,
    auth: { requireCapability },
    http: { json, readJson }
  });
}
