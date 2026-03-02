import { assertReleaseManifestImmutable } from '@geekist/edgepress/domain/invariants.js';
import { SOURCE_REVISION_SET_SCHEMA_VERSION } from '@geekist/edgepress/domain/entities.js';
import { normalizeBlocksInput } from '@geekist/edgepress/domain/blocks.js';
import { toErrorMessage } from '@geekist/edgepress/domain/errors.js';
import { normalizePublishProvenanceInput } from '@geekist/edgepress/domain/provenance.js';
import { buildSiteShell } from '../../../../packages/content/src/renderShell.js';
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

function resolvePublishThemeVars(sourceRevisionSet) {
  const menus = Array.isArray(sourceRevisionSet?.menus) ? sourceRevisionSet.menus : [];
  const theme = {};
  const cssVars = {};

  for (const menu of menus) {
    assignStringEntries(theme, menu?.theme);
    assignStringEntries(cssVars, menu?.cssVars);
  }

  return { theme, cssVars };
}

function assignStringEntries(target, source) {
  const sourceObject = source && typeof source === 'object' ? source : {};
  for (const [key, value] of Object.entries(sourceObject)) {
    const name = String(key ?? '').trim();
    const cssValue = value == null ? '' : String(value).trim();
    if (!name || !cssValue) continue;
    target[name] = cssValue;
  }
}

function extractRevisionIds(sourceRevisionSet) {
  if (Array.isArray(sourceRevisionSet)) {
    return sourceRevisionSet.map((entry) => String(entry || '').trim()).filter(Boolean);
  }
  if (sourceRevisionSet && typeof sourceRevisionSet === 'object') {
    const revisions = Array.isArray(sourceRevisionSet.revisions) ? sourceRevisionSet.revisions : [];
    return revisions.map((entry) => String(entry || '').trim()).filter(Boolean);
  }
  return [];
}

export function resolveImageBlocks(blocks, mediaById) {
  if (!Array.isArray(blocks)) return [];
  return blocks.map((block) => {
    if (!block || typeof block !== 'object') return block;
    const attributes = block.attributes && typeof block.attributes === 'object' ? { ...block.attributes } : {};
    const mediaId = String(attributes.mediaId || attributes.id || '').trim();
    if (block.name === 'core/image' && mediaId && mediaById.has(mediaId)) {
      const media = mediaById.get(mediaId);
      attributes.url = media.url || attributes.url || '';
      if (!attributes.alt && media.alt) {
        attributes.alt = media.alt;
      }
    }
    return {
      ...block,
      attributes,
      innerBlocks: resolveImageBlocks(block.innerBlocks, mediaById)
    };
  });
}

function serializeBlocks(runtime, doc, mediaById, sourceRevisionSet) {
  const { theme, cssVars } = resolvePublishThemeVars(sourceRevisionSet);
  if (!Array.isArray(doc.blocks)) {
    const escapedTitle = escapeHtml(doc.title);
    const content = `<article><h1>${escapedTitle}</h1>${doc.content || ''}</article>`;
    return buildSiteShell(theme, cssVars, {
      title: doc.title || 'EdgePress',
      content
    });
  }
  try {
    const canonicalBlocks = normalizeBlocksInput(doc.blocks);
    const resolvedBlocks = resolveImageBlocks(canonicalBlocks, mediaById);
    const serialized = serialize(resolvedBlocks);
    if (doc.blocks.length > 0 && !serialized) {
      runtime.log('warn', 'publish_blocks_empty_serialization', {
        documentId: doc.id,
        blockCount: doc.blocks.length
      });
    }
    const featuredImageId = String(doc.featuredImageId || '').trim();
    const featuredImage = featuredImageId && mediaById.has(featuredImageId)
      ? mediaById.get(featuredImageId)
      : null;
    const escapedTitle = escapeHtml(doc.title);
    const featuredImageMarkup = featuredImage?.url
      ? `<figure><img src="${escapeHtml(featuredImage.url)}" alt="${escapeHtml(featuredImage.alt || '')}" /></figure>`
      : '';
    const content = `<article>${featuredImageMarkup}<h1>${escapedTitle}</h1>${serialized || doc.content || ''}</article>`;
    return buildSiteShell(theme, cssVars, {
      title: doc.title || 'EdgePress',
      content
    });
  } catch (error) {
    runtime.log('warn', 'publish_blocks_serialize_failed', {
      documentId: doc.id,
      blockCount: doc.blocks.length,
      message: toErrorMessage(error, 'Unknown serialization error')
    });
    return buildSiteShell(theme, cssVars, {
      title: doc.title || 'EdgePress',
      content: `<article><h1>${escapeHtml(doc.title)}</h1>${doc.content || ''}</article>`
    });
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

function toObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function collectUsedMenuIdsFromBlocks(blocks, menuIds) {
  const source = Array.isArray(blocks) ? blocks : [];
  for (const entry of source) {
    const block = toObject(entry);
    const attributes = toObject(block.attributes);
    const props = toObject(block.props);
    let menuId = '';

    if (block.name === 'core/navigation') {
      menuId = String(attributes.menuId || attributes.ref || '').trim();
    } else if (block.blockKind === 'ep/navigation') {
      menuId = String(props.menuId || '').trim();
    }

    if (menuId) {
      menuIds.add(menuId);
    }

    collectUsedMenuIdsFromBlocks(block.innerBlocks, menuIds);
  }
}

function normalizeMenuItemSnapshot(item, index) {
  const kind = item?.kind === 'external' ? 'external' : 'internal';
  return {
    id: String(item?.id || '').trim(),
    label: String(item?.label || '').trim(),
    kind,
    route: kind === 'internal' ? String(item?.route || '').trim() : '',
    documentId: kind === 'internal' ? String(item?.documentId || '').trim() : '',
    externalUrl: kind === 'external' ? String(item?.externalUrl || '').trim() : '',
    order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index,
    parentId: String(item?.parentId || '').trim() || null,
    target: String(item?.target || '_self').trim() || '_self',
    rel: String(item?.rel || '').trim()
  };
}

function normalizeMenuSnapshot(menu) {
  const itemsInput = Array.isArray(menu?.items) ? menu.items : [];
  const items = itemsInput
    .map((item, index) => normalizeMenuItemSnapshot(item, index))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
    .map((item, index) => ({ ...item, order: index }));
  return {
    id: String(menu?.id || '').trim(),
    key: String(menu?.key || '').trim(),
    title: String(menu?.title || '').trim(),
    items,
    updatedAt: String(menu?.updatedAt || '').trim()
  };
}

async function snapshotReferencedMenus({ store, docs }) {
  const menuIds = new Set();
  for (const doc of docs) {
    if (String(doc?.status || '').trim() !== 'published') continue;
    collectUsedMenuIdsFromBlocks(doc?.blocks, menuIds);
  }

  if (menuIds.size === 0 || typeof store.listNavigationMenus !== 'function') {
    return [];
  }

  const listedMenus = await store.listNavigationMenus();
  const menus = (Array.isArray(listedMenus) ? listedMenus : [])
    .map((menu) => normalizeMenuSnapshot(menu))
    .filter((menu) => menuIds.has(menu.id) || menuIds.has(menu.key))
    .sort((a, b) => {
      const updatedAtCompare = a.updatedAt.localeCompare(b.updatedAt);
      if (updatedAtCompare !== 0) return updatedAtCompare;
      return a.id.localeCompare(b.id) || a.key.localeCompare(b.key);
    });
  return menus;
}

export async function createRelease({ runtime, store, releaseStore, sourceRevisionId, sourceRevisionSet, publishedBy }) {
  const listed = await store.listDocuments();
  const docs = Array.isArray(listed) ? listed : listed.items || [];
  const menus = await snapshotReferencedMenus({ store, docs });
  const mediaListed = typeof store.listMedia === 'function'
    ? await store.listMedia({ page: 1, pageSize: 500 })
    : { items: [] };
  const mediaItems = Array.isArray(mediaListed) ? mediaListed : mediaListed?.items || [];
  const mediaById = new Map(mediaItems.map((item) => [item.id, item]));
  const createdAt = runtime.now().toISOString();
  const releaseId = `rel_${runtime.uuid()}`;
  const provenance = normalizePublishProvenanceInput({ sourceRevisionId, sourceRevisionSet });
  const revisionIds = extractRevisionIds(provenance.sourceRevisionSet);
  const sourceRevisionSetSnapshot = {
    schemaVersion: SOURCE_REVISION_SET_SCHEMA_VERSION,
    revisions: revisionIds,
    menus
  };

  const artifacts = [];
  if (typeof releaseStore.writeArtifact !== 'function') {
    throw new Error('Missing required contract method: writeArtifact');
  }
  for (const doc of docs) {
    const route = doc.slug || doc.id;
    const blocksHash = hashBlocks(runtime, doc);
    const html = serializeBlocks(runtime, doc, mediaById, sourceRevisionSetSnapshot);
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
    sourceRevisionSet: sourceRevisionSetSnapshot,
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
