import { getSharedHooksRegistry, resetSharedHooksRegistry } from '../../../packages/hooks/src/index.js';
import { HOOK_NAMES } from './hooks.js';

const SERVER_HOOK_REGISTRARS_KEY = '__edgepress_server_hook_registrars__';
const SERVER_HOOK_REGISTRARS_ATTACHED_KEY = '__edgepress_server_hook_registrars_attached__';

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
  const registrars = [
    ...listServerHookRegistrars(),
    ...(Array.isArray(options.registrars) ? options.registrars : [])
  ];

  for (const registrar of registrars) {
    if (attachedRegistrars.has(registrar)) continue;
    registrar({
      hooks,
      hookNames: HOOK_NAMES,
      platform
    });
    attachedRegistrars.add(registrar);
  }

  if (platform && typeof platform === 'object') {
    platform.hooks = hooks;
  }

  return hooks;
}

export function resetServerHookRegistrarsForTests() {
  globalThis[SERVER_HOOK_REGISTRARS_KEY] = [];
  globalThis[SERVER_HOOK_REGISTRARS_ATTACHED_KEY] = new WeakMap();
  return resetSharedHooksRegistry();
}
