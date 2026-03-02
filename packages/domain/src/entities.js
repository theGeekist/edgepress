import { BLOCKS_SCHEMA_VERSION, normalizeBlocksInput } from './blocks.js';

export const ROLE_CAPABILITIES = {
  admin: ['document:read', 'document:write', 'publish:write', 'media:write', 'private:read'],
  editor: ['document:read', 'document:write', 'media:write'],
  viewer: ['document:read']
};

export const SOURCE_REVISION_SET_SCHEMA_VERSION = 1;

/**
 * Canonical document types used by the document-backed registry.
 *
 * `page` and `post` remain the default content primitives.
 * `pattern` and `template` support WP-compatible facade endpoints while
 * keeping the core domain model document-based and revisioned.
 */
export const VALID_DOCUMENT_TYPES = new Set(['page', 'post', 'pattern', 'template']);

export function isValidDocumentType(type) {
  return VALID_DOCUMENT_TYPES.has(String(type || '').trim());
}

/**
 * @typedef {object} SourceRevisionSetMenuItemSnapshot
 * @property {string} id
 * @property {string} label
 * @property {'internal' | 'external'} kind
 * @property {string} route
 * @property {string} documentId
 * @property {string} externalUrl
 * @property {number} order
 * @property {string | null} parentId
 * @property {string} target
 * @property {string} rel
 */

/**
 * @typedef {object} SourceRevisionSetMenuSnapshot
 * @property {string} id
 * @property {string} key
 * @property {string} title
 * @property {SourceRevisionSetMenuItemSnapshot[]} items
 * @property {string} updatedAt
 */

function normalizeSourceRevisionSetMenuItem(value, index) {
  const kind = value?.kind === 'external' ? 'external' : 'internal';
  return {
    id: String(value?.id || '').trim(),
    label: String(value?.label || '').trim(),
    kind,
    route: kind === 'internal' ? String(value?.route || '').trim() : '',
    documentId: kind === 'internal' ? String(value?.documentId || '').trim() : '',
    externalUrl: kind === 'external' ? String(value?.externalUrl || '').trim() : '',
    order: Number.isFinite(Number(value?.order)) ? Number(value.order) : index,
    parentId: String(value?.parentId || '').trim() || null,
    target: String(value?.target || '_self').trim() || '_self',
    rel: String(value?.rel || '').trim()
  };
}

function normalizeSourceRevisionSetMenu(value) {
  const itemsInput = Array.isArray(value?.items) ? value.items : [];
  const normalizedItems = itemsInput
    .map((entry, index) => normalizeSourceRevisionSetMenuItem(entry, index))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
    .map((entry, index) => ({ ...entry, order: index }));
  return {
    id: String(value?.id || '').trim(),
    key: String(value?.key || '').trim(),
    title: String(value?.title || '').trim(),
    items: normalizedItems,
    updatedAt: String(value?.updatedAt || '').trim()
  };
}

export function normalizeSourceRevisionSetInput(value) {
  if (value == null) return null;
  if (Array.isArray(value)) {
    return {
      schemaVersion: SOURCE_REVISION_SET_SCHEMA_VERSION,
      revisions: normalizeStringArray(value),
      menus: []
    };
  }
  if (typeof value !== 'object') return null;

  const revisions = normalizeStringArray(value.revisions);
  const menusInput = Array.isArray(value.menus) ? value.menus : [];
  const schemaVersion = Number.isFinite(Number(value.schemaVersion)) && Number(value.schemaVersion) > 0
    ? Number(value.schemaVersion)
    : SOURCE_REVISION_SET_SCHEMA_VERSION;

  return {
    schemaVersion,
    revisions,
    menus: menusInput.map((entry) => normalizeSourceRevisionSetMenu(entry))
  };
}

function normalizeObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry || '').trim()).filter(Boolean);
}

export function createUser({ id, username, password, role = 'admin' }) {
  return {
    id,
    username,
    password,
    role,
    capabilities: ROLE_CAPABILITIES[role] || []
  };
}

export function createDocument({
  id,
  title,
  content,
  legacyHtml,
  type = 'page',
  slug = '',
  excerpt = '',
  featuredImageId = '',
  blocks = [],
  blocksSchemaVersion = BLOCKS_SCHEMA_VERSION,
  fields = {},
  termIds = [],
  raw = {},
  createdBy,
  status = 'draft',
  now
}) {
  const nextLegacyHtml = legacyHtml ?? content ?? '';
  const nextContent = content ?? legacyHtml ?? '';
  return {
    id,
    title,
    content: nextContent,
    legacyHtml: String(nextLegacyHtml || ''),
    type,
    slug,
    excerpt: String(excerpt || ''),
    featuredImageId: String(featuredImageId || '').trim(),
    blocks: normalizeBlocksInput(blocks),
    blocksSchemaVersion,
    fields: normalizeObject(fields),
    termIds: normalizeStringArray(termIds),
    raw: normalizeObject(raw),
    status,
    createdBy,
    createdAt: now,
    updatedAt: now
  };
}

export function createRevision({
  id,
  documentId,
  title,
  content,
  legacyHtml,
  excerpt = '',
  slug = '',
  status = 'draft',
  featuredImageId = '',
  blocks = [],
  blocksSchemaVersion = BLOCKS_SCHEMA_VERSION,
  fields = {},
  termIds = [],
  sourceRevisionId = null,
  authorId,
  now
}) {
  const nextLegacyHtml = legacyHtml ?? content ?? '';
  const nextContent = content ?? legacyHtml ?? '';
  return {
    id,
    documentId,
    title,
    content: nextContent,
    legacyHtml: String(nextLegacyHtml || ''),
    excerpt: String(excerpt || ''),
    slug: String(slug || '').trim(),
    status: String(status || 'draft'),
    featuredImageId: String(featuredImageId || '').trim(),
    blocks: normalizeBlocksInput(blocks),
    blocksSchemaVersion,
    fields: normalizeObject(fields),
    termIds: normalizeStringArray(termIds),
    sourceRevisionId,
    authorId,
    createdAt: now
  };
}

export function createContentType({
  id,
  slug,
  label,
  kind = 'content',
  supports = {},
  fields = [],
  taxonomies = [],
  statusOptions = ['draft', 'published', 'trash'],
  now
}) {
  return {
    id,
    slug: String(slug || '').trim(),
    label: String(label || '').trim(),
    kind: String(kind || 'content'),
    supports: normalizeObject(supports),
    fields: Array.isArray(fields) ? fields : [],
    taxonomies: normalizeStringArray(taxonomies),
    statusOptions: normalizeStringArray(statusOptions),
    createdAt: now,
    updatedAt: now
  };
}

export function createTaxonomy({
  id,
  slug,
  label,
  hierarchical = false,
  objectTypes = [],
  constraints = {},
  now
}) {
  return {
    id,
    slug: String(slug || '').trim(),
    label: String(label || '').trim(),
    hierarchical: Boolean(hierarchical),
    objectTypes: normalizeStringArray(objectTypes),
    constraints: normalizeObject(constraints),
    createdAt: now,
    updatedAt: now
  };
}

export function createTerm({
  id,
  taxonomySlug,
  slug,
  name,
  parentId = null,
  now
}) {
  return {
    id,
    taxonomySlug: String(taxonomySlug || '').trim(),
    slug: String(slug || '').trim(),
    name: String(name || '').trim(),
    parentId: parentId ? String(parentId) : null,
    createdAt: now,
    updatedAt: now
  };
}

export function createPublishJob({ id, requestedBy, sourceRevisionId = null, sourceRevisionSet = null, now }) {
  return {
    id,
    requestedBy,
    sourceRevisionId,
    sourceRevisionSet: normalizeSourceRevisionSetInput(sourceRevisionSet),
    status: 'running',
    releaseId: null,
    error: null,
    createdAt: now,
    updatedAt: now
  };
}

export function createMediaAssetSession({ id, createdBy, uploadToken, now }) {
  return {
    id,
    createdBy,
    status: 'pending',
    uploadToken,
    requiredHeaders: { 'x-upload-token': uploadToken },
    uploadUrl: `/uploads/${id}`,
    createdAt: now,
    updatedAt: now
  };
}

export function finalizeMediaAsset(session, {
  filename,
  mimeType,
  size,
  url,
  width = null,
  height = null,
  alt = '',
  caption = '',
  description = ''
}, now) {
  return {
    ...session,
    filename,
    mimeType,
    size,
    url,
    width: width != null && Number.isFinite(Number(width)) ? Number(width) : null,
    height: height != null && Number.isFinite(Number(height)) ? Number(height) : null,
    alt: String(alt || '').trim(),
    caption: String(caption || '').trim(),
    description: String(description || '').trim(),
    status: 'ready',
    updatedAt: now
  };
}

export function createFormSubmission({ id, formId, payload, requestContext, now }) {
  return {
    id,
    formId,
    payload,
    requestContext,
    createdAt: now
  };
}
