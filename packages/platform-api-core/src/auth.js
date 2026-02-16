export async function createAccessToken(runtime, user) {
  const payload = runtime.base64urlEncode(
    JSON.stringify({
      userId: user.id,
      iat: runtime.now().toISOString(),
      nonce: runtime.uuid()
    })
  );
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
  const parsed = JSON.parse(runtime.base64urlDecode(payload));
  const userId = parsed?.userId;
  return store.getUserById(userId);
}

export async function requireCapability({ runtime, store, request, capability }) {
  const { getBearerToken } = await import('./http.js');
  const token = getBearerToken(request);
  if (!token) {
    const err = new Error('Authentication required');
    err.status = 401;
    err.code = 'AUTH_REQUIRED';
    throw err;
  }

  const user = await verifyAccessToken(runtime, token, store);
  if (!user) {
    const err = new Error('Invalid access token');
    err.status = 401;
    err.code = 'AUTH_INVALID_TOKEN';
    throw err;
  }
  if (!Array.isArray(user.capabilities) || !user.capabilities.includes(capability)) {
    const err = new Error(`Missing capability: ${capability}`);
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }
  return user;
}
