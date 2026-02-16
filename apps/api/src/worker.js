import { createCloudflareReferencePlatform } from '@geekist/edgepress/cloudflare';
import { createApiHandler } from './app.js';
import { attachServerHooks } from './hooks-bootstrap.js';

let cachedEnv = null;
let cachedHandler = null;
let cachedPlatform = null;

export default {
  async fetch(request, env, ctx) {
    if (!cachedHandler || cachedEnv !== env) {
      cachedPlatform = createCloudflareReferencePlatform(env, { ctx: null });
      attachServerHooks(cachedPlatform);
      cachedHandler = createApiHandler(cachedPlatform);
      cachedEnv = env;
    }
    cachedPlatform.runtime.waitUntil = (promise) => ctx.waitUntil(promise);
    return cachedHandler(request);
  }
};
