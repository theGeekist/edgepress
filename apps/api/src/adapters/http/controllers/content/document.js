import { requireCapability } from '@geekist/edgepress/api-core/auth.js';
import { error, json, readJson } from '@geekist/edgepress/api-core/http.js';
import { normalizeBlocksForWrite } from '@geekist/edgepress/api-core/request-validation.js';
import { doAction, HOOK_NAMES } from '@geekist/edgepress/api-core/hooks.js';
import { createDocumentsFeature } from '@geekist/edgepress/content';

export function createDocumentRoutes({ runtime, store, hooks, route, authzErrorResponse }) {
  const documents = createDocumentsFeature({ runtime, store });

  return [
    route('GET', '/v1/documents', async (request) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        return json(await documents.listDocuments({ url: new URL(request.url) }));
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

        const { document, revision } = await documents.createDocument({ body, normalizedBlocks, userId: user.id });
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
        const normalizedBlocks = normalizeBlocksForWrite(body.blocks, existing?.blocks || []);
        if (normalizedBlocks.error) return normalizedBlocks.error;

        const updated = await documents.updateDocument({
          documentId: params.id,
          body,
          normalizedBlocks,
          userId: user.id
        });
        if (updated.error) return error(updated.error.code, updated.error.message, updated.error.status);

        const { document, revision, previousStatus } = updated;
        doAction(runtime, hooks, HOOK_NAMES.documentWrittenAction, { mode: 'update', document, revision, user });
        if (previousStatus !== 'trash' && document.status === 'trash') {
          doAction(runtime, hooks, HOOK_NAMES.documentTrashedAction, { document, previousStatus, user });
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
        const url = new URL(request.url);
        const permanent = ['1', 'true', 'yes'].includes((url.searchParams.get('permanent') || '').toLowerCase());

        const deleted = await documents.deleteDocument({ documentId: params.id, permanent });
        if (deleted.error) return error(deleted.error.code, deleted.error.message, deleted.error.status);

        if (permanent) {
          doAction(runtime, hooks, HOOK_NAMES.documentDeletedAction, {
            documentId: params.id,
            previousStatus: deleted.previousStatus,
            user
          });
          return json({ ok: true, deleted: true });
        }

        if (deleted.previousStatus !== 'trash' && deleted.document.status === 'trash') {
          doAction(runtime, hooks, HOOK_NAMES.documentTrashedAction, {
            document: deleted.document,
            previousStatus: deleted.previousStatus,
            user
          });
        }
        return json({ ok: true, document: deleted.document });
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('GET', '/v1/documents/:id/revisions', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        return json(await documents.listRevisions({ documentId: params.id }));
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('POST', '/v1/documents/:id/revisions', async (request, params) => {
      try {
        const user = await requireCapability({ runtime, store, request, capability: 'document:write' });
        const created = await documents.createRevision({ documentId: params.id, userId: user.id });
        if (created.error) return error(created.error.code, created.error.message, created.error.status);
        doAction(runtime, hooks, HOOK_NAMES.revisionCreatedAction, {
          mode: 'manual',
          document: created.document,
          revision: created.revision,
          user
        });
        return json({ revision: created.revision }, 201);
      } catch (e) {
        return authzErrorResponse(e);
      }
    })
  ];
}
