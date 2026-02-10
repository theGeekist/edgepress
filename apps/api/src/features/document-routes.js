import { BLOCKS_SCHEMA_VERSION } from '@geekist/edgepress/domain';
import { requireCapability } from '../auth.js';
import { error, json, readJson } from '../http.js';
import { normalizeBlocksForWrite } from '../request-validation.js';
import { doAction, HOOK_NAMES } from '../hooks.js';

const ALLOWED_DOCUMENT_SORT_BY = new Set(['updatedAt', 'createdAt', 'title', 'type', 'status']);

function normalizeDocumentSortBy(input) {
  return ALLOWED_DOCUMENT_SORT_BY.has(input) ? input : 'updatedAt';
}

function normalizeDocumentSortDir(input) {
  return input === 'asc' ? 'asc' : 'desc';
}

function parsePositiveInt(input, fallback) {
  const parsed = Number.parseInt(String(input ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

function toSlug(input) {
  let slug = String(input || '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]+/g, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '');

  while (slug.endsWith('-')) {
    slug = slug.slice(0, -1);
  }
  return slug;
}

function toDocumentItems(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  return Array.isArray(payload?.items) ? payload.items : [];
}

function normalizeTermIdsInput(value, fallback = []) {
  if (value === undefined) return fallback;
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry || '').trim()).filter(Boolean);
}

function normalizeObjectInput(value, fallback = {}) {
  if (value === undefined) return fallback;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value;
}

async function resolveUniqueSlug(store, { requestedSlug, title, currentId = null }) {
  const baseSlug = toSlug(requestedSlug || '') || toSlug(title || '') || 'untitled';
  const listed = await store.listDocuments();
  const docs = toDocumentItems(listed);
  const taken = new Set(
    docs
      .filter((entry) => entry?.id !== currentId)
      .map((entry) => toSlug(entry?.slug || ''))
      .filter(Boolean)
  );
  if (!taken.has(baseSlug)) {
    return baseSlug;
  }
  let index = 2;
  while (taken.has(`${baseSlug}-${index}`)) {
    index += 1;
  }
  return `${baseSlug}-${index}`;
}

function latestRevisionFromList(revisions) {
  if (!Array.isArray(revisions) || revisions.length === 0) {
    return null;
  }
  let latest = revisions[0];
  for (const revision of revisions) {
    if (String(revision?.createdAt || '') > String(latest?.createdAt || '')) {
      latest = revision;
    }
  }
  return latest || null;
}

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
          sortBy: normalizeDocumentSortBy(url.searchParams.get('sortBy') || 'updatedAt'),
          sortDir: normalizeDocumentSortDir(url.searchParams.get('sortDir') || 'desc'),
          page: parsePositiveInt(url.searchParams.get('page'), 1),
          pageSize: Math.min(100, parsePositiveInt(url.searchParams.get('pageSize'), 20))
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
        const slug = await resolveUniqueSlug(store, {
          requestedSlug: body.slug,
          title: body.title
        });
        const nextLegacyHtml = String(body.legacyHtml ?? body.content ?? '');
        const document = await store.createDocument({
          id,
          title: body.title || 'Untitled',
          content: nextLegacyHtml,
          legacyHtml: nextLegacyHtml,
          type: body.type || 'page',
          slug,
          excerpt: body.excerpt || '',
          featuredImageId: body.featuredImageId || '',
          blocks: normalizedBlocks.blocks,
          blocksSchemaVersion: normalizedBlocks.blocksSchemaVersion,
          fields: normalizeObjectInput(body.fields, {}),
          termIds: normalizeTermIdsInput(body.termIds, []),
          raw: normalizeObjectInput(body.raw, {}),
          createdBy: user.id,
          status: body.status || 'draft'
        });
        const revision = await store.createRevision({
          id: `rev_${runtime.uuid()}`,
          documentId: id,
          title: document.title,
          content: document.content,
          legacyHtml: document.legacyHtml,
          excerpt: document.excerpt,
          slug: document.slug,
          status: document.status,
          featuredImageId: document.featuredImageId,
          blocks: document.blocks,
          blocksSchemaVersion: document.blocksSchemaVersion || BLOCKS_SCHEMA_VERSION,
          fields: document.fields,
          termIds: document.termIds,
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
        const slug = body.slug === undefined
          ? existing.slug ?? ''
          : await resolveUniqueSlug(store, {
            requestedSlug: body.slug,
            title: body.title ?? existing.title,
            currentId: params.id
          });
        const nextLegacyHtml = String(body.legacyHtml ?? body.content ?? existing.legacyHtml ?? existing.content ?? '');

        const document = await store.updateDocument(params.id, {
          title: body.title ?? existing.title,
          content: nextLegacyHtml,
          legacyHtml: nextLegacyHtml,
          type: body.type ?? existing.type ?? 'page',
          slug,
          excerpt: body.excerpt ?? existing.excerpt ?? '',
          featuredImageId: body.featuredImageId ?? existing.featuredImageId ?? '',
          blocks: normalizedBlocks.blocks,
          blocksSchemaVersion: normalizedBlocks.blocksSchemaVersion,
          fields: normalizeObjectInput(body.fields, existing.fields || {}),
          termIds: normalizeTermIdsInput(body.termIds, existing.termIds || []),
          raw: normalizeObjectInput(body.raw, existing.raw || {}),
          status: body.status ?? existing.status
        });
        const revisions = await store.listRevisions(params.id);
        const latest = latestRevisionFromList(revisions);
        const revision = await store.createRevision({
          id: `rev_${runtime.uuid()}`,
          documentId: params.id,
          title: document.title,
          content: document.content,
          legacyHtml: document.legacyHtml,
          excerpt: document.excerpt,
          slug: document.slug,
          status: document.status,
          featuredImageId: document.featuredImageId,
          blocks: document.blocks,
          blocksSchemaVersion: document.blocksSchemaVersion || BLOCKS_SCHEMA_VERSION,
          fields: document.fields,
          termIds: document.termIds,
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

        // DELETE soft-trash intentionally avoids revision creation; PATCH keeps the auditable revision path.
        const trashed = await store.updateDocument(params.id, { status: 'trash' });
        if (!trashed) return error('DOCUMENT_NOT_FOUND', 'Document not found', 404);
        if (existing.status !== 'trash' && trashed.status === 'trash') {
          doAction(runtime, hooks, HOOK_NAMES.documentTrashedAction, {
            document: trashed,
            previousStatus: existing.status,
            user
          });
        }
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
        const latest = latestRevisionFromList(revisions);
        const revision = await store.createRevision({
          id: `rev_${runtime.uuid()}`,
          documentId: params.id,
          title: document.title,
          content: document.content,
          legacyHtml: document.legacyHtml,
          excerpt: document.excerpt,
          slug: document.slug,
          status: document.status,
          featuredImageId: document.featuredImageId,
          blocks: document.blocks,
          blocksSchemaVersion: document.blocksSchemaVersion || BLOCKS_SCHEMA_VERSION,
          fields: document.fields,
          termIds: document.termIds,
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
