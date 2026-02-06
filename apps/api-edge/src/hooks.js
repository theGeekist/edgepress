import { getSharedHooksRegistry } from '../../../packages/hooks/src/index.js';
import { toErrorMessage } from '../../../packages/domain/src/errors.js';

export const HOOK_NAMES = {
  publishProvenanceFilter: 'edgepress.publish.provenance',
  documentWrittenAction: 'edgepress.document.written',
  documentTrashedAction: 'edgepress.document.trashed',
  documentDeletedAction: 'edgepress.document.deleted',
  revisionCreatedAction: 'edgepress.revision.created',
  publishStartedAction: 'edgepress.publish.started',
  publishCompletedAction: 'edgepress.publish.completed',
  releaseActivatedAction: 'edgepress.release.activated'
};

const WARNED_HOOKS_FALLBACK_KEY = '__edgepress_warned_hooks_fallback__';

function hasHookMethod(hooks, name) {
  return typeof hooks?.[name] === 'function';
}

// Contract: provided platform.hooks must be a WordPress-compatible registry surface.
// We intentionally reject partial "4-method" shims to avoid semantic drift across runtimes.
function isWpCompatibleHooksRegistry(hooks) {
  return (
    hasHookMethod(hooks, 'addAction') &&
    hasHookMethod(hooks, 'doAction') &&
    hasHookMethod(hooks, 'addFilter') &&
    hasHookMethod(hooks, 'applyFilters') &&
    hasHookMethod(hooks, 'removeAction') &&
    hasHookMethod(hooks, 'removeFilter') &&
    hasHookMethod(hooks, 'hasAction') &&
    hasHookMethod(hooks, 'hasFilter') &&
    hasHookMethod(hooks, 'removeAllActions') &&
    hasHookMethod(hooks, 'removeAllFilters') &&
    hasHookMethod(hooks, 'doingAction') &&
    hasHookMethod(hooks, 'doingFilter') &&
    hasHookMethod(hooks, 'didAction') &&
    hasHookMethod(hooks, 'didFilter') &&
    hasHookMethod(hooks, 'currentAction') &&
    hasHookMethod(hooks, 'currentFilter')
  );
}

export function resolveHooks(platform) {
  if (isWpCompatibleHooksRegistry(platform?.hooks)) {
    return platform.hooks;
  }
  if (platform?.hooks && platform?.runtime && typeof platform.runtime.log === 'function') {
    if (!globalThis[WARNED_HOOKS_FALLBACK_KEY]) {
      globalThis[WARNED_HOOKS_FALLBACK_KEY] = true;
      platform.runtime.log('warn', 'hooks_registry_fallback_wp_compat_required', {
        required: [
          'addAction',
          'doAction',
          'addFilter',
          'applyFilters',
          'removeAction',
          'removeFilter',
          'hasAction',
          'hasFilter',
          'removeAllActions',
          'removeAllFilters',
          'doingAction',
          'doingFilter',
          'didAction',
          'didFilter',
          'currentAction',
          'currentFilter'
        ]
      });
    }
  }
  return getSharedHooksRegistry();
}

export function applyFilters(hooks, hookName, payload) {
  if (!hooks || typeof hooks.applyFilters !== 'function') return payload;
  return hooks.applyFilters(hookName, payload);
}

export function doAction(runtime, hooks, hookName, payload) {
  if (!hooks || typeof hooks.doAction !== 'function') return;
  // Keep WordPress-compatible sync dispatch semantics on server actions.
  // Action callback errors are surfaced to the caller unless registrars handle them internally.
  try {
    hooks.doAction(hookName, payload);
  } catch (error) {
    runtime.log('error', 'hook_sync_error', {
      hook: hookName,
      message: toErrorMessage(error, 'Unknown hook error')
    });
    throw error;
  }
}
