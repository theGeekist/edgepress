export function createClient({ baseUrl, fetchImpl = fetch, getAccessToken, onTokenRefresh }) {
  async function request(method, path, body, retry = true) {
    const headers = { 'content-type': 'application/json' };
    const token = getAccessToken ? getAccessToken() : null;
    if (token) headers.authorization = `Bearer ${token}`;

    const res = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (res.status === 401 && retry && onTokenRefresh) {
      const next = await onTokenRefresh();
      if (next) return request(method, path, body, false);
    }

    const payload = await res.json();
    if (!res.ok) throw new Error(payload?.error?.message || 'Request failed');
    return payload;
  }

  return {
    token: (body) => request('POST', '/v1/auth/token', body),
    refresh: (body) => request('POST', '/v1/auth/refresh', body),
    logout: (body) => request('POST', '/v1/auth/logout', body),
    listDocuments: () => request('GET', '/v1/documents'),
    createDocument: (body) => request('POST', '/v1/documents', body),
    updateDocument: (id, body) => request('PATCH', `/v1/documents/${id}`, body),
    listRevisions: (id) => request('GET', `/v1/documents/${id}/revisions`),
    initMedia: (body) => request('POST', '/v1/media', body),
    finalizeMedia: (id, body) => request('POST', `/v1/media/${id}/finalize`, body),
    publish: (body) => request('POST', '/v1/publish', body),
    getPublishJob: (jobId) => request('GET', `/v1/publish/${jobId}`),
    activateRelease: (id) => request('POST', `/v1/releases/${id}/activate`),
    listReleases: () => request('GET', '/v1/releases'),
    preview: (documentId) => request('GET', `/v1/preview/${documentId}`)
  };
}
