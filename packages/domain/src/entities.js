import { BLOCKS_SCHEMA_VERSION, normalizeBlocksInput } from './blocks.js';

export const ROLE_CAPABILITIES = {
  admin: ['document:read', 'document:write', 'publish:write', 'media:write', 'private:read'],
  editor: ['document:read', 'document:write', 'media:write'],
  viewer: ['document:read']
};

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
    sourceRevisionSet,
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
    width: Number.isFinite(Number(width)) ? Number(width) : null,
    height: Number.isFinite(Number(height)) ? Number(height) : null,
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
