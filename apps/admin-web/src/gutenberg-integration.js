/**
 * Web-first Gutenberg integration posture.
 * - Canonical SDK-backed stores first.
 * - Avoid @wordpress/core-data for MVP CRUD.
 * - Use api-fetch middleware for auth refresh + trace propagation.
 */

import { createClient } from '../../../packages/sdk/src/client.js';

export function createCanonicalSdkStore(config) {
  const client = createClient(config);

  return {
    async listDocuments() {
      return client.listDocuments();
    },
    async createDocument(input) {
      return client.createDocument(input);
    },
    async updateDocument(id, input) {
      return client.updateDocument(id, input);
    },
    async initMedia(input) {
      return client.initMedia(input);
    },
    async finalizeMedia(id, input) {
      return client.finalizeMedia(id, input);
    },
    async getPreview(documentId) {
      return client.preview(documentId);
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
  if (root) {
    const rootMiddleware = apiFetch.createRootURLMiddleware(root);
    apiFetch.use(rootMiddleware);
  }

  // Register refresh first so it wraps downstream middleware and retries cleanly.
  apiFetch.use(middlewares.refreshMiddleware);
  apiFetch.use(middlewares.authMiddleware);
  apiFetch.use(middlewares.traceMiddleware);

  return middlewares;
}
