import { getSharedHooksRegistry, resetSharedHooksRegistry } from '../../../packages/hooks/src/index.js';
import { HOOK_NAMES } from './hooks.js';

const SERVER_HOOK_REGISTRARS_KEY = '__edgepress_server_hook_registrars__';
const SERVER_HOOK_REGISTRARS_ATTACHED_KEY = '__edgepress_server_hook_registrars_attached__';
const SERVER_HOOK_REGISTRARS_FAILURE_COUNTS_KEY = '__edgepress_server_hook_registrars_failure_counts__';

function getRegistrarList() {
  if (!Array.isArray(globalThis[SERVER_HOOK_REGISTRARS_KEY])) {
    globalThis[SERVER_HOOK_REGISTRARS_KEY] = [];
  }
  return globalThis[SERVER_HOOK_REGISTRARS_KEY];
}

function getAttachedRegistrarMap() {
  if (!(globalThis[SERVER_HOOK_REGISTRARS_ATTACHED_KEY] instanceof WeakMap)) {
    globalThis[SERVER_HOOK_REGISTRARS_ATTACHED_KEY] = new WeakMap();
  }
  return globalThis[SERVER_HOOK_REGISTRARS_ATTACHED_KEY];
}

function getAttachedRegistrarSet(hooks) {
  const attachedMap = getAttachedRegistrarMap();
  let attached = attachedMap.get(hooks);
  if (!(attached instanceof WeakSet)) {
    attached = new WeakSet();
    attachedMap.set(hooks, attached);
  }
  return attached;
}

function getRegistrarFailureCountMap() {
  if (!(globalThis[SERVER_HOOK_REGISTRARS_FAILURE_COUNTS_KEY] instanceof WeakMap)) {
    globalThis[SERVER_HOOK_REGISTRARS_FAILURE_COUNTS_KEY] = new WeakMap();
  }
  return globalThis[SERVER_HOOK_REGISTRARS_FAILURE_COUNTS_KEY];
}

function getRegistrarFailureCounts(hooks) {
  const failureCountMap = getRegistrarFailureCountMap();
  let counts = failureCountMap.get(hooks);
  if (!(counts instanceof WeakMap)) {
    counts = new WeakMap();
    failureCountMap.set(hooks, counts);
  }
  return counts;
}

function logRegistrarAttachFailure(platform, registrar, error, failureCount) {
  if (failureCount !== 1) return;
  if (!platform?.runtime || typeof platform.runtime.log !== 'function') return;
  platform.runtime.log('error', 'hooks_registrar_attach_failed', {
    registrar: registrar.name || 'anonymous',
    message: error?.message || String(error)
  });
}

function attachRegistrar(registrar, hooks, platform, attachedRegistrars, registrarFailureCounts) {
  if (attachedRegistrars.has(registrar)) return;
  try {
    registrar({
      hooks,
      hookNames: HOOK_NAMES,
      platform
    });
    attachedRegistrars.add(registrar);
  } catch (error) {
    const nextFailureCount = (registrarFailureCounts.get(registrar) || 0) + 1;
    registrarFailureCounts.set(registrar, nextFailureCount);
    logRegistrarAttachFailure(platform, registrar, error, nextFailureCount);
  }
}

export function registerServerHookRegistrar(registrar) {
  if (typeof registrar !== 'function') {
    throw new TypeError('Server hook registrar must be a function');
  }
  getRegistrarList().push(registrar);
  return registrar;
}

export function listServerHookRegistrars() {
  return getRegistrarList().slice();
}

export function attachServerHooks(platform, options = {}) {
  const hooks = platform?.hooks || getSharedHooksRegistry();
  const attachedRegistrars = getAttachedRegistrarSet(hooks);
  const registrarFailureCounts = getRegistrarFailureCounts(hooks);
  const registrars = [
    ...listServerHookRegistrars(),
    ...(Array.isArray(options.registrars) ? options.registrars : [])
  ];

  for (const registrar of registrars) {
    attachRegistrar(registrar, hooks, platform, attachedRegistrars, registrarFailureCounts);
  }

  if (platform && typeof platform === 'object') {
    platform.hooks = hooks;
  }

  return hooks;
}

export function resetServerHookRegistrarsForTests() {
  globalThis[SERVER_HOOK_REGISTRARS_KEY] = [];
  globalThis[SERVER_HOOK_REGISTRARS_ATTACHED_KEY] = new WeakMap();
  globalThis[SERVER_HOOK_REGISTRARS_FAILURE_COUNTS_KEY] = new WeakMap();
  return resetSharedHooksRegistry();
}
