import { useState } from 'react';

export function useDocumentsState(shell) {
  const [docs, setDocs] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [title, setTitle] = useState('');

  async function refresh() {
    const payload = await shell.listDocuments();
    const items = payload.items || [];
    setDocs(items);
    return items;
  }

  async function createDraft() {
    const created = await shell.createDocument({ title: 'Untitled', content: '' });
    await refresh();
    return created.document;
  }

  return {
    docs,
    selectedId,
    setSelectedId,
    title,
    setTitle,
    refresh,
    createDraft
  };
}
