import { getSharedEdgepressHooks } from '../../../packages/hooks/src/index.js';

export const EDGEPRESS_HOOK_NAMES = {
  publishProvenanceFilter: 'edgepress.publish.provenance',
  documentWrittenAction: 'edgepress.document.written',
  revisionCreatedAction: 'edgepress.revision.created',
  publishStartedAction: 'edgepress.publish.started',
  publishCompletedAction: 'edgepress.publish.completed',
  releaseActivatedAction: 'edgepress.release.activated'
};

function asErrorMessage(error) {
  if (!error) return 'Unknown hook error';
  if (typeof error.message === 'string' && error.message) return error.message;
  return String(error);
}

function isThenable(value) {
  return Boolean(value) && typeof value.then === 'function';
}

export function resolveEdgepressHooks(platform) {
  if (
    platform?.hooks &&
    typeof platform.hooks.addAction === 'function' &&
    typeof platform.hooks.doAction === 'function' &&
    typeof platform.hooks.addFilter === 'function' &&
    typeof platform.hooks.applyFilters === 'function'
  ) {
    return platform.hooks;
  }
  return getSharedEdgepressHooks();
}

export async function applyEdgepressFilter(hooks, hookName, payload) {
  if (!hooks || typeof hooks.applyFilters !== 'function') return payload;
  const result = hooks.applyFilters(hookName, payload);
  return isThenable(result) ? await result : result;
}

export function doEdgepressAction(runtime, hooks, hookName, payload) {
  if (!hooks || typeof hooks.doAction !== 'function') return;
  // Intentional contract: actions are scheduled and not awaited by the request lifecycle.
  runtime.waitUntil(
    Promise.resolve()
      .then(() => hooks.doAction(hookName, payload))
      .catch((error) => {
        runtime.log('error', 'hook_async_error', {
          hook: hookName,
          message: asErrorMessage(error)
        });
      })
  );
}
