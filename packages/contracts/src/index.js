export const errorEnvelope = {
  type: 'object',
  required: ['error'],
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message'],
      properties: {
        code: { type: 'string' },
        message: { type: 'string' }
      }
    }
  }
};

export const routes = {
  'POST /v1/auth/token': {
    body: ['username', 'password'],
    response: ['accessToken', 'refreshToken', 'user']
  },
  'POST /v1/auth/refresh': {
    body: ['refreshToken'],
    response: ['accessToken', 'refreshToken']
  },
  'POST /v1/auth/logout': {
    body: ['refreshToken'],
    response: ['ok']
  },
  'GET /v1/documents': { response: ['items'] },
  'POST /v1/documents': { body: ['title', 'content', 'type', 'status', 'blocks'], response: ['document', 'revision'] },
  'PATCH /v1/documents/:id': { body: ['title', 'content', 'type', 'status', 'blocks'], response: ['document', 'revision'] },
  'DELETE /v1/documents/:id': { response: ['ok'] },
  'GET /v1/documents/:id/revisions': { response: ['items'] },
  'POST /v1/documents/:id/revisions': { body: [], response: ['revision'] },
  'POST /v1/media': { body: [], response: ['mediaId', 'uploadUrl', 'uploadToken', 'requiredHeaders'] },
  'POST /v1/media/:id/finalize': { body: ['uploadToken', 'filename', 'mimeType', 'size'], response: ['media'] },
  'GET /v1/media/:id': { response: ['media'] },
  'POST /v1/publish': { body: [], response: ['job'] },
  'GET /v1/publish/:jobId': { response: ['job'] },
  'POST /v1/releases/:id/activate': { response: ['activeRelease'] },
  'GET /v1/releases': { response: ['items', 'activeRelease'] },
  'GET /v1/preview/:documentId': { response: ['previewUrl', 'expiresAt', 'releaseLikeRef'] },
  'POST /v1/forms/:formId/submit': { body: ['payload'], response: ['submissionId'] },
  'GET /v1/private/:route': { response: ['route', 'html', 'releaseId'] }
};

export function assertKeys(obj, keys) {
  for (const key of keys) {
    if (!(key in obj)) {
      throw new Error(`Missing key '${key}' in response`);
    }
  }
}
