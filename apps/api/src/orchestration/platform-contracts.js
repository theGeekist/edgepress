/**
 * Edge runtime contract:
 * - env(key)
 * - now(), uuid(), log(level,event,meta)
 * - requestContext(request)
 * - waitUntil(promise)
 * - hmacSign(input,keyRef), hmacVerify(input,signature,keyRef)
 * - base64urlEncode(input), base64urlDecode(input)
 * - optional rateLimit(key,policy)
 */

export function assertContractMethod(target, method, targetName = 'unknown') {
  if (!target || typeof target[method] !== 'function') {
    throw new Error(`Missing required contract method: ${targetName}.${method}`);
  }
}

export function assertRuntimeContract(runtime) {
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
  for (const method of required) assertContractMethod(runtime, method, 'runtime');
}

export function assertPlatformContracts(platform) {
  if (!platform) throw new Error('Missing platform dependencies');

  assertRuntimeContract(platform.runtime);
  assertContractMethod(platform.store, 'tx', 'store');
  assertContractMethod(platform.store, 'listDocuments', 'store');
  assertContractMethod(platform.store, 'createDocument', 'store');
  assertContractMethod(platform.store, 'listRevisions', 'store');
  assertContractMethod(platform.blobStore, 'putBlob', 'blobStore');
  assertContractMethod(platform.cacheStore, 'get', 'cacheStore');
  assertContractMethod(platform.releaseStore, 'writeArtifact', 'releaseStore');
  assertContractMethod(platform.releaseStore, 'writeManifest', 'releaseStore');
  assertContractMethod(platform.releaseStore, 'activateIfNone', 'releaseStore');
  assertContractMethod(platform.previewStore, 'createPreview', 'previewStore');
}
