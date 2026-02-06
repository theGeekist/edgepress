import { assertReleaseManifestImmutable } from '../../domain/src/invariants.js';
import { normalizePublishProvenanceInput } from '../../domain/src/provenance.js';
import { serialize } from '@wordpress/blocks';

// Non-cryptographic hash for deterministic testable fingerprints only.
function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0).toString(16).padStart(8, '0');
}

function asErrorMessage(error) {
  if (!error) return 'Unknown serialization error';
  if (typeof error.message === 'string' && error.message) return error.message;
  return String(error);
}

function serializeBlocks(runtime, doc) {
  if (!Array.isArray(doc.blocks)) return '';
  try {
    const serialized = serialize(doc.blocks);
    if (doc.blocks.length > 0 && !serialized) {
      runtime.log('warn', 'publish_blocks_empty_serialization', {
        documentId: doc.id,
        blockCount: doc.blocks.length
      });
    }
    return serialized;
  } catch (error) {
    runtime.log('warn', 'publish_blocks_serialize_failed', {
      documentId: doc.id,
      blockCount: doc.blocks.length,
      message: asErrorMessage(error)
    });
    return '';
  }
}

export async function createRelease({ runtime, store, releaseStore, sourceRevisionId, sourceRevisionSet, publishedBy }) {
  const docs = await store.listDocuments();
  const createdAt = runtime.now().toISOString();
  const releaseId = `rel_${runtime.uuid()}`;
  const provenance = normalizePublishProvenanceInput({ sourceRevisionId, sourceRevisionSet });

  const artifacts = [];
  if (typeof releaseStore.writeArtifact !== 'function') {
    throw new Error('Missing required port method: writeArtifact');
  }
  for (const doc of docs) {
    const route = doc.id;
    const serializedBlocks = serializeBlocks(runtime, doc);
    const canonicalContent = serializedBlocks || doc.content || '';
    const html = `<html><body><article><h1>${doc.title}</h1>${canonicalContent || ''}</article></body></html>`;
    const hash = hashString(html);
    const artifactRef = await releaseStore.writeArtifact(releaseId, route, html, 'text/html');
    artifacts.push({ route, path: artifactRef.path, hash, contentType: artifactRef.contentType });
  }

  const existing = await releaseStore.getManifest(releaseId);
  assertReleaseManifestImmutable(existing);

  const manifest = {
    releaseId,
    schemaVersion: 2,
    createdAt,
    publishedBy,
    sourceRevisionId: provenance.sourceRevisionId,
    sourceRevisionSet: provenance.sourceRevisionSet,
    artifacts,
    artifactHashes: artifacts.map((artifact) => artifact.hash)
  };
  manifest.contentHash = hashString(
    JSON.stringify({
      schemaVersion: manifest.schemaVersion,
      sourceRevisionSet: manifest.sourceRevisionSet,
      artifactHashes: manifest.artifactHashes
    })
  );
  // releaseHash fingerprints this specific publish event (not pure content identity).
  manifest.releaseHash = hashString(
    JSON.stringify({
      releaseId: manifest.releaseId,
      schemaVersion: manifest.schemaVersion,
      createdAt: manifest.createdAt,
      publishedBy: manifest.publishedBy,
      sourceRevisionId: manifest.sourceRevisionId,
      sourceRevisionSet: manifest.sourceRevisionSet,
      artifactHashes: manifest.artifactHashes
    })
  );

  await releaseStore.writeManifest(releaseId, manifest);
  return manifest;
}
