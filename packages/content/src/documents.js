import { BLOCKS_SCHEMA_VERSION } from '@geekist/edgepress/domain';

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

export function createDocumentsFeature({ runtime, store }) {
  async function listDocuments({ url }) {
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
    return Array.isArray(payload) ? { items: payload } : payload;
  }

  async function createDocument({ body, normalizedBlocks, userId }) {
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
      createdBy: userId,
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
      authorId: userId
    });
    return { document, revision };
  }

  async function updateDocument({ documentId, body, normalizedBlocks, userId }) {
    const existing = await store.getDocument(documentId);
    if (!existing) return { error: { code: 'DOCUMENT_NOT_FOUND', message: 'Document not found', status: 404 } };
    const slug = body.slug === undefined
      ? existing.slug ?? ''
      : await resolveUniqueSlug(store, {
        requestedSlug: body.slug,
        title: body.title ?? existing.title,
        currentId: documentId
      });
    const nextLegacyHtml = String(body.legacyHtml ?? body.content ?? existing.legacyHtml ?? existing.content ?? '');

    const document = await store.updateDocument(documentId, {
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
    const revisions = await store.listRevisions(documentId);
    const latest = latestRevisionFromList(revisions);
    const revision = await store.createRevision({
      id: `rev_${runtime.uuid()}`,
      documentId,
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
      authorId: userId
    });

    return { document, revision, previousStatus: existing.status };
  }

  async function deleteDocument({ documentId, permanent }) {
    const existing = await store.getDocument(documentId);
    if (!existing) return { error: { code: 'DOCUMENT_NOT_FOUND', message: 'Document not found', status: 404 } };

    if (permanent) {
      const deleted = await store.deleteDocument(documentId, { permanent: true });
      if (!deleted) return { error: { code: 'DOCUMENT_NOT_FOUND', message: 'Document not found', status: 404 } };
      return { ok: true, deleted: true, previousStatus: existing.status };
    }

    const trashed = await store.updateDocument(documentId, { status: 'trash' });
    if (!trashed) return { error: { code: 'DOCUMENT_NOT_FOUND', message: 'Document not found', status: 404 } };
    return { ok: true, document: trashed, previousStatus: existing.status };
  }

  async function listRevisions({ documentId }) {
    return { items: await store.listRevisions(documentId) };
  }

  async function createRevision({ documentId, userId }) {
    const document = await store.getDocument(documentId);
    if (!document) return { error: { code: 'DOCUMENT_NOT_FOUND', message: 'Document not found', status: 404 } };
    const revisions = await store.listRevisions(documentId);
    const latest = latestRevisionFromList(revisions);
    const revision = await store.createRevision({
      id: `rev_${runtime.uuid()}`,
      documentId,
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
      authorId: userId
    });
    return { revision, document };
  }

  return {
    listDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
    listRevisions,
    createRevision
  };
}
