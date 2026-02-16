export function toWpNumericId(internalId) {
  const text = String(internalId || '');
  // Deterministic non-zero 31-bit hash for WP-facing numeric entity IDs.
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash * 31) + text.charCodeAt(i)) | 0;
  }
  const value = Math.abs(hash) % 2147483647;
  return value === 0 ? 1 : value;
}

export async function loadDocumentByType(store, type, id) {
  const doc = await store.getDocument(id);
  if (!doc) return null;
  if ((doc.type || 'page') !== type) return null;
  return doc;
}

export async function listByType(store, type) {
  const listed = await store.listDocuments({
    type,
    status: 'all',
    sortBy: 'updatedAt',
    sortDir: 'desc',
    page: 1,
    pageSize: 100
  });
  return Array.isArray(listed?.items) ? listed.items : [];
}

export async function resolveInternalIdForWpId(store, type, idParam) {
  const raw = String(idParam || '').trim();
  if (!raw) return null;
  if (raw.startsWith('doc_')) {
    const byInternal = await loadDocumentByType(store, type, raw);
    return byInternal ? raw : null;
  }
  const numeric = Number.parseInt(raw, 10);
  if (!Number.isFinite(numeric)) return null;
  const rows = await listByType(store, type);
  const match = rows.find((doc) => toWpNumericId(doc.id) === numeric);
  return match?.id || null;
}

export async function resolveInternalMediaIdForWpId(store, idParam) {
  const raw = String(idParam || '').trim();
  if (!raw) return '';
  if (raw.startsWith('med_')) {
    const media = await store.getMedia(raw);
    return media ? raw : '';
  }
  const numeric = Number.parseInt(raw, 10);
  if (!Number.isFinite(numeric)) return '';

  let page = 1;
  const pageSize = 200;
  while (true) {
    const listed = await store.listMedia({
      page,
      pageSize,
      sortBy: 'updatedAt',
      sortDir: 'desc'
    });
    const items = Array.isArray(listed?.items) ? listed.items : [];
    const match = items.find((media) => toWpNumericId(media.id) === numeric);
    if (match?.id) return match.id;
    const totalPages = Number(listed?.pagination?.totalPages || 1);
    if (page >= totalPages || items.length === 0) break;
    page += 1;
  }
  return '';
}
