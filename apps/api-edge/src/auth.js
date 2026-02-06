import { assertHasCapability } from '../../../packages/domain/src/invariants.js';

export async function createAccessToken(runtime, user) {
  const payload = Buffer.from(
    JSON.stringify({
      userId: user.id,
      iat: runtime.now().toISOString(),
      nonce: runtime.uuid()
    })
  ).toString('base64url');
  const signature = await runtime.hmacSign(payload, 'TOKEN_KEY');
  return `${payload}.${signature}`;
}

export async function verifyAccessToken(runtime, token, store) {
  if (!token || !token.includes('.')) return null;
  const splitAt = token.lastIndexOf('.');
  const payload = token.slice(0, splitAt);
  const signature = token.slice(splitAt + 1);
  const ok = await runtime.hmacVerify(payload, signature, 'TOKEN_KEY');
  if (!ok) return null;
  const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  const userId = parsed?.userId;
  return store.getUserById(userId);
}

export async function requireCapability({ runtime, store, request, capability }) {
  const { getBearerToken } = await import('./http.js');
  const token = getBearerToken(request);
  const user = await verifyAccessToken(runtime, token, store);
  assertHasCapability(user, capability);
  return user;
}
