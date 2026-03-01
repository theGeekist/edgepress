import { createRegistry, plugins } from '@wordpress/data';
import { storeConfig as blockEditorStoreConfig } from '@wordpress/block-editor';
import { storeConfig as editorStoreConfig } from '@wordpress/editor';
import { storeHotSwapPlugin } from './storeHotSwapPlugin.js';

function safeRegister(registry, name, config) {
  try {
    return registry.registerStore(name, config);
  } catch {
    return null;
  }
}

export function createEditorRegistry({ parentRegistry = null, persistenceKey = null } = {}) {
  const registry = createRegistry({}, parentRegistry || undefined);

  if (persistenceKey) {
    registry.use(plugins.persistence, { persistenceKey });
  }

  safeRegister(registry, 'core/block-editor', {
    ...blockEditorStoreConfig,
    persist: ['preferences']
  });

  safeRegister(registry, 'core/editor', {
    ...editorStoreConfig,
    persist: ['preferences']
  });

  registry.use(storeHotSwapPlugin, {});
  return registry;
}
