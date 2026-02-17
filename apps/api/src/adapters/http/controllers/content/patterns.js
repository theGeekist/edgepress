import { BLOCKS_SCHEMA_VERSION } from '@geekist/edgepress/domain';
import { requireCapability } from '@geekist/edgepress/api-core/auth.js';
import { error, json, readJson } from '@geekist/edgepress/api-core/http.js';
import { normalizeBlocksForWrite } from '@geekist/edgepress/api-core/request-validation.js';

function parsePositiveInt(input, fallback) {
  const parsed = Number.parseInt(String(input ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

function ensureObjectBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return error('INVALID_BODY', 'Invalid JSON body', 400);
  }
  return null;
}

async function loadPattern(store, id) {
  const document = await store.getDocument(id);
  if (!document || document.type !== 'pattern') {
    return null;
  }
  return document;
}

function normalizePatternWriteBody(body, existing = null) {
  return {
    title: body.title ?? existing?.title ?? 'Untitled Pattern',
    content: String(body.content ?? body.legacyHtml ?? existing?.legacyHtml ?? existing?.content ?? ''),
    legacyHtml: String(body.legacyHtml ?? body.content ?? existing?.legacyHtml ?? existing?.content ?? ''),
    type: 'pattern',
    slug: String(body.slug ?? existing?.slug ?? '').trim(),
    excerpt: body.excerpt ?? existing?.excerpt ?? '',
    featuredImageId: body.featuredImageId ?? existing?.featuredImageId ?? '',
    status: body.status ?? existing?.status ?? 'draft',
    fields: body.fields ?? existing?.fields ?? {},
    termIds: body.termIds ?? existing?.termIds ?? [],
    raw: body.raw ?? existing?.raw ?? {}
  };
}

export function getPatterns({ runtime, store, authzErrorResponse }) {
  return async function handleGetPatterns(request) {
    try {
      await requireCapability({ runtime, store, request, capability: 'document:read' });
      const url = new URL(request.url);
      runtime.log('debug', 'patterns_list_requested', { q: url.searchParams.get('q') || '' });
      const payload = await store.listDocuments({
        q: url.searchParams.get('q') || '',
        type: 'pattern',
        status: url.searchParams.get('status') || 'all',
        sortBy: url.searchParams.get('sortBy') || 'updatedAt',
        sortDir: url.searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc',
        page: parsePositiveInt(url.searchParams.get('page'), 1),
        pageSize: Math.min(100, parsePositiveInt(url.searchParams.get('pageSize'), 20))
      });
      return json(Array.isArray(payload) ? { items: payload } : payload);
    } catch (e) {
      return authzErrorResponse(e);
    }
  };
}

export function getPattern({ runtime, store, authzErrorResponse }) {
  return async function handleGetPattern(request, params) {
    try {
      await requireCapability({ runtime, store, request, capability: 'document:read' });
      const pattern = await loadPattern(store, params.id);
      if (!pattern) return error('PATTERN_NOT_FOUND', 'Pattern not found', 404);
      return json({ pattern });
    } catch (e) {
      return authzErrorResponse(e);
    }
  };
}

export function createPattern({ runtime, store, authzErrorResponse }) {
  return async function handleCreatePattern(request) {
    try {
      const user = await requireCapability({ runtime, store, request, capability: 'document:write' });
      const body = await readJson(request);
      const bodyError = ensureObjectBody(body);
      if (bodyError) return bodyError;
      if (body.type !== undefined && body.type !== 'pattern') {
        return error('INVALID_PATTERN_TYPE', 'Pattern type must be "pattern"', 400);
      }

      const normalizedBlocks = normalizeBlocksForWrite(body.blocks, []);
      if (normalizedBlocks.error) return normalizedBlocks.error;

      const created = await store.createDocument({
        id: `doc_${runtime.uuid()}`,
        ...normalizePatternWriteBody(body),
        blocks: normalizedBlocks.blocks,
        blocksSchemaVersion: normalizedBlocks.blocksSchemaVersion || BLOCKS_SCHEMA_VERSION,
        createdBy: user.id
      });
      runtime.log('info', 'pattern_created', { documentId: created.id, userId: user.id });
      return json({ pattern: created }, 201);
    } catch (e) {
      return authzErrorResponse(e);
    }
  };
}

export function updatePattern({ runtime, store, authzErrorResponse }) {
  return async function handleUpdatePattern(request, params) {
    try {
      const user = await requireCapability({ runtime, store, request, capability: 'document:write' });
      const existing = await loadPattern(store, params.id);
      if (!existing) return error('PATTERN_NOT_FOUND', 'Pattern not found', 404);

      const body = await readJson(request);
      const bodyError = ensureObjectBody(body);
      if (bodyError) return bodyError;
      if (body.type !== undefined && body.type !== 'pattern') {
        return error('INVALID_PATTERN_TYPE', 'Pattern type must be "pattern"', 400);
      }

      const normalizedBlocks = normalizeBlocksForWrite(body.blocks, existing.blocks || []);
      if (normalizedBlocks.error) return normalizedBlocks.error;

      const updated = await store.updateDocument(params.id, {
        ...normalizePatternWriteBody(body, existing),
        blocks: normalizedBlocks.blocks,
        blocksSchemaVersion: normalizedBlocks.blocksSchemaVersion || existing.blocksSchemaVersion || BLOCKS_SCHEMA_VERSION
      });
      if (!updated) return error('PATTERN_NOT_FOUND', 'Pattern not found', 404);
      runtime.log('info', 'pattern_updated', { documentId: params.id, userId: user.id });
      return json({ pattern: updated });
    } catch (e) {
      return authzErrorResponse(e);
    }
  };
}

export function deletePattern({ runtime, store, authzErrorResponse }) {
  return async function handleDeletePattern(request, params) {
    try {
      const user = await requireCapability({ runtime, store, request, capability: 'document:write' });
      const existing = await loadPattern(store, params.id);
      if (!existing) return error('PATTERN_NOT_FOUND', 'Pattern not found', 404);
      const deleted = await store.deleteDocument(params.id, { permanent: true });
      if (!deleted) return error('PATTERN_NOT_FOUND', 'Pattern not found', 404);
      runtime.log('info', 'pattern_deleted', { documentId: params.id, userId: user.id });
      return json({ ok: true, deleted: true });
    } catch (e) {
      return authzErrorResponse(e);
    }
  };
}
