import crypto from 'node:crypto';

export function createCloudflareRuntime({ baseRuntime, env, ctx }) {
  return {
    ...baseRuntime,
    env(key) {
      return env[key] || process.env[key];
    },
    async hmacSign(input, keyRef = 'TOKEN_KEY') {
      const key = this.env(keyRef);
      if (!key) {
        throw new Error(`Missing required runtime secret: ${keyRef}`);
      }
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
      return baseRuntime.base64urlEncode(value);
    },
    base64urlDecode(value) {
      return baseRuntime.base64urlDecode(value);
    },
    waitUntil(promise) {
      if (ctx?.waitUntil) {
        ctx.waitUntil(promise);
        return;
      }
      baseRuntime.waitUntil(promise);
    }
  };
}
