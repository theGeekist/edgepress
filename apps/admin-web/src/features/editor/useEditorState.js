import { useState } from 'react';
import { parse, serialize } from '@wordpress/blocks';

function toBlocks(content) {
  if (!content) return [];
  try {
    return parse(content);
  } catch {
    return [];
  }
}

export function useEditorState(shell) {
  const [blocks, setBlocks] = useState([]);

  function openDocument(doc, setSelectedId, setTitle) {
    setSelectedId(doc.id);
    setTitle(doc.title || '');
    if (Array.isArray(doc.blocks)) {
      setBlocks(doc.blocks);
      return;
    }
    setBlocks(toBlocks(doc.content));
  }

  async function saveDocument(selectedId, title) {
    if (!selectedId) return null;
    const content = serialize(blocks);
    const updated = await shell.updateDocument(selectedId, { title, blocks, content });
    return updated.document;
  }

  return {
    blocks,
    setBlocks,
    openDocument,
    saveDocument
  };
}
