import {
  createDocument,
  createRevision
} from '@geekist/edgepress/domain/entities.js';
import { applyDocumentQuery } from '../shared/query.js';

export function createDocumentsFeature(state, runtime) {
  return {
    async listDocuments(query) {
      return applyDocumentQuery(state, query);
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
    }
  };
}
