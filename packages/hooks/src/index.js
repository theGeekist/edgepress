import { createHooks } from '@wordpress/hooks';

const EDGEPRESS_HOOKS_GLOBAL_KEY = '__edgepress_hooks_registry__';

export function createHooksRegistry() {
  return createHooks();
}

export function getSharedHooksRegistry() {
  if (!globalThis[EDGEPRESS_HOOKS_GLOBAL_KEY]) {
    globalThis[EDGEPRESS_HOOKS_GLOBAL_KEY] = createHooksRegistry();
  }
  return globalThis[EDGEPRESS_HOOKS_GLOBAL_KEY];
}

export function resetSharedHooksRegistry() {
  globalThis[EDGEPRESS_HOOKS_GLOBAL_KEY] = createHooksRegistry();
  return globalThis[EDGEPRESS_HOOKS_GLOBAL_KEY];
}

// Backward-compatible aliases; prefer the neutral names above.
export const createEdgepressHooks = createHooksRegistry;
export const getSharedEdgepressHooks = getSharedHooksRegistry;
