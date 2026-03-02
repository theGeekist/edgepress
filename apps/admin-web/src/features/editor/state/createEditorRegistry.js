import { createRegistry, plugins } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { store as blocksStore } from '@wordpress/blocks';
import { store as coreDataStore } from '@wordpress/core-data';
import { store as editorStore } from '@wordpress/editor';
import { store as interfaceStore } from '@wordpress/interface';
import { store as keyboardShortcutsStore } from '@wordpress/keyboard-shortcuts';
import { store as noticesStore } from '@wordpress/notices';
import { store as preferencesStore } from '@wordpress/preferences';
import { store as richTextStore } from '@wordpress/rich-text';
import { storeHotSwapPlugin } from './storeHotSwapPlugin.js';
import { registerFoundationalBlocks } from '../registerBlocks.js';

function safeRegister(registry, storeDescriptor) {
  try {
    return registry.register(storeDescriptor);
  } catch (error) {
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      console.warn('[createEditorRegistry] Failed to register store descriptor', storeDescriptor, error);
    }
    return null;
  }
}

export function createEditorRegistry({ parentRegistry = null, persistenceKey = null } = {}) {
  if (typeof globalThis !== 'undefined' && globalThis.window) {
    registerFoundationalBlocks();
  }
  const registry = createRegistry({}, parentRegistry || undefined);

  if (persistenceKey) {
    registry.use(plugins.persistence, { persistenceKey });
  }

  safeRegister(registry, preferencesStore);
  safeRegister(registry, interfaceStore);
  safeRegister(registry, keyboardShortcutsStore);
  safeRegister(registry, noticesStore);
  safeRegister(registry, blocksStore);
  safeRegister(registry, coreDataStore);
  safeRegister(registry, richTextStore);
  safeRegister(registry, blockEditorStore);
  safeRegister(registry, editorStore);

  registry.use(storeHotSwapPlugin, {});
  return registry;
}
