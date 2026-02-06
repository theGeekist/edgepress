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

function normalizePersistedBlocks(inputBlocks) {
  try {
    // Parse(serialized) drops transient editor-only fields before persistence.
    return parse(serialize(Array.isArray(inputBlocks) ? inputBlocks : []));
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
    const persistedBlocks = normalizePersistedBlocks(blocks);
    const content = serialize(persistedBlocks);
    const updated = await shell.updateDocument(selectedId, {
      title,
      blocks: persistedBlocks,
      content
    });
    return updated.document;
  }

  return {
    blocks,
    setBlocks,
    openDocument,
    saveDocument
  };
}
