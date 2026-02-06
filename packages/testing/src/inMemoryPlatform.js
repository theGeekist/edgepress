import crypto from 'node:crypto';
import {
  createDocument,
  createFormSubmission,
  createMediaAssetSession,
  createPublishJob,
  createRevision,
  createUser,
  finalizeMediaAsset
} from '../../domain/src/entities.js';

export function createInMemoryPlatform() {
  const state = {
    users: new Map(),
    refreshTokens: new Map(),
    documents: new Map(),
    revisions: new Map(),
    revisionsByDoc: new Map(),
    media: new Map(),
    publishJobs: new Map(),
    releases: new Map(),
    releaseHistory: [],
    activeRelease: null,
    blobs: new Map(),
    cache: new Map(),
    previews: new Map(),
    forms: new Map(),
    navigationMenus: new Map(),
    rateLimitHits: new Map()
  };

  const runtime = {
    envOverrides: {},
    env(key) {
      if (key === 'TOKEN_KEY') return 'dev-token-key';
      if (Object.prototype.hasOwnProperty.call(this.envOverrides, key)) {
        return this.envOverrides[key];
      }
      return process.env[key];
    },
    now() {
      return new Date();
    },
    uuid() {
      return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    },
    log(level, event, meta) {
      if (process.env.NODE_ENV !== 'test') {
        console.log(`[${level}] ${event}`, meta || {});
      }
    },
    requestContext(request) {
      const url = request ? new URL(request.url) : null;
      return {
        traceId: request?.headers.get('x-trace-id') || this.uuid(),
        ipHash: request?.headers.get('x-ip-hash') || 'ip_local',
        userAgentHash: request?.headers.get('x-ua-hash') || 'ua_local',
        requestId: url ? `${url.pathname}:${Date.now()}` : `req:${Date.now()}`
      };
    },
    waitUntil(promise) {
      promise.catch((err) => this.log('error', 'waitUntil_failure', { message: err.message }));
    },
    async hmacSign(input, keyRef = 'TOKEN_KEY') {
      const key = this.env(keyRef) || 'fallback';
      return crypto.createHmac('sha256', key).update(input).digest('hex');
    },
    async hmacVerify(input, signature, keyRef = 'TOKEN_KEY') {
      const signed = await this.hmacSign(input, keyRef);
      return signed === signature;
    },
    async rateLimit(key, policy = { max: 10, windowMs: 60000 }) {
      const now = Date.now();
      const entry = state.rateLimitHits.get(key) || [];
      const filtered = entry.filter((ts) => now - ts < policy.windowMs);
      if (filtered.length >= policy.max) {
        return { allowed: false, retryAfter: Math.ceil(policy.windowMs / 1000) };
      }
      filtered.push(now);
      state.rateLimitHits.set(key, filtered);
      return { allowed: true };
    },
    base64urlEncode(value) {
      const payload = typeof value === 'string' ? value : JSON.stringify(value);
      return Buffer.from(payload, 'utf8').toString('base64url');
    },
    base64urlDecode(value) {
      return Buffer.from(value, 'base64url').toString('utf8');
    }
  };

  const store = {
    async tx(fn) {
      return fn(this);
    },
    async seedUser(user) {
      state.users.set(user.id, user);
    },
    async getUserByUsername(username) {
      for (const user of state.users.values()) {
        if (user.username === username) return user;
      }
      return null;
    },
    async getUserById(id) {
      return state.users.get(id) || null;
    },
    async saveRefreshToken(token, userId) {
      state.refreshTokens.set(token, userId);
    },
    async getRefreshTokenUser(token) {
      return state.refreshTokens.get(token) || null;
    },
    async revokeRefreshToken(token) {
      state.refreshTokens.delete(token);
    },
    async listDocuments(query) {
      const all = Array.from(state.documents.values());
      if (!query) {
        return {
          items: all,
          pagination: {
            page: 1,
            pageSize: all.length || 1,
            totalItems: all.length,
            totalPages: 1
          }
        };
      }
      const q = String(query.q || '').trim().toLowerCase();
      const type = query.type || 'all';
      const status = query.status || 'all';
      const sortBy = query.sortBy || 'updatedAt';
      const sortDir = query.sortDir === 'asc' ? 'asc' : 'desc';
      const page = Math.max(1, Number(query.page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

        const filtered = all.filter((doc) => {
          if (status !== 'all' && doc.status !== status) return false;
          const docType = doc.type || 'page';
          if (type !== 'all' && docType !== type) return false;
          if (q && !String(doc.title || '').toLowerCase().includes(q)) return false;
          return true;
        });

      filtered.sort((a, b) => {
        const av = String(a?.[sortBy] || '');
        const bv = String(b?.[sortBy] || '');
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      });

      const totalItems = filtered.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
      const safePage = Math.min(page, totalPages);
      const start = (safePage - 1) * pageSize;
      const items = filtered.slice(start, start + pageSize);
      return {
        items,
        pagination: {
          page: safePage,
          pageSize,
          totalItems,
          totalPages
        }
      };
    },
    async getDocument(id) {
      return state.documents.get(id) || null;
    },
    async createDocument(input) {
      const now = runtime.now().toISOString();
      const doc = createDocument({ ...input, now });
      state.documents.set(doc.id, doc);
      return doc;
    },
    async updateDocument(id, input) {
      const existing = state.documents.get(id);
      if (!existing) return null;
      const updated = {
        ...existing,
        ...input,
        updatedAt: runtime.now().toISOString()
      };
      state.documents.set(id, updated);
      return updated;
    },
    async deleteDocument(id, { permanent = false } = {}) {
      const existing = state.documents.get(id);
      if (!existing) return null;
      if (!permanent) {
        const updated = {
          ...existing,
          status: 'trash',
          updatedAt: runtime.now().toISOString()
        };
        state.documents.set(id, updated);
        return updated;
      }

      state.documents.delete(id);
      const revisionIds = state.revisionsByDoc.get(id) || [];
      for (const revisionId of revisionIds) {
        state.revisions.delete(revisionId);
      }
      state.revisionsByDoc.delete(id);
      return { id };
    },
    async listRevisions(documentId) {
      const ids = state.revisionsByDoc.get(documentId) || [];
      return ids.map((id) => state.revisions.get(id));
    },
    async getRevision(id) {
      return state.revisions.get(id) || null;
    },
    async createRevision(input) {
      const now = runtime.now().toISOString();
      const revision = createRevision({ ...input, now });
      state.revisions.set(revision.id, revision);
      const ids = state.revisionsByDoc.get(revision.documentId) || [];
      ids.push(revision.id);
      state.revisionsByDoc.set(revision.documentId, ids);
      return revision;
    },
    async createMediaSession(input) {
      const now = runtime.now().toISOString();
      const media = createMediaAssetSession({ ...input, now });
      state.media.set(media.id, media);
      return media;
    },
    async finalizeMedia(id, input) {
      const existing = state.media.get(id);
      if (!existing) return null;
      const now = runtime.now().toISOString();
      const finalized = finalizeMediaAsset(existing, input, now);
      state.media.set(id, finalized);
      return finalized;
    },
    async getMedia(id) {
      return state.media.get(id) || null;
    },
    async createPublishJob(input) {
      const now = runtime.now().toISOString();
      const job = createPublishJob({ ...input, now });
      state.publishJobs.set(job.id, job);
      return job;
    },
    async updatePublishJob(id, patch) {
      const existing = state.publishJobs.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...patch, updatedAt: runtime.now().toISOString() };
      state.publishJobs.set(id, updated);
      return updated;
    },
    async getPublishJob(id) {
      return state.publishJobs.get(id) || null;
    },
    async createFormSubmission(input) {
      const now = runtime.now().toISOString();
      const submission = createFormSubmission({ ...input, now });
      state.forms.set(submission.id, submission);
      return submission;
    },
    async listNavigationMenus() {
      return Array.from(state.navigationMenus.values());
    },
    async getNavigationMenu(key) {
      return state.navigationMenus.get(key) || null;
    },
    async upsertNavigationMenu(menu) {
      const normalized = {
        ...menu,
        key: String(menu?.key || '').trim(),
        updatedAt: runtime.now().toISOString()
      };
      state.navigationMenus.set(normalized.key, normalized);
      return normalized;
    }
  };

  const blobStore = {
    async putBlob(path, bytes, metadata = {}) {
      state.blobs.set(path, { bytes, metadata });
      return { path, ...metadata };
    },
    async getBlob(path) {
      return state.blobs.get(path) || null;
    },
    async signedReadUrl(path, ttlSeconds = 300) {
      return `/blob/${encodeURIComponent(path)}?ttl=${ttlSeconds}`;
    }
  };

  const cacheStore = {
    async get(key) {
      const item = state.cache.get(key);
      if (!item) return null;
      if (item.expiresAt <= Date.now()) {
        state.cache.delete(key);
        return null;
      }
      return item.value;
    },
    async set(key, value, ttlSeconds = 60) {
      state.cache.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000
      });
    },
    async del(key) {
      state.cache.delete(key);
    }
  };

  const releaseStore = {
    async writeArtifact(releaseId, route, bytes, contentType = 'text/html') {
      const path = `${releaseId}/${route}.html`;
      await blobStore.putBlob(path, bytes, { contentType });
      state.releaseHistory.push({
        type: 'artifact_written',
        releaseId,
        route,
        path,
        at: runtime.now().toISOString()
      });
      return {
        releaseId,
        route,
        path,
        contentType
      };
    },
    async writeManifest(releaseId, manifest) {
      if (state.releases.has(releaseId)) {
        throw new Error('ReleaseManifest is immutable and already exists for this releaseId');
      }
      state.releases.set(releaseId, manifest);
      state.releaseHistory.push({
        type: 'manifest_written',
        releaseId,
        at: runtime.now().toISOString()
      });
    },
    async getManifest(releaseId) {
      return state.releases.get(releaseId) || null;
    },
    async listReleases() {
      return Array.from(state.releases.values());
    },
    async activateRelease(releaseId) {
      if (!state.releases.has(releaseId)) {
        throw new Error('Unknown releaseId');
      }
      const previousReleaseId = state.activeRelease;
      if (previousReleaseId === releaseId) {
        return state.activeRelease;
      }
      state.activeRelease = releaseId;
      state.releaseHistory.push({
        type: 'activated',
        releaseId,
        previousReleaseId,
        at: runtime.now().toISOString()
      });
      return state.activeRelease;
    },
    async getActiveRelease() {
      return state.activeRelease;
    },
    async getReleaseHistory() {
      return state.releaseHistory.slice();
    }
  };

  const previewStore = {
    async createPreview(input) {
      state.previews.set(input.previewToken, input);
      return input;
    },
    async getPreview(previewToken) {
      return state.previews.get(previewToken) || null;
    }
  };

  const coordination = {
    async acquireLock(name) {
      return { token: `lock:${name}` };
    },
    async releaseLock() {}
  };

  store.seedUser(createUser({ id: 'u_admin', username: 'admin', password: 'admin', role: 'admin' }));

  return { runtime, store, blobStore, cacheStore, releaseStore, previewStore, coordination, state };
}
