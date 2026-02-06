import { useState } from 'react';

const CONTENT_META_STORAGE_KEY = 'edgepress.admin.content-meta.v1';

function readContentMeta() {
  if (typeof globalThis === 'undefined' || !globalThis.window || !globalThis.window.localStorage) {
    return {};
  }
  try {
    const raw = globalThis.window.localStorage.getItem(CONTENT_META_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeContentMeta(value) {
  if (typeof globalThis === 'undefined' || !globalThis.window || !globalThis.window.localStorage) {
    return;
  }
  try {
    globalThis.window.localStorage.setItem(CONTENT_META_STORAGE_KEY, JSON.stringify(value || {}));
  } catch {
    // Ignore localStorage write errors and continue in-memory.
  }
}

function toSlug(input) {
  const normalized = String(input || '').trim().toLowerCase();
  let slug = '';
  let previousWasDash = false;
  for (const char of normalized) {
    const isAlphaNumeric = (char >= 'a' && char <= 'z') || (char >= '0' && char <= '9');
    if (isAlphaNumeric) {
      slug += char;
      previousWasDash = false;
      continue;
    }
    if (!previousWasDash) {
      slug += '-';
      previousWasDash = true;
    }
  }
  if (slug.startsWith('-')) slug = slug.slice(1);
  if (slug.endsWith('-')) slug = slug.slice(0, -1);
  return slug;
}

function mapQuerySortBy(sortBy) {
  if (sortBy === 'updated') return 'updatedAt';
  if (sortBy === 'type') return 'type';
  if (sortBy === 'status') return 'status';
  return sortBy;
}

function normalizeStatus(item) {
  if (item?.status === 'trash') {
    return 'trash';
  }
  if (item?.status === 'published' || item?.publishedAt || item?.isPublished) {
    return 'published';
  }
  return 'draft';
}

function normalizeType(documentItem, metaItem) {
  if (documentItem?.type === 'post') {
    return 'post';
  }
  if (documentItem?.type === 'page') {
    return 'page';
  }
  if (metaItem?.type === 'post') {
    return 'post';
  }
  return 'page';
}

function withUiMeta(item, meta) {
  const entryMeta = meta[item.id] || {};
  const status = normalizeStatus(item);
  const title = item.title || 'Untitled';
  const canonicalSlug = toSlug(item.slug || '');
  const draftSlug = toSlug(entryMeta.slug || '');
  return {
    ...item,
    ui: {
      type: normalizeType(item, entryMeta),
      status,
      slug: draftSlug || canonicalSlug || toSlug(title) || 'untitled',
      excerpt: entryMeta.excerpt || '',
      publishDate: entryMeta.publishDate || '',
      featuredImageId: String(entryMeta.featuredImageId || item.featuredImageId || '').trim(),
      updatedAtLabel: item.updatedAt || item.createdAt || ''
    }
  };
}

export function useDocumentsState(shell) {
  const [docs, setDocs] = useState([]);
  const [selectedId, setSelectedIdRaw] = useState(null);
  const [title, setTitle] = useState('');
  const [contentMeta, setContentMeta] = useState(() => readContentMeta());
  const [contentSearch, setContentSearch] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState('all');
  const [contentStatusFilter, setContentStatusFilter] = useState('all');
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [sortBy, setSortBy] = useState('updated');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, totalItems: 0, totalPages: 1 });

  function setSelectedId(nextId) {
    setSelectedIdRaw(nextId);
  }

  function setQueryPage(nextPage) {
    setPage(Math.max(1, Number(nextPage) || 1));
  }

  function setQuerySearch(next) {
    setContentSearch(next);
    setQueryPage(1);
  }

  function setQueryTypeFilter(next) {
    setContentTypeFilter(next);
    setQueryPage(1);
  }

  function setQueryStatusFilter(next) {
    setContentStatusFilter(next);
    setQueryPage(1);
  }

  function setSort(nextSortBy) {
    if (sortBy === nextSortBy) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(nextSortBy);
      setSortDir(nextSortBy === 'updated' ? 'desc' : 'asc');
    }
    setQueryPage(1);
  }

  function persistMeta(nextMeta) {
    setContentMeta(nextMeta);
    writeContentMeta(nextMeta);
  }

  function updateMeta(documentId, patch) {
    if (!documentId) {
      return;
    }
    const normalizedPatch = { ...patch };
    if (typeof normalizedPatch.slug === 'string') {
      normalizedPatch.slug = toSlug(normalizedPatch.slug);
    }
    if (typeof normalizedPatch.featuredImageId === 'string') {
      normalizedPatch.featuredImageId = normalizedPatch.featuredImageId.trim();
    }
    const nextMeta = {
      ...contentMeta,
      [documentId]: {
        ...(contentMeta[documentId] || {}),
        ...normalizedPatch
      }
    };
    persistMeta(nextMeta);
    setDocs((prevDocs) => prevDocs.map((doc) => (doc.id === documentId ? withUiMeta(doc, nextMeta) : doc)));
  }

  function toggleRowSelection(documentId) {
    setSelectedRowIds((prev) => (
      prev.includes(documentId) ? prev.filter((id) => id !== documentId) : [...prev, documentId]
    ));
  }

  function setVisibleSelection(visibleIds, shouldSelect) {
    if (!Array.isArray(visibleIds) || visibleIds.length === 0) {
      return;
    }
    setSelectedRowIds((prev) => {
      if (shouldSelect) {
        const merged = new Set([...prev, ...visibleIds]);
        return Array.from(merged);
      }
      return prev.filter((id) => !visibleIds.includes(id));
    });
  }

  function clearSelectedRows() {
    setSelectedRowIds([]);
  }

  async function refresh(metaOverride = null) {
    const effectiveMeta = metaOverride || contentMeta;
    const querySortBy = mapQuerySortBy(sortBy);
    const payload = await shell.listDocuments({
      q: contentSearch || '',
      type: contentTypeFilter,
      status: contentStatusFilter,
      sortBy: querySortBy,
      sortDir,
      page,
      pageSize
    });
    const items = (payload.items || []).map((item) => withUiMeta(item, effectiveMeta));
    const visibleIds = new Set(items.map((item) => item.id));
    setDocs(items);
    setPagination(payload.pagination || { page, pageSize, totalItems: items.length, totalPages: 1 });
    setSelectedRowIds((prev) => prev.filter((id) => visibleIds.has(id)));
    return items;
  }

  async function createDraft({ type = 'page' } = {}) {
    const created = await shell.createDocument({
      title: 'Untitled',
      content: '',
      type,
      slug: toSlug('untitled'),
      status: 'draft'
    });
    const document = created.document;
    const nextMeta = {
      ...contentMeta,
      [document.id]: {
        type,
        slug: toSlug(document.title || 'untitled'),
        excerpt: '',
        publishDate: '',
        featuredImageId: ''
      }
    };
    persistMeta(nextMeta);
    await refresh(nextMeta);
    return withUiMeta(document, nextMeta);
  }

  function getSelectedDoc() {
    return docs.find((doc) => doc.id === selectedId) || null;
  }

  async function bulkSetStatus(status) {
    const rows = docs.filter((doc) => selectedRowIds.includes(doc.id));
    if (rows.length === 0) {
      return 0;
    }
    const failures = [];
    await Promise.all(rows.map(async (row) => {
      try {
        await shell.updateDocument(row.id, {
        title: row.title,
        content: row.content,
        slug: row.slug || row.ui?.slug || '',
        blocks: Array.isArray(row.blocks) ? row.blocks : [],
        status
      });
      } catch (error) {
        failures.push({ id: row.id, error });
        console.error('bulkSetStatus row update failed', { id: row.id, error });
      }
    }));
    await refresh();
    if (failures.length > 0) {
      throw new Error(`Failed to update ${failures.length} document(s).`);
    }
    return rows.length;
  }

  async function bulkDeleteSelected({ permanent = false } = {}) {
    const rows = docs.filter((doc) => selectedRowIds.includes(doc.id));
    if (rows.length === 0) {
      return 0;
    }
   const failures = [];
   try {
     await Promise.all(
       rows.map(async (row) => {
         try {
           await shell.deleteDocument(row.id, { permanent });
           if (selectedId === row.id) {
             setSelectedId(null);
             setTitle('');
           }
         } catch (error) {
           failures.push({ id: row.id, error });
           console.error('bulkDeleteSelected row delete failed', { id: row.id, error });
         }
       })
     );
   } finally {
     clearSelectedRows();
     try {
       await refresh();
     } catch (refreshError) {
       console.error('bulkDeleteSelected refresh failed', refreshError);
     }
   }
   // Choose one:
   // Option A: mirror bulkSetStatus and throw if any failures
   if (failures.length > 0) {
     throw new Error(`Failed to delete ${failures.length} document(s).`);
   }
   return rows.length;
  }

  async function setDocumentStatus(documentId, status) {
    const row = docs.find((doc) => doc.id === documentId);
    if (!row) {
      return false;
    }
    await shell.updateDocument(row.id, {
      title: row.title,
      content: row.content,
      slug: row.slug || row.ui?.slug || '',
      blocks: Array.isArray(row.blocks) ? row.blocks : [],
      status
    });
    await refresh();
    return true;
  }

  async function deleteDocument(documentId, { permanent = false } = {}) {
    const row = docs.find((doc) => doc.id === documentId);
    if (!row) {
      return false;
    }
    try {
      await shell.deleteDocument(documentId, { permanent });
    } finally {
      if (selectedId === documentId) {
        setSelectedId(null);
        setTitle('');
      }
      await refresh();
    }
    return true;
  }

  return {
    docs,
    selectedId,
    setSelectedId,
    title,
    setTitle,
    refresh,
    createDraft,
    getSelectedDoc,
    updateMeta,
    selectedRowIds,
    toggleRowSelection,
    setVisibleSelection,
    clearSelectedRows,
    bulkSetStatus,
    bulkDeleteSelected,
    setDocumentStatus,
    deleteDocument,
    contentSearch,
    setContentSearch: setQuerySearch,
    contentTypeFilter,
    setContentTypeFilter: setQueryTypeFilter,
    contentStatusFilter,
    setContentStatusFilter: setQueryStatusFilter,
    sortBy,
    setSortBy: setSort,
    sortDir,
    setSortDir,
    page,
    setPage: setQueryPage,
    pageSize,
    pagination
  };
}
