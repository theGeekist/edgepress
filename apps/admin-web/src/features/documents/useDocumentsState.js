import { useMemo, useState } from 'react';

const CONTENT_META_STORAGE_KEY = 'edgepress.admin.content-meta.v1';

function readContentMeta() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(CONTENT_META_STORAGE_KEY);
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
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(CONTENT_META_STORAGE_KEY, JSON.stringify(value || {}));
  } catch {
    // Ignore localStorage write errors and continue in-memory.
  }
}

function toSlug(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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
  return {
    ...item,
    ui: {
      type: normalizeType(item, entryMeta),
      status,
      slug: entryMeta.slug || toSlug(title) || 'untitled',
      excerpt: entryMeta.excerpt || '',
      publishDate: entryMeta.publishDate || '',
      featuredImageUrl: entryMeta.featuredImageUrl || '',
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

  const filteredDocs = useMemo(() => docs, [docs]);

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
    const nextMeta = {
      ...contentMeta,
      [documentId]: {
        ...(contentMeta[documentId] || {}),
        ...patch
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

  async function refresh() {
    const querySortBy = sortBy === 'updated' ? 'updatedAt' : sortBy;
    const payload = await shell.listDocuments({
      q: contentSearch || '',
      type: contentTypeFilter,
      status: contentStatusFilter,
      sortBy: querySortBy,
      sortDir,
      page,
      pageSize
    });
    const items = (payload.items || []).map((item) => withUiMeta(item, contentMeta));
    items.sort((a, b) => {
      const aValue = sortBy === 'type'
        ? String(a?.ui?.type || '')
        : sortBy === 'status'
          ? String(a?.ui?.status || '')
          : sortBy === 'updated'
            ? String(a?.updatedAt || a?.createdAt || '')
            : String(a?.[sortBy] || '');
      const bValue = sortBy === 'type'
        ? String(b?.ui?.type || '')
        : sortBy === 'status'
          ? String(b?.ui?.status || '')
          : sortBy === 'updated'
            ? String(b?.updatedAt || b?.createdAt || '')
            : String(b?.[sortBy] || '');
      return sortDir === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    });
    setDocs(items);
    setPagination(payload.pagination || { page, pageSize, totalItems: items.length, totalPages: 1 });
    setSelectedRowIds((prev) => prev.filter((id) => items.some((item) => item.id === id)));
    return items;
  }

  async function createDraft({ type = 'page' } = {}) {
    const created = await shell.createDocument({ title: 'Untitled', content: '', type, status: 'draft' });
    const document = created.document;
    const nextMeta = {
      ...contentMeta,
      [document.id]: {
        type,
        slug: toSlug(document.title || 'untitled'),
        excerpt: '',
        publishDate: '',
        featuredImageUrl: ''
      }
    };
    persistMeta(nextMeta);
    await refresh();
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
    for (const row of rows) {
      await shell.updateDocument(row.id, {
        title: row.title,
        content: row.content,
        blocks: Array.isArray(row.blocks) ? row.blocks : [],
        status
      });
    }
    await refresh();
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
    await shell.deleteDocument(documentId, { permanent });
    if (selectedId === documentId) {
      setSelectedId(null);
      setTitle('');
    }
    await refresh();
    return true;
  }

  return {
    docs,
    filteredDocs,
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
