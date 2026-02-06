import { createClient } from '../../../packages/sdk/src/client.js';
import { createCanonicalSdkStore } from './gutenberg-integration.js';

const SESSION_STORAGE_KEY = 'edgepress.admin.session.v1';

function canUseStorage() {
  return typeof globalThis !== 'undefined' && globalThis.window && globalThis.window.localStorage;
}

function readStoredSession() {
  if (!canUseStorage()) {
    return null;
  }
  try {
    const raw = globalThis.window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return {
      accessToken: typeof parsed.accessToken === 'string' ? parsed.accessToken : null,
      refreshToken: typeof parsed.refreshToken === 'string' ? parsed.refreshToken : null,
      user: parsed.user && typeof parsed.user === 'object' ? parsed.user : null
    };
  } catch {
    return null;
  }
}

function writeStoredSession(session) {
  if (!canUseStorage()) {
    return;
  }
  try {
    if (!session?.refreshToken) {
      globalThis.window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }
    globalThis.window.localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user
      })
    );
  } catch {
    // Intentionally ignore storage errors and keep session in-memory.
  }
}

/**
 * Canonical admin shell state and actions. This stays contract-driven and
 * avoids WP-specific stores for CRUD operations.
 */
export function createAdminShell({ baseUrl, fetchImpl = fetch }) {
  const restored = readStoredSession();
  const session = {
    accessToken: restored?.accessToken || null,
    refreshToken: restored?.refreshToken || null,
    user: restored?.user || null
  };

  async function refreshSession(client) {
    if (!session.refreshToken) return false;
    const refreshed = await client.refresh({ refreshToken: session.refreshToken });
    session.accessToken = refreshed.accessToken;
    session.refreshToken = refreshed.refreshToken;
    if (refreshed.user) {
      session.user = refreshed.user;
    }
    writeStoredSession(session);
    return true;
  }

  async function clearSession() {
    session.accessToken = null;
    session.refreshToken = null;
    session.user = null;
    writeStoredSession(session);
  }

  const client = createClient({
    baseUrl,
    fetchImpl,
    getAccessToken: () => session.accessToken,
    onTokenRefresh: async () => refreshSession(client),
    onAuthFailure: clearSession
  });

  const store = createCanonicalSdkStore({
    baseUrl,
    fetchImpl,
    getAccessToken: () => session.accessToken,
    onTokenRefresh: async () => refreshSession(client),
    onAuthFailure: clearSession
  });

  return {
    session,
    async refreshSession() {
      return refreshSession(client);
    },
    async login(username, password) {
      const payload = await client.token({ username, password });
      session.accessToken = payload.accessToken;
      session.refreshToken = payload.refreshToken;
      session.user = payload.user;
      writeStoredSession(session);
      return payload.user;
    },
    async logout() {
      if (session.refreshToken) {
        await client.logout({ refreshToken: session.refreshToken });
      }
      await clearSession();
    },
    async listDocuments(query) {
      return store.listDocuments(query);
    },
    async createDocument(input) {
      return store.createDocument(input);
    },
    async updateDocument(id, input) {
      return store.updateDocument(id, input);
    },
    async deleteDocument(id, options) {
      return store.deleteDocument(id, options);
    },
    async preview(documentId) {
      return store.getPreview(documentId);
    },
    async listRevisions(documentId) {
      return store.listRevisions(documentId);
    },
    async publish(input = {}) {
      return store.publish(input);
    },
    async getPublishJob(jobId) {
      return store.getPublishJob(jobId);
    },
    async activateRelease(releaseId) {
      return store.activateRelease(releaseId);
    },
    async listReleases() {
      return store.listReleases();
    },
    async verifyPrivate(routeId) {
      return store.getPrivateRoute(routeId);
    }
  };
}
