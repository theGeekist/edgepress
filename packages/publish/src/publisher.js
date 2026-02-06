import { assertReleaseManifestImmutable } from '../../domain/src/invariants.js';

function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0).toString(16).padStart(8, '0');
}

export async function createRelease({ runtime, store, blobStore, releaseStore, sourceRevisionId, publishedBy }) {
  const docs = await store.listDocuments();
  const createdAt = runtime.now().toISOString();
  const releaseId = `rel_${runtime.uuid()}`;

  const artifacts = [];
  for (const doc of docs) {
    const route = doc.id;
    const html = `<html><body><article><h1>${doc.title}</h1>${doc.content}</article></body></html>`;
    const hash = hashString(html);
    const path = `${releaseId}/${route}.html`;
    await blobStore.putBlob(path, html, { contentType: 'text/html' });
    artifacts.push({ route, path, hash, contentType: 'text/html' });
  }

  const existing = await releaseStore.getManifest(releaseId);
  assertReleaseManifestImmutable(existing);

  const manifest = {
    releaseId,
    schemaVersion: 1,
    createdAt,
    publishedBy,
    sourceRevisionId: sourceRevisionId || null,
    artifacts
  };

  await releaseStore.writeManifest(releaseId, manifest);
  return manifest;
}
