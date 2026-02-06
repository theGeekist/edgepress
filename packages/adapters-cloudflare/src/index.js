import crypto from 'node:crypto';
import { createInMemoryPlatform } from '../../testing/src/inMemoryPlatform.js';

/**
 * Reference Cloudflare adapter implementation.
 * This package is the only place where Cloudflare binding names should appear.
 */
export function createCloudflareReferencePlatform(env = {}) {
  const base = createInMemoryPlatform();

  const runtime = {
    ...base.runtime,
    env(key) {
      return env[key] || process.env[key];
    },
    async hmacSign(input, keyRef = 'TOKEN_KEY') {
      const key = this.env(keyRef) || 'cf-dev-token-key';
      return crypto.createHmac('sha256', key).update(input).digest('hex');
    },
    requestContext(request) {
      const cfRay = request?.headers.get('cf-ray') || `ray_${crypto.randomUUID().slice(0, 8)}`;
      const ipHash = request?.headers.get('cf-connecting-ip') || 'cf_ip_unknown';
      return {
        traceId: request?.headers.get('x-trace-id') || cfRay,
        ipHash,
        userAgentHash: request?.headers.get('user-agent') || 'cf_ua_unknown',
        requestId: cfRay
      };
    },
    base64urlEncode(value) {
      return base.runtime.base64urlEncode(value);
    },
    base64urlDecode(value) {
      return base.runtime.base64urlDecode(value);
    }
  };

  const releaseStore = {
    ...base.releaseStore,
    async writeArtifact(releaseId, route, bytes, contentType = 'text/html') {
      return base.releaseStore.writeArtifact(releaseId, route, bytes, contentType);
    }
  };

  return {
    ...base,
    runtime,
    releaseStore
  };
}
