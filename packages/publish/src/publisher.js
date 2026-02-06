import { assertReleaseManifestImmutable } from '../../domain/src/invariants.js';
import { normalizeBlocksInput } from '../../domain/src/blocks.js';
import { toErrorMessage } from '../../domain/src/errors.js';
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

function escapeHtml(input) {
  const value = String(input ?? '');
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function serializeBlocks(runtime, doc) {
  if (!Array.isArray(doc.blocks)) return '';
  try {
    const canonicalBlocks = normalizeBlocksInput(doc.blocks);
    const serialized = serialize(canonicalBlocks);
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
      message: toErrorMessage(error, 'Unknown serialization error')
    });
    return '';
  }
}

function hashBlocks(runtime, doc) {
  if (!Array.isArray(doc.blocks)) return hashString('[]');
  try {
    return hashString(JSON.stringify(normalizeBlocksInput(doc.blocks)));
  } catch (error) {
    runtime.log('warn', 'publish_blocks_hash_failed', {
      documentId: doc.id,
      blockCount: doc.blocks.length,
      message: toErrorMessage(error, 'Unknown serialization error')
    });
    return null;
  }
}

export async function createRelease({ runtime, store, releaseStore, sourceRevisionId, sourceRevisionSet, publishedBy }) {
  const listed = await store.listDocuments();
  const docs = Array.isArray(listed) ? listed : listed.items || [];
  const createdAt = runtime.now().toISOString();
  const releaseId = `rel_${runtime.uuid()}`;
  const provenance = normalizePublishProvenanceInput({ sourceRevisionId, sourceRevisionSet });

  const artifacts = [];
  if (typeof releaseStore.writeArtifact !== 'function') {
    throw new Error('Missing required port method: writeArtifact');
  }
  for (const doc of docs) {
    const route = doc.slug || doc.id;
    const blocksHash = hashBlocks(runtime, doc);
    const serializedBlocks = serializeBlocks(runtime, doc);
    const canonicalContent = serializedBlocks || doc.content || '';
    const escapedTitle = escapeHtml(doc.title);
    const html = `<html><body><article><h1>${escapedTitle}</h1>${canonicalContent}</article></body></html>`;
    const hash = hashString(html);
    const artifactRef = await releaseStore.writeArtifact(releaseId, route, html, 'text/html');
    artifacts.push({
      route,
      path: artifactRef.path,
      hash,
      blocksHash,
      contentType: artifactRef.contentType
    });
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
    artifactHashes: artifacts.map((artifact) => artifact.hash),
    blockHashes: artifacts.map((artifact) => artifact.blocksHash).filter(Boolean)
  };
  manifest.contentHash = hashString(
    JSON.stringify({
      schemaVersion: manifest.schemaVersion,
      sourceRevisionSet: manifest.sourceRevisionSet,
      artifactHashes: manifest.artifactHashes,
      blockHashes: manifest.blockHashes
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
      artifactHashes: manifest.artifactHashes,
      blockHashes: manifest.blockHashes
    })
  );

  await releaseStore.writeManifest(releaseId, manifest);
  return manifest;
}
