export function createRuntimePlatform() {
  const runtime = {
    envOverrides: {},
    env(key) {
      if (key === 'TOKEN_KEY') return 'dev-token-key';
      if (Object.prototype.hasOwnProperty.call(this.envOverrides, key)) {
        return this.envOverrides[key];
      }
      return process.env[key];
    },
    now() {
      return new Date();
    },
    uuid() {
      return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    },
    log(level, event, meta) {
      if (process.env.NODE_ENV !== 'test') {
        console.log(`[${level}] ${event}`, meta || {});
      }
    },
    requestContext(request) {
      const url = request ? new URL(request.url) : null;
      return {
        traceId: request?.headers.get('x-trace-id') || this.uuid(),
        ipHash: request?.headers.get('x-ip-hash') || 'ip_local',
        userAgentHash: request?.headers.get('x-ua-hash') || 'ua_local',
        requestId: url ? `${url.pathname}:${Date.now()}` : `req:${Date.now()}`
      };
    },
    waitUntil(promise) {
      promise.catch((err) => this.log('error', 'waitUntil_failure', { message: err.message }));
    },
    async hmacSign(input, keyRef = 'TOKEN_KEY') {
      const key = this.env(keyRef) || 'fallback';
      const encoder = new TextEncoder();
      const keyData = encoder.encode(key);
      const data = encoder.encode(input);

      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
      return Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    },
    async hmacVerify(input, signature, keyRef = 'TOKEN_KEY') {
      const signed = await this.hmacSign(input, keyRef);
      return signed === signature;
    },
    base64urlEncode(value) {
      const payload = typeof value === 'string' ? value : JSON.stringify(value);
      return Buffer.from(payload, 'utf8').toString('base64url');
    },
    base64urlDecode(value) {
      return Buffer.from(value, 'base64url').toString('utf8');
    }
  };

  return runtime;
}
