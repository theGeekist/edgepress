/**
 * Web-first Gutenberg integration posture.
 * - Canonical SDK-backed stores first.
 * - Avoid @wordpress/core-data for MVP CRUD.
 * - Use api-fetch middleware for auth refresh + trace propagation.
 */

import { createClient } from '../../../../../packages/sdk/src/client.js';

export function createCanonicalSdkStore(config) {
  const client = createClient(config);

  return {
    async listDocuments(query) {
      return client.listDocuments(query);
    },
    async createDocument(input) {
      return client.createDocument(input);
    },
    async updateDocument(id, input) {
      return client.updateDocument(id, input);
    },
    async deleteDocument(id, options) {
      return client.deleteDocument(id, options);
    },
    async initMedia(input) {
      return client.initMedia(input);
    },
    async finalizeMedia(id, input) {
      return client.finalizeMedia(id, input);
    },
    async listMedia(query) {
      return client.listMedia(query);
    },
    async getMedia(id) {
      return client.getMedia(id);
    },
    async updateMedia(id, input) {
      return client.updateMedia(id, input);
    },
    async deleteMedia(id) {
      return client.deleteMedia(id);
    },
    async getPreview(documentId, options) {
      return client.preview(documentId, options);
    },
    async listRevisions(documentId) {
      return client.listRevisions(documentId);
    },
    async publish(input = {}) {
      return client.publish(input);
    },
    async getPublishJob(jobId) {
      return client.getPublishJob(jobId);
    },
    async activateRelease(releaseId) {
      return client.activateRelease(releaseId);
    },
    async listReleases() {
      return client.listReleases();
    },
    async listNavigationMenus() {
      return client.listNavigationMenus();
    },
    async getNavigationMenu(key) {
      return client.getNavigationMenu(key);
    },
    async upsertNavigationMenu(key, input) {
      return client.upsertNavigationMenu(key, input);
    },
    async getPrivateRoute(routeId) {
      return client.getPrivateRoute(routeId);
    }
  };
}

function normalizeApiRoot(apiRoot) {
  if (!apiRoot) return null;
  return apiRoot.endsWith('/') ? apiRoot : `${apiRoot}/`;
}

export function createApiFetchMiddlewares({ getAccessToken, refresh }) {
  return {
    authMiddleware(options, next) {
      const token = getAccessToken?.();
      const headers = { ...(options.headers || {}) };
      if (token) headers.authorization = `Bearer ${token}`;
      return next({ ...options, headers });
    },
    async refreshMiddleware(options, next) {
      try {
        return await next(options);
      } catch (error) {
        const status = error?.status || error?.data?.status;
        if (status === 401 && refresh) {
          const refreshed = await refresh();
          if (refreshed) {
            return next(options);
          }
        }
        throw error;
      }
    },
    traceMiddleware(options, next) {
      const headers = { ...(options.headers || {}) };
      headers['x-trace-id'] = headers['x-trace-id'] || `trace_${Date.now()}`;
      return next({ ...options, headers });
    }
  };
}

export function configureApiFetch(apiFetch, { getAccessToken, refresh, apiRoot }) {
  const middlewares = createApiFetchMiddlewares({ getAccessToken, refresh });

  const root = normalizeApiRoot(apiRoot);
  // apiFetch.use prepends middleware, so register refresh last to keep it outermost.
  apiFetch.use(middlewares.authMiddleware);
  apiFetch.use(middlewares.traceMiddleware);
  if (root) {
    const rootMiddleware = apiFetch.createRootURLMiddleware(root);
    apiFetch.use(rootMiddleware);
  }
  apiFetch.use(middlewares.refreshMiddleware);

  return middlewares;
}
