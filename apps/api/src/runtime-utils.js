export function parseTtlSeconds(value, { fallback, min, max }) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min) {
    return fallback;
  }
  return Math.min(parsed, max);
}

export async function signPreviewToken(runtime, previewToken) {
  return runtime.hmacSign(previewToken, 'PREVIEW_TOKEN_KEY');
}

export async function verifyPreviewTokenSignature(runtime, previewToken, signature) {
  if (!signature) return false;
  return runtime.hmacVerify(previewToken, signature, 'PREVIEW_TOKEN_KEY');
}

export async function buildPrivateCacheScope(runtime, user) {
  const capabilityScope = Array.isArray(user?.capabilities) ? user.capabilities.slice().sort().join(',') : '';
  return runtime.hmacSign(`${user?.id || 'unknown'}|${capabilityScope}`, 'PRIVATE_CACHE_SCOPE_KEY');
}
