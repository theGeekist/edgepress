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

export function assertContractMethod(target, method) {
  if (!target || typeof target[method] !== 'function') {
    throw new Error(`Missing required contract method: ${method}`);
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
  for (const method of required) assertContractMethod(runtime, method);
}

export function assertPlatformContracts(platform) {
  if (!platform) throw new Error('Missing platform dependencies');

  assertRuntimeContract(platform.runtime);
  assertContractMethod(platform.store, 'tx');
  assertContractMethod(platform.store, 'listDocuments');
  assertContractMethod(platform.store, 'createDocument');
  assertContractMethod(platform.store, 'listRevisions');
  assertContractMethod(platform.blobStore, 'putBlob');
  assertContractMethod(platform.cacheStore, 'get');
  assertContractMethod(platform.releaseStore, 'writeArtifact');
  assertContractMethod(platform.releaseStore, 'writeManifest');
  assertContractMethod(platform.releaseStore, 'activateIfNone');
  assertContractMethod(platform.previewStore, 'createPreview');
}
