import { BLOCKS_SCHEMA_VERSION } from '../../../../packages/domain/src/index.js';
import { requireCapability } from '../auth.js';
import { error, json, readJson } from '../http.js';
import { normalizeBlocksForWrite } from '../request-validation.js';
import { doAction, HOOK_NAMES } from '../hooks.js';

export function createDocumentRoutes({ runtime, store, hooks, route, authzErrorResponse }) {
  return [
    route('GET', '/v1/documents', async (request) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        const url = new URL(request.url);
        const query = {
          q: url.searchParams.get('q') || '',
          type: url.searchParams.get('type') || 'all',
          status: url.searchParams.get('status') || 'all',
          sortBy: url.searchParams.get('sortBy') || 'updatedAt',
          sortDir: url.searchParams.get('sortDir') || 'desc',
          page: Number(url.searchParams.get('page') || '1'),
          pageSize: Number(url.searchParams.get('pageSize') || '20')
        };
        const payload = await store.listDocuments(query);
        if (Array.isArray(payload)) {
          return json({ items: payload });
        }
        return json(payload);
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('POST', '/v1/documents', async (request) => {
      try {
        const user = await requireCapability({ runtime, store, request, capability: 'document:write' });
        const body = await readJson(request);
        const normalizedBlocks = normalizeBlocksForWrite(body.blocks, []);
        if (normalizedBlocks.error) return normalizedBlocks.error;
        const id = `doc_${runtime.uuid()}`;
        const document = await store.createDocument({
          id,
          title: body.title || 'Untitled',
          content: body.content || '',
          type: body.type || 'page',
          blocks: normalizedBlocks.blocks,
          blocksSchemaVersion: normalizedBlocks.blocksSchemaVersion,
          createdBy: user.id,
          status: body.status || 'draft'
        });
        const revision = await store.createRevision({
          id: `rev_${runtime.uuid()}`,
          documentId: id,
          title: document.title,
          content: document.content,
          blocks: document.blocks,
          blocksSchemaVersion: document.blocksSchemaVersion || BLOCKS_SCHEMA_VERSION,
          sourceRevisionId: null,
          authorId: user.id
        });
        doAction(runtime, hooks, HOOK_NAMES.documentWrittenAction, { mode: 'create', document, revision, user });
        doAction(runtime, hooks, HOOK_NAMES.revisionCreatedAction, { mode: 'create', document, revision, user });
        return json({ document, revision }, 201);
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('PATCH', '/v1/documents/:id', async (request, params) => {
      try {
        const user = await requireCapability({ runtime, store, request, capability: 'document:write' });
        const body = await readJson(request);
        const existing = await store.getDocument(params.id);
        if (!existing) return error('DOCUMENT_NOT_FOUND', 'Document not found', 404);
        const normalizedBlocks = normalizeBlocksForWrite(body.blocks, existing.blocks || []);
        if (normalizedBlocks.error) return normalizedBlocks.error;

        const document = await store.updateDocument(params.id, {
          title: body.title ?? existing.title,
          content: body.content ?? existing.content,
          type: body.type ?? existing.type ?? 'page',
          blocks: normalizedBlocks.blocks,
          blocksSchemaVersion: normalizedBlocks.blocksSchemaVersion,
          status: body.status ?? existing.status
        });
        const revisions = await store.listRevisions(params.id);
        const latest = revisions.at(-1) || null;
        const revision = await store.createRevision({
          id: `rev_${runtime.uuid()}`,
          documentId: params.id,
          title: document.title,
          content: document.content,
          blocks: document.blocks,
          blocksSchemaVersion: document.blocksSchemaVersion || BLOCKS_SCHEMA_VERSION,
          sourceRevisionId: latest?.id || null,
          authorId: user.id
        });
        doAction(runtime, hooks, HOOK_NAMES.documentWrittenAction, { mode: 'update', document, revision, user });
        if (existing.status !== 'trash' && document.status === 'trash') {
          doAction(runtime, hooks, HOOK_NAMES.documentTrashedAction, {
            document,
            previousStatus: existing.status,
            user
          });
        }
        doAction(runtime, hooks, HOOK_NAMES.revisionCreatedAction, { mode: 'update', document, revision, user });
        return json({ document, revision });
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('DELETE', '/v1/documents/:id', async (request, params) => {
      try {
        const user = await requireCapability({ runtime, store, request, capability: 'document:write' });
        const existing = await store.getDocument(params.id);
        if (!existing) return error('DOCUMENT_NOT_FOUND', 'Document not found', 404);
        const url = new URL(request.url);
        const permanent = ['1', 'true', 'yes'].includes((url.searchParams.get('permanent') || '').toLowerCase());

        if (permanent) {
          const deleted = await store.deleteDocument(params.id, { permanent: true });
          if (!deleted) return error('DOCUMENT_NOT_FOUND', 'Document not found', 404);
          doAction(runtime, hooks, HOOK_NAMES.documentDeletedAction, {
            documentId: params.id,
            previousStatus: existing.status,
            user
          });
          return json({ ok: true, deleted: true });
        }

        const trashed = await store.updateDocument(params.id, { status: 'trash' });
        if (!trashed) return error('DOCUMENT_NOT_FOUND', 'Document not found', 404);
        doAction(runtime, hooks, HOOK_NAMES.documentTrashedAction, {
          document: trashed,
          previousStatus: existing.status,
          user
        });
        return json({ ok: true, document: trashed });
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('GET', '/v1/documents/:id/revisions', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        const items = await store.listRevisions(params.id);
        return json({ items });
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('POST', '/v1/documents/:id/revisions', async (request, params) => {
      try {
        const user = await requireCapability({ runtime, store, request, capability: 'document:write' });
        const document = await store.getDocument(params.id);
        if (!document) return error('DOCUMENT_NOT_FOUND', 'Document not found', 404);
        const revisions = await store.listRevisions(params.id);
        const latest = revisions.at(-1) || null;
        const revision = await store.createRevision({
          id: `rev_${runtime.uuid()}`,
          documentId: params.id,
          title: document.title,
          content: document.content,
          blocks: document.blocks,
          blocksSchemaVersion: document.blocksSchemaVersion || BLOCKS_SCHEMA_VERSION,
          sourceRevisionId: latest?.id || null,
          authorId: user.id
        });
        doAction(runtime, hooks, HOOK_NAMES.revisionCreatedAction, { mode: 'manual', document, revision, user });
        return json({ revision }, 201);
      } catch (e) {
        return authzErrorResponse(e);
      }
    })
  ];
}
