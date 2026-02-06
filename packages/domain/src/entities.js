export const ROLE_CAPABILITIES = {
  admin: ['document:read', 'document:write', 'publish:write', 'media:write', 'private:read'],
  editor: ['document:read', 'document:write', 'media:write'],
  viewer: ['document:read']
};

export function createUser({ id, username, password, role = 'admin' }) {
  return {
    id,
    username,
    password,
    role,
    capabilities: ROLE_CAPABILITIES[role] || []
  };
}

export function createDocument({ id, title, content, createdBy, status = 'draft', now }) {
  return {
    id,
    title,
    content,
    status,
    createdBy,
    createdAt: now,
    updatedAt: now
  };
}

export function createRevision({ id, documentId, title, content, sourceRevisionId = null, authorId, now }) {
  return {
    id,
    documentId,
    title,
    content,
    sourceRevisionId,
    authorId,
    createdAt: now
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

export function finalizeMediaAsset(session, { filename, mimeType, size, url }, now) {
  return {
    ...session,
    filename,
    mimeType,
    size,
    url,
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
