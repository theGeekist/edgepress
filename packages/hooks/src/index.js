import { createHooks } from '@wordpress/hooks';

const EDGEPRESS_HOOKS_GLOBAL_KEY = '__edgepress_hooks_registry__';

export function createEdgepressHooks() {
  return createHooks();
}

export function getSharedEdgepressHooks() {
  if (!globalThis[EDGEPRESS_HOOKS_GLOBAL_KEY]) {
    globalThis[EDGEPRESS_HOOKS_GLOBAL_KEY] = createEdgepressHooks();
  }
  return globalThis[EDGEPRESS_HOOKS_GLOBAL_KEY];
}
