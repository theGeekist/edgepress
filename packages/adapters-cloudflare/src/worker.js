import { createApiHandler } from '../../../apps/api-edge/src/app.js';
import { createCloudflareReferencePlatform } from './index.js';

export default {
  async fetch(request, env, ctx) {
    const platform = createCloudflareReferencePlatform(env, { ctx });
    const handler = createApiHandler(platform);
    return handler(request);
  }
};
