import {
  createDocument,
  createRevision
} from '@geekist/edgepress/domain/entities.js';
import { applyDocumentQuery } from './shared/query.js';

export function createDocumentsD1(d1, D1_SQL, parseJsonSafe, runtime, ensureD1AppSchema) {
  return {
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
    }
  };
}

export function createDocumentsKv(appKey, kvGetJson, kvPutJson, ensureKvSeeded, kvIndexAdd, runtime) {
  return {
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
    async deleteDocument(id, { permanent = false } = {}, kvDelete) {
      await ensureKvSeeded();
      const existing = await kvGetJson(appKey('document', id));
      if (!existing) return null;
      if (!permanent) {
        return this.updateDocument(id, { status: 'trash' });
      }

      if (kvDelete) {
        await kvDelete(appKey('document', id));
      } else {
        await kvPutJson(appKey('document', id), null);
      }
      const docIds = (await kvGetJson(appKey('documents'))) || [];
      await kvPutJson(appKey('documents'), docIds.filter((entryId) => entryId !== id));

      const revisionIds = (await kvGetJson(appKey('revisions_by_doc', id))) || [];
      if (kvDelete) {
        await Promise.all(revisionIds.map((revisionId) => kvDelete(appKey('revision', revisionId))));
        await kvDelete(appKey('revisions_by_doc', id));
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
    }
  };
}
