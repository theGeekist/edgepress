import { useState } from 'react';

export function useMediaState(shell) {
  const [items, setItems] = useState([]);
  const [search, setSearchRaw] = useState('');
  const [mimeTypeFilter, setMimeTypeFilterRaw] = useState('all');
  const [page, setPageRaw] = useState(1);
  const [pageSize] = useState(20);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, totalItems: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [alt, setAlt] = useState('');
  const [caption, setCaption] = useState('');
  const [description, setDescription] = useState('');

  function setSearch(next) {
    setSearchRaw(next);
    setPageRaw(1);
  }

  function setMimeTypeFilter(next) {
    setMimeTypeFilterRaw(next);
    setPageRaw(1);
  }

  function setPage(nextPage) {
    setPageRaw(Math.max(1, Number(nextPage) || 1));
  }

  function selectedItem() {
    return items.find((item) => item.id === selectedId) || null;
  }

  function selectItem(item) {
    setSelectedId(item?.id || null);
    setAlt(item?.alt || '');
    setCaption(item?.caption || '');
    setDescription(item?.description || '');
  }

  function toggleRowSelection(mediaId) {
    setSelectedRowIds((prev) => (
      prev.includes(mediaId) ? prev.filter((id) => id !== mediaId) : [...prev, mediaId]
    ));
  }

  function clearSelectedRows() {
    setSelectedRowIds([]);
  }

  async function refresh() {
    setIsLoading(true);
    try {
      const payload = await shell.listMedia({
        q: search || '',
        mimeType: mimeTypeFilter === 'all' ? '' : mimeTypeFilter,
        page,
        pageSize,
        sortBy: 'updatedAt',
        sortDir: 'desc'
      });
      const nextItems = payload?.items || [];
      setItems(nextItems);
      setPagination(payload?.pagination || { page, pageSize, totalItems: nextItems.length, totalPages: 1 });
      const visibleIds = new Set(nextItems.map((item) => item.id));
      setSelectedRowIds((prev) => prev.filter((id) => visibleIds.has(id)));

      if (selectedId) {
        const selected = nextItems.find((item) => item.id === selectedId);
        if (selected) {
          setAlt(selected.alt || '');
          setCaption(selected.caption || '');
          setDescription(selected.description || '');
        } else {
          setSelectedId(null);
          setAlt('');
          setCaption('');
          setDescription('');
        }
      }
      return nextItems;
    } finally {
      setIsLoading(false);
    }
  }

  async function saveSelected() {
    if (!selectedId) return null;
    setIsSaving(true);
    try {
      const payload = await shell.updateMedia(selectedId, { alt, caption, description });
      await refresh();
      return payload?.media || null;
    } finally {
      setIsSaving(false);
    }
  }

  async function uploadFiles(files = []) {
    const queue = Array.from(files || []).filter(Boolean);
    if (queue.length === 0) return [];
    setIsUploading(true);
    try {
      const uploaded = [];
      for (const file of queue) {
        const init = await shell.initMedia({});
        await shell.uploadMediaBinary(init.uploadUrl, {
          uploadToken: init.uploadToken,
          file,
          mimeType: file.type
        });
        const payload = await shell.finalizeMedia(init.mediaId, {
          uploadToken: init.uploadToken,
          filename: file.name || 'upload.bin',
          mimeType: file.type || 'application/octet-stream',
          size: Number(file.size || 0),
          alt: '',
          caption: '',
          description: ''
        });
        if (payload?.media) {
          uploaded.push(payload.media);
        }
      }
      await refresh();
      if (uploaded[0]) {
        selectItem(uploaded[0]);
      }
      return uploaded;
    } finally {
      setIsUploading(false);
    }
  }

  async function deleteMedia(mediaId) {
    await shell.deleteMedia(mediaId);
    if (selectedId === mediaId) {
      setSelectedId(null);
      setAlt('');
      setCaption('');
      setDescription('');
    }
    await refresh();
  }

  async function bulkDeleteSelected() {
    const ids = [...selectedRowIds];
    if (ids.length === 0) return 0;
    const settled = await Promise.allSettled(ids.map((id) => shell.deleteMedia(id)));
    const successfulIds = [];
    const failures = [];
    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulIds.push(ids[index]);
      } else {
        failures.push({ id: ids[index], error: result.reason });
      }
    });
    if (failures.length > 0) {
      console.error('bulkDeleteSelected failed for media items', failures);
    }
    clearSelectedRows();
    if (selectedId && successfulIds.includes(selectedId)) {
      setSelectedId(null);
      setAlt('');
      setCaption('');
      setDescription('');
    }
    await refresh();
    return successfulIds.length;
  }

  return {
    items,
    search,
    mimeTypeFilter,
    page,
    pagination,
    isLoading,
    isSaving,
    isUploading,
    selectedRowIds,
    selectedId,
    alt,
    caption,
    description,
    setSearch,
    setMimeTypeFilter,
    setPage,
    selectItem,
    setAlt,
    setCaption,
    setDescription,
    toggleRowSelection,
    clearSelectedRows,
    refresh,
    saveSelected,
    uploadFiles,
    deleteMedia,
    bulkDeleteSelected,
    getSelectedItem: selectedItem
  };
}
