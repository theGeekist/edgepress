import { useState } from 'react';
import { createBlock, parse, serialize } from '@wordpress/blocks';

function toBlocks(content) {
  if (!content) return [];
  try {
    return parse(content);
  } catch {
    return [];
  }
}

function withStarterBlock(blocks) {
  if (Array.isArray(blocks) && blocks.length > 0) return blocks;
  return [createBlock('core/paragraph')];
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
      setBlocks(withStarterBlock(doc.blocks));
      return;
    }
    setBlocks(withStarterBlock(toBlocks(doc.content)));
  }

  async function saveDocument(selectedId, title, options = {}) {
    if (!selectedId) return null;
    const persistedBlocks = normalizePersistedBlocks(blocks);
    const content = serialize(persistedBlocks);
    const payload = {
      title,
      blocks: persistedBlocks,
      content
    };
    if (options.slug !== undefined) {
      payload.slug = options.slug;
    }
    if (options.type !== undefined) {
      payload.type = options.type;
    }
    const updated = await shell.updateDocument(selectedId, payload);
    return updated.document;
  }

  return {
    blocks,
    setBlocks,
    openDocument,
    saveDocument
  };
}
