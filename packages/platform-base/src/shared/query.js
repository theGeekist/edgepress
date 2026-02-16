export function applyDocumentQuery(state, query) {
  const all = Array.from(state.documents.values());
  const pageSizeDefault = Math.min(100, Math.max(1, Number(query?.pageSize) || 20));
  if (!query) {
    const page = 1;
    const totalItems = all.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSizeDefault));
    const items = all.slice(0, pageSizeDefault);
    return {
      items,
      pagination: {
        page,
        pageSize: pageSizeDefault,
        totalItems,
        totalPages
      }
    };
  }
  const q = String(query.q || '').trim().toLowerCase();
  const type = query.type || 'all';
  const status = query.status || 'all';
  const sortBy = query.sortBy || 'updatedAt';
  const sortDir = query.sortDir === 'asc' ? 'asc' : 'desc';
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = pageSizeDefault;

  const filtered = all.filter((doc) => {
    if (status !== 'all' && doc.status !== status) return false;
    const docType = doc.type || 'page';
    if (type !== 'all' && docType !== type) return false;
    if (q && !String(doc.title || '').toLowerCase().includes(q)) return false;
    if (query?.slug) {
      const slug = String(query.slug || '').trim().toLowerCase();
      if (slug && String(doc.slug || '').trim().toLowerCase() !== slug) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    const av = String(a?.[sortBy] || '');
    const bv = String(b?.[sortBy] || '');
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);
  return {
    items,
    pagination: { page: safePage, pageSize, totalItems, totalPages }
  };
}

export function applyMediaQuery(state, query) {
  const all = Array.from(state.media.values());
  const safeQuery = query || {};
  const q = String(safeQuery.q || '').trim().toLowerCase();
  const mimeType = String(safeQuery.mimeType || '').trim().toLowerCase();
  const sortBy = safeQuery.sortBy === 'createdAt' ? 'createdAt' : 'updatedAt';
  const sortDir = safeQuery.sortDir === 'asc' ? 'asc' : 'desc';
  const page = Math.max(1, Number(safeQuery.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(safeQuery.pageSize) || 20));

  const filtered = all.filter((item) => {
    if (item.status && item.status !== 'ready') return false;
    if (q) {
      const haystack = `${item.filename || ''} ${item.alt || ''} ${item.caption || ''} ${item.description || ''}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (mimeType && String(item.mimeType || '').toLowerCase() !== mimeType) return false;
    return true;
  });

  filtered.sort((a, b) => {
    const av = String(a?.[sortBy] || '');
    const bv = String(b?.[sortBy] || '');
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return {
    items,
    pagination: {
      page: safePage,
      pageSize,
      totalItems,
      totalPages
    }
  };
}
