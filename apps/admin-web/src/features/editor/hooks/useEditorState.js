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

function withStarterBlock(blocks) {
  if (Array.isArray(blocks) && blocks.length > 0) return blocks;
  return [];
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isValidWpBlockNode(block, depth = 0, seen = new WeakSet()) {
  if (!isObject(block)) return false;
  if (depth > 40) return false;
  if (seen.has(block)) return false;
  seen.add(block);

  if (typeof block.name !== 'string' || !block.name.trim()) return false;
  if (!isObject(block.attributes) && block.attributes !== undefined) return false;
  if (!Array.isArray(block.innerBlocks)) return false;

  for (const child of block.innerBlocks) {
    if (!isValidWpBlockNode(child, depth + 1, seen)) return false;
  }
  return true;
}

function normalizeBlocksForEditor(inputBlocks) {
  if (!Array.isArray(inputBlocks)) return null;
  if (inputBlocks.length === 0) return [];
  const seen = new WeakSet();
  for (const block of inputBlocks) {
    if (!isValidWpBlockNode(block, 0, seen)) {
      return null;
    }
  }
  return inputBlocks;
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
  const [postType, setPostType] = useState('post');

  function openDocument(doc, setSelectedId, setTitle) {
    setSelectedId(doc.id);
    setTitle(doc.title || '');
    const nextType = doc?.ui?.type === 'page' || doc?.type === 'page' ? 'page' : 'post';
    setPostType(nextType);
    if (Array.isArray(doc.blocks)) {
      const normalized = normalizeBlocksForEditor(doc.blocks);
      if (normalized) {
        setBlocks(withStarterBlock(normalized));
        return;
      }
    }
    const parsed = withStarterBlock(toBlocks(doc.content));
    if (Array.isArray(parsed) && parsed.length > 0) {
      setBlocks(parsed);
      return;
    }
    setBlocks([]);
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
    if (options.featuredImageId !== undefined) {
      payload.featuredImageId = String(options.featuredImageId || '').trim();
    }
    const updated = await shell.updateDocument(selectedId, payload);
    return updated.document;
  }

  return {
    blocks,
    setBlocks,
    postType,
    openDocument,
    saveDocument
  };
}
