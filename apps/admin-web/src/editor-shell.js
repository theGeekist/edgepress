import { createClient } from '../../../packages/sdk/src/client.js';
import { createCanonicalSdkStore } from './gutenberg-integration.js';

/**
 * Canonical admin shell state and actions. This stays contract-driven and
 * avoids WP-specific stores for CRUD operations.
 */
export function createAdminShell({ baseUrl, fetchImpl = fetch }) {
  const session = {
    accessToken: null,
    refreshToken: null,
    user: null
  };

  const client = createClient({
    baseUrl,
    fetchImpl,
    getAccessToken: () => session.accessToken,
    onTokenRefresh: async () => {
      if (!session.refreshToken) return false;
      const refreshed = await client.refresh({ refreshToken: session.refreshToken });
      session.accessToken = refreshed.accessToken;
      session.refreshToken = refreshed.refreshToken;
      return true;
    },
    onAuthFailure: async () => {
      session.accessToken = null;
      session.refreshToken = null;
      session.user = null;
    }
  });

  const store = createCanonicalSdkStore({
    baseUrl,
    fetchImpl,
    getAccessToken: () => session.accessToken,
    onTokenRefresh: async () => {
      if (!session.refreshToken) return false;
      const refreshed = await client.refresh({ refreshToken: session.refreshToken });
      session.accessToken = refreshed.accessToken;
      session.refreshToken = refreshed.refreshToken;
      return true;
    },
    onAuthFailure: async () => {
      session.accessToken = null;
      session.refreshToken = null;
      session.user = null;
    }
  });

  return {
    session,
    async login(username, password) {
      const payload = await client.token({ username, password });
      session.accessToken = payload.accessToken;
      session.refreshToken = payload.refreshToken;
      session.user = payload.user;
      return payload.user;
    },
    async logout() {
      if (session.refreshToken) {
        await client.logout({ refreshToken: session.refreshToken });
      }
      session.accessToken = null;
      session.refreshToken = null;
      session.user = null;
    },
    async listDocuments() {
      return store.listDocuments();
    },
    async createDocument(input) {
      return store.createDocument(input);
    },
    async updateDocument(id, input) {
      return store.updateDocument(id, input);
    },
    async preview(documentId) {
      return store.getPreview(documentId);
    }
  };
}
