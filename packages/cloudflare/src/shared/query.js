export function applyDocumentQuery(allDocuments, query) {
  const all = Array.isArray(allDocuments) ? allDocuments : [];
  const pageSizeDefault = Math.min(100, Math.max(1, Number(query?.pageSize) || 20));
  if (!query) {
    return {
      items: all,
      pagination: {
        page: 1,
        pageSize: pageSizeDefault,
        totalItems: all.length,
        totalPages: 1
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

export function applyMediaQuery(allMedia, query) {
  const all = Array.isArray(allMedia) ? allMedia : [];
  const q = String(query.q || '').trim().toLowerCase();
  const mimeType = String(query.mimeType || '').trim().toLowerCase();
  const sortBy = query.sortBy === 'createdAt' ? 'createdAt' : 'updatedAt';
  const sortDir = query.sortDir === 'asc' ? 'asc' : 'desc';
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

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
