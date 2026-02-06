/**
 * EdgeRuntimePort contract:
 * - env(key)
 * - now(), uuid(), log(level,event,meta)
 * - requestContext(request)
 * - waitUntil(promise)
 * - hmacSign(input,keyRef), hmacVerify(input,signature,keyRef)
 * - optional rateLimit(key,policy)
 */

export function assertPortMethod(port, method) {
  if (!port || typeof port[method] !== 'function') {
    throw new Error(`Missing required port method: ${method}`);
  }
}

export function assertRuntimePort(runtime) {
  const required = [
    'env',
    'now',
    'uuid',
    'log',
    'requestContext',
    'waitUntil',
    'hmacSign',
    'hmacVerify',
    'base64urlEncode',
    'base64urlDecode'
  ];
  for (const method of required) assertPortMethod(runtime, method);
}

export function assertPlatformPorts(platform) {
  if (!platform) throw new Error('Missing platform dependencies');

  assertRuntimePort(platform.runtime);
  assertPortMethod(platform.store, 'tx');
  assertPortMethod(platform.store, 'listDocuments');
  assertPortMethod(platform.store, 'createDocument');
  assertPortMethod(platform.store, 'listRevisions');
  assertPortMethod(platform.blobStore, 'putBlob');
  assertPortMethod(platform.cacheStore, 'get');
  assertPortMethod(platform.releaseStore, 'writeArtifact');
  assertPortMethod(platform.releaseStore, 'writeManifest');
  assertPortMethod(platform.previewStore, 'createPreview');
}
