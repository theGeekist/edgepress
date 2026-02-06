import {
  createDocument,
  createFormSubmission,
  createMediaAssetSession,
  createPublishJob,
  createRevision,
  createUser,
  finalizeMediaAsset
} from '../../domain/src/entities.js';

export function createAppStores({
  d1,
  kv,
  runtime,
  baseStore,
  basePreviewStore,
  D1_SQL,
  parseJsonSafe,
  kvGetJson,
  kvPutJson,
  kvGetString,
  kvPutString,
  bootstrapAdmin
}) {
  function applyDocumentQuery(allDocuments, query) {
    const all = Array.isArray(allDocuments) ? allDocuments : [];
    const pageSizeDefault = Math.min(100, Math.max(1, Number(query?.pageSize) || 20));
    if (!query) {
      return {
        items: all,
        pagination: {
          page: 1,
          pageSize: pageSizeDefault,
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
    const pageSize = pageSizeDefault;

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
      pagination: { page: safePage, pageSize, totalItems, totalPages }
    };
  }

  const bootstrapUser = bootstrapAdmin
    ? createUser({
        id: 'u_admin',
        username: bootstrapAdmin.username,
        password: bootstrapAdmin.password,
        role: bootstrapAdmin.role || 'admin'
      })
    : null;

  function appKey(...parts) {
    return `app:${parts.join(':')}`;
  }

  async function kvIndexAdd(key, value) {
    const items = (await kvGetJson(key)) || [];
    if (items.includes(value)) return;
    items.push(value);
    await kvPutJson(key, items);
  }

  async function kvSeedUser(user) {
    await kvPutJson(appKey('user', user.id), user);
    await kvPutString(appKey('user_by_username', user.username), user.id);
    await kvIndexAdd(appKey('users'), user.id);
  }

  let kvSeededPromise = null;
  async function ensureKvSeeded() {
    if (!kv?.get || !kv?.put) return;
    if (!kvSeededPromise) {
      kvSeededPromise = (async () => {
        if (!bootstrapUser) return;
        const existing = await kvGetJson(appKey('user', bootstrapUser.id));
        if (existing) return;
        await kvSeedUser(bootstrapUser);
      })();
    }
    await kvSeededPromise;
  }

  let d1AppSchemaReady = false;
  async function ensureD1AppSchema() {
    if (!d1 || d1AppSchemaReady) return;
    await d1.exec(D1_SQL.createAppUsers);
    await d1.exec(D1_SQL.createAppRefreshTokens);
    await d1.exec(D1_SQL.createAppDocuments);
    await d1.exec(D1_SQL.createAppRevisions);
    await d1.exec(D1_SQL.createAppMedia);
    await d1.exec(D1_SQL.createAppPublishJobs);
    await d1.exec(D1_SQL.createAppFormSubmissions);
    await d1.exec(D1_SQL.createAppPreviews);
    await d1.exec(D1_SQL.createAppNavigationMenus);
    await d1.exec(D1_SQL.createIdxRevisionsDocument);
    await d1.exec(D1_SQL.createIdxFormsFormId);
    await d1.exec(D1_SQL.createIdxPreviewsExpiresAt);
    await d1.exec(D1_SQL.createIdxNavigationMenusUpdatedAt);
    if (bootstrapUser) {
      await d1
        .prepare(D1_SQL.upsertUser)
        .bind(bootstrapUser.id, bootstrapUser.username, JSON.stringify(bootstrapUser))
        .run();
    }
    d1AppSchemaReady = true;
  }

  function createD1Store() {
    return {
      async tx(fn) {
        await ensureD1AppSchema();
        return fn(this);
      },
      async seedUser(user) {
        await ensureD1AppSchema();
        await d1.prepare(D1_SQL.upsertUser).bind(user.id, user.username, JSON.stringify(user)).run();
      },
      async getUserByUsername(username) {
        await ensureD1AppSchema();
        const row = await d1.prepare(D1_SQL.selectUserByUsername).bind(username).first();
        return parseJsonSafe(row?.user_json);
      },
      async getUserById(id) {
        await ensureD1AppSchema();
        const row = await d1.prepare(D1_SQL.selectUserById).bind(id).first();
        return parseJsonSafe(row?.user_json);
      },
      async saveRefreshToken(token, userId) {
        await ensureD1AppSchema();
        await d1.prepare(D1_SQL.upsertRefreshToken).bind(token, userId).run();
      },
      async getRefreshTokenUser(token) {
        await ensureD1AppSchema();
        const row = await d1.prepare(D1_SQL.selectRefreshTokenUser).bind(token).first();
        return row?.user_id || null;
      },
      async revokeRefreshToken(token) {
        await ensureD1AppSchema();
        await d1.prepare(D1_SQL.deleteRefreshToken).bind(token).run();
      },
      async listDocuments(query) {
        await ensureD1AppSchema();
        const rows = await d1.prepare(D1_SQL.selectDocuments).all();
        const all = (rows.results || []).map((entry) => parseJsonSafe(entry.document_json)).filter(Boolean);
        return applyDocumentQuery(all, query);
      },
      async getDocument(id) {
        await ensureD1AppSchema();
        const row = await d1.prepare(D1_SQL.selectDocumentById).bind(id).first();
        return parseJsonSafe(row?.document_json);
      },
      async createDocument(input) {
        await ensureD1AppSchema();
        const now = runtime.now().toISOString();
        const doc = createDocument({ ...input, now });
        await d1.prepare(D1_SQL.upsertDocument).bind(doc.id, JSON.stringify(doc), doc.updatedAt).run();
        return doc;
      },
      async updateDocument(id, input) {
        await ensureD1AppSchema();
        const existing = await this.getDocument(id);
        if (!existing) return null;
        const updated = {
          ...existing,
          ...input,
          updatedAt: runtime.now().toISOString()
        };
        await d1.prepare(D1_SQL.upsertDocument).bind(updated.id, JSON.stringify(updated), updated.updatedAt).run();
        return updated;
      },
      async deleteDocument(id, { permanent = false } = {}) {
        await ensureD1AppSchema();
        const existing = await this.getDocument(id);
        if (!existing) return null;
        if (!permanent) {
          return this.updateDocument(id, { status: 'trash' });
        }

        await d1.batch([
          d1.prepare(D1_SQL.deleteRevisionsByDocument).bind(id),
          d1.prepare(D1_SQL.deleteDocumentById).bind(id)
        ]);
        return { id };
      },
      async listRevisions(documentId) {
        await ensureD1AppSchema();
        const rows = await d1.prepare(D1_SQL.selectRevisionsByDocument).bind(documentId).all();
        return (rows.results || []).map((entry) => parseJsonSafe(entry.revision_json)).filter(Boolean);
      },
      async getRevision(id) {
        await ensureD1AppSchema();
        const row = await d1.prepare(D1_SQL.selectRevisionById).bind(id).first();
        return parseJsonSafe(row?.revision_json);
      },
      async createRevision(input) {
        await ensureD1AppSchema();
        const now = runtime.now().toISOString();
        const revision = createRevision({ ...input, now });
        await d1
          .prepare(D1_SQL.upsertRevision)
          .bind(revision.id, revision.documentId, JSON.stringify(revision), revision.createdAt)
          .run();
        return revision;
      },
      async createMediaSession(input) {
        await ensureD1AppSchema();
        const now = runtime.now().toISOString();
        const media = createMediaAssetSession({ ...input, now });
        await d1.prepare(D1_SQL.upsertMedia).bind(media.id, JSON.stringify(media), media.updatedAt).run();
        return media;
      },
      async finalizeMedia(id, input) {
        await ensureD1AppSchema();
        const existing = await this.getMedia(id);
        if (!existing) return null;
        const now = runtime.now().toISOString();
        const finalized = finalizeMediaAsset(existing, input, now);
        await d1.prepare(D1_SQL.upsertMedia).bind(finalized.id, JSON.stringify(finalized), finalized.updatedAt).run();
        return finalized;
      },
      async getMedia(id) {
        await ensureD1AppSchema();
        const row = await d1.prepare(D1_SQL.selectMediaById).bind(id).first();
        return parseJsonSafe(row?.media_json);
      },
      async createPublishJob(input) {
        await ensureD1AppSchema();
        const now = runtime.now().toISOString();
        const job = createPublishJob({ ...input, now });
        await d1.prepare(D1_SQL.upsertPublishJob).bind(job.id, JSON.stringify(job), job.updatedAt).run();
        return job;
      },
      async updatePublishJob(id, patch) {
        await ensureD1AppSchema();
        const existing = await this.getPublishJob(id);
        if (!existing) return null;
        const updated = { ...existing, ...patch, updatedAt: runtime.now().toISOString() };
        await d1.prepare(D1_SQL.upsertPublishJob).bind(updated.id, JSON.stringify(updated), updated.updatedAt).run();
        return updated;
      },
      async getPublishJob(id) {
        await ensureD1AppSchema();
        const row = await d1.prepare(D1_SQL.selectPublishJobById).bind(id).first();
        return parseJsonSafe(row?.publish_job_json);
      },
      async createFormSubmission(input) {
        await ensureD1AppSchema();
        const now = runtime.now().toISOString();
        const submission = createFormSubmission({ ...input, now });
        await d1
          .prepare(D1_SQL.upsertFormSubmission)
          .bind(submission.id, submission.formId, JSON.stringify(submission), submission.createdAt)
          .run();
        return submission;
      },
      async listNavigationMenus() {
        await ensureD1AppSchema();
        const rows = await d1.prepare(D1_SQL.selectNavigationMenus).all();
        return (rows.results || []).map((entry) => parseJsonSafe(entry.menu_json)).filter(Boolean);
      },
      async getNavigationMenu(key) {
        await ensureD1AppSchema();
        const row = await d1.prepare(D1_SQL.selectNavigationMenuByKey).bind(key).first();
        return parseJsonSafe(row?.menu_json);
      },
      async upsertNavigationMenu(menu) {
        await ensureD1AppSchema();
        const key = String(menu?.key || '').trim();
        const updated = { ...menu, key, updatedAt: runtime.now().toISOString() };
        await d1.prepare(D1_SQL.upsertNavigationMenu).bind(key, JSON.stringify(updated), updated.updatedAt).run();
        return updated;
      }
    };
  }

  function createKvStore() {
    return {
      async tx(fn) {
        await ensureKvSeeded();
        return fn(this);
      },
      async seedUser(user) {
        await ensureKvSeeded();
        await kvSeedUser(user);
      },
      async getUserByUsername(username) {
        await ensureKvSeeded();
        const userId = await kvGetString(appKey('user_by_username', username));
        if (!userId) return null;
        return kvGetJson(appKey('user', userId));
      },
      async getUserById(id) {
        await ensureKvSeeded();
        return kvGetJson(appKey('user', id));
      },
      async saveRefreshToken(token, userId) {
        await ensureKvSeeded();
        await kvPutString(appKey('refresh', token), userId);
      },
      async getRefreshTokenUser(token) {
        await ensureKvSeeded();
        return kvGetString(appKey('refresh', token));
      },
      async revokeRefreshToken(token) {
        await ensureKvSeeded();
        if (kv.delete) await kv.delete(appKey('refresh', token));
      },
      async listDocuments(query) {
        await ensureKvSeeded();
        const ids = (await kvGetJson(appKey('documents'))) || [];
        const docs = await Promise.all(ids.map((id) => kvGetJson(appKey('document', id))));
        const all = docs.filter(Boolean);
        return applyDocumentQuery(all, query);
      },
      async getDocument(id) {
        await ensureKvSeeded();
        return kvGetJson(appKey('document', id));
      },
      async createDocument(input) {
        await ensureKvSeeded();
        const now = runtime.now().toISOString();
        const doc = createDocument({ ...input, now });
        await kvPutJson(appKey('document', doc.id), doc);
        await kvIndexAdd(appKey('documents'), doc.id);
        return doc;
      },
      async updateDocument(id, input) {
        await ensureKvSeeded();
        const existing = await kvGetJson(appKey('document', id));
        if (!existing) return null;
        const updated = {
          ...existing,
          ...input,
          updatedAt: runtime.now().toISOString()
        };
        await kvPutJson(appKey('document', id), updated);
        return updated;
      },
      async deleteDocument(id, { permanent = false } = {}) {
        await ensureKvSeeded();
        const existing = await kvGetJson(appKey('document', id));
        if (!existing) return null;
        if (!permanent) {
          return this.updateDocument(id, { status: 'trash' });
        }
        if (kv.delete) {
          await kv.delete(appKey('document', id));
        } else {
          await kvPutJson(appKey('document', id), null);
        }
        const docIds = (await kvGetJson(appKey('documents'))) || [];
        await kvPutJson(appKey('documents'), docIds.filter((entryId) => entryId !== id));

        const revisionIds = (await kvGetJson(appKey('revisions_by_doc', id))) || [];
        if (kv.delete) {
          await Promise.all(revisionIds.map((revisionId) => kv.delete(appKey('revision', revisionId))));
          await kv.delete(appKey('revisions_by_doc', id));
        } else {
          await Promise.all(revisionIds.map((revisionId) => kvPutJson(appKey('revision', revisionId), null)));
          await kvPutJson(appKey('revisions_by_doc', id), []);
        }
        return { id };
      },
      async listRevisions(documentId) {
        await ensureKvSeeded();
        const ids = (await kvGetJson(appKey('revisions_by_doc', documentId))) || [];
        const revisions = await Promise.all(ids.map((id) => kvGetJson(appKey('revision', id))));
        return revisions.filter(Boolean);
      },
      async getRevision(id) {
        await ensureKvSeeded();
        return kvGetJson(appKey('revision', id));
      },
      async createRevision(input) {
        await ensureKvSeeded();
        const now = runtime.now().toISOString();
        const revision = createRevision({ ...input, now });
        await kvPutJson(appKey('revision', revision.id), revision);
        await kvIndexAdd(appKey('revisions_by_doc', revision.documentId), revision.id);
        return revision;
      },
      async createMediaSession(input) {
        await ensureKvSeeded();
        const now = runtime.now().toISOString();
        const media = createMediaAssetSession({ ...input, now });
        await kvPutJson(appKey('media', media.id), media);
        return media;
      },
      async finalizeMedia(id, input) {
        await ensureKvSeeded();
        const existing = await kvGetJson(appKey('media', id));
        if (!existing) return null;
        const now = runtime.now().toISOString();
        const finalized = finalizeMediaAsset(existing, input, now);
        await kvPutJson(appKey('media', id), finalized);
        return finalized;
      },
      async getMedia(id) {
        await ensureKvSeeded();
        return kvGetJson(appKey('media', id));
      },
      async createPublishJob(input) {
        await ensureKvSeeded();
        const now = runtime.now().toISOString();
        const job = createPublishJob({ ...input, now });
        await kvPutJson(appKey('publish_job', job.id), job);
        return job;
      },
      async updatePublishJob(id, patch) {
        await ensureKvSeeded();
        const existing = await kvGetJson(appKey('publish_job', id));
        if (!existing) return null;
        const updated = { ...existing, ...patch, updatedAt: runtime.now().toISOString() };
        await kvPutJson(appKey('publish_job', id), updated);
        return updated;
      },
      async getPublishJob(id) {
        await ensureKvSeeded();
        return kvGetJson(appKey('publish_job', id));
      },
      async createFormSubmission(input) {
        await ensureKvSeeded();
        const now = runtime.now().toISOString();
        const submission = createFormSubmission({ ...input, now });
        await kvPutJson(appKey('form_submission', submission.id), submission);
        return submission;
      },
      async listNavigationMenus() {
        await ensureKvSeeded();
        const keys = (await kvGetJson(appKey('navigation_menu_keys'))) || [];
        const menus = await Promise.all(keys.map((key) => kvGetJson(appKey('navigation_menu', key))));
        return menus.filter(Boolean);
      },
      async getNavigationMenu(key) {
        await ensureKvSeeded();
        return kvGetJson(appKey('navigation_menu', key));
      },
      async upsertNavigationMenu(menu) {
        await ensureKvSeeded();
        const key = String(menu?.key || '').trim();
        const updated = { ...menu, key, updatedAt: runtime.now().toISOString() };
        await kvPutJson(appKey('navigation_menu', key), updated);
        await kvIndexAdd(appKey('navigation_menu_keys'), key);
        return updated;
      }
    };
  }

  function createD1PreviewStore() {
    return {
      async createPreview(input) {
        await ensureD1AppSchema();
        await d1
          .prepare(D1_SQL.upsertPreview)
          .bind(input.previewToken, JSON.stringify(input), input.expiresAt)
          .run();
        return input;
      },
      async getPreview(previewToken) {
        await ensureD1AppSchema();
        const row = await d1.prepare(D1_SQL.selectPreviewByToken).bind(previewToken).first();
        return parseJsonSafe(row?.preview_json);
      }
    };
  }

  function createKvPreviewStore() {
    return {
      async createPreview(input) {
        await ensureKvSeeded();
        await kvPutJson(appKey('preview', input.previewToken), input);
        return input;
      },
      async getPreview(previewToken) {
        await ensureKvSeeded();
        return kvGetJson(appKey('preview', previewToken));
      }
    };
  }

  if (d1) {
    return {
      store: createD1Store(),
      previewStore: createD1PreviewStore()
    };
  }

  if (kv?.get && kv?.put) {
    return {
      store: createKvStore(),
      previewStore: createKvPreviewStore()
    };
  }

  return {
    store: baseStore,
    previewStore: basePreviewStore
  };
}
