import { createRegistry, plugins } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { store as blocksStore } from '@wordpress/blocks';
import { store as editorStore } from '@wordpress/editor';
import { store as interfaceStore } from '@wordpress/interface';
import { store as keyboardShortcutsStore } from '@wordpress/keyboard-shortcuts';
import { store as noticesStore } from '@wordpress/notices';
import { store as preferencesStore } from '@wordpress/preferences';
import { store as richTextStore } from '@wordpress/rich-text';
import { storeHotSwapPlugin } from './storeHotSwapPlugin.js';

function safeRegister(registry, storeDescriptor) {
  try {
    return registry.register(storeDescriptor);
  } catch {
    return null;
  }
}

export function createEditorRegistry({ parentRegistry = null, persistenceKey = null } = {}) {
  const registry = createRegistry({}, parentRegistry || undefined);

  if (persistenceKey) {
    registry.use(plugins.persistence, { persistenceKey });
  }

  safeRegister(registry, preferencesStore);
  safeRegister(registry, interfaceStore);
  safeRegister(registry, keyboardShortcutsStore);
  safeRegister(registry, noticesStore);
  safeRegister(registry, blocksStore);
  safeRegister(registry, richTextStore);
  safeRegister(registry, blockEditorStore);
  safeRegister(registry, editorStore);

  registry.use(storeHotSwapPlugin, {});
  return registry;
}
