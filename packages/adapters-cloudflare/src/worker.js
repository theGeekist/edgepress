import { createApiHandler } from '../../../apps/api-edge/src/app.js';
import { createCloudflareReferencePlatform } from './index.js';

let cachedEnv = null;
let cachedHandler = null;
let cachedPlatform = null;

export default {
  async fetch(request, env, ctx) {
    if (!cachedHandler || cachedEnv !== env) {
      cachedPlatform = createCloudflareReferencePlatform(env, { ctx: null });
      cachedHandler = createApiHandler(cachedPlatform);
      cachedEnv = env;
    }
    cachedPlatform.runtime.waitUntil = (promise) => ctx.waitUntil(promise);
    return cachedHandler(request);
  }
};
