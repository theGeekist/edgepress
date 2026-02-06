function createRequestError({ status, code, message, method, path, payload }) {
  const error = new Error(message || 'Request failed');
  error.name = 'ApiRequestError';
  error.status = status;
  error.code = code || 'REQUEST_FAILED';
  error.method = method;
  error.path = path;
  error.payload = payload;
  return error;
}

async function parsePayload(res) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  try {
    const text = await res.text();
    return text ? { message: text } : null;
  } catch {
    return null;
  }
}

export function createClient({
  baseUrl,
  fetchImpl = fetch,
  getAccessToken,
  onTokenRefresh,
  onAuthFailure
}) {
  let refreshInFlight = null;

  async function refreshTokenOnce() {
    if (!onTokenRefresh) return false;
    if (!refreshInFlight) {
      refreshInFlight = (async () => {
        try {
          return Boolean(await onTokenRefresh());
        } finally {
          refreshInFlight = null;
        }
      })();
    }
    return refreshInFlight;
  }

  async function request(method, path, body, options = {}) {
    const { retry = true, skipAuth = false, skipRefresh = false, headers: customHeaders } = options;

    const headers = {
      'content-type': 'application/json',
      ...(customHeaders || {})
    };

    const token = !skipAuth && getAccessToken ? getAccessToken() : null;
    if (token) headers.authorization = `Bearer ${token}`;

    const res = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });

    if (res.status === 401 && retry && !skipRefresh && onTokenRefresh) {
      const refreshed = await refreshTokenOnce();
      if (refreshed) {
        return request(method, path, body, { ...options, retry: false });
      }
      if (onAuthFailure) {
        await onAuthFailure();
      }
    }

    const payload = await parsePayload(res);
    if (!res.ok) {
      throw createRequestError({
        status: res.status,
        code: payload?.error?.code,
        message: payload?.error?.message || payload?.message || 'Request failed',
        method,
        path,
        payload
      });
    }

    return payload;
  }

  function withQuery(path, query = {}) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query || {})) {
      if (value === undefined || value === null || value === '') continue;
      params.set(key, String(value));
    }
    const q = params.toString();
    return q ? `${path}?${q}` : path;
  }

  return {
    token: (body) => request('POST', '/v1/auth/token', body, { skipRefresh: true }),
    refresh: (body) => request('POST', '/v1/auth/refresh', body, { skipRefresh: true }),
    logout: (body) => request('POST', '/v1/auth/logout', body, { skipRefresh: true }),
    listDocuments: (query) => request('GET', withQuery('/v1/documents', query)),
    createDocument: (body) => request('POST', '/v1/documents', body),
    updateDocument: (id, body) => request('PATCH', `/v1/documents/${id}`, body),
    deleteDocument: (id, options = {}) =>
      request('DELETE', withQuery(`/v1/documents/${id}`, { permanent: options?.permanent ? 1 : undefined })),
    listRevisions: (id) => request('GET', `/v1/documents/${id}/revisions`),
    initMedia: (body) => request('POST', '/v1/media', body),
    finalizeMedia: (id, body) => request('POST', `/v1/media/${id}/finalize`, body),
    publish: (body) => request('POST', '/v1/publish', body),
    getPublishJob: (jobId) => request('GET', `/v1/publish/${jobId}`),
    activateRelease: (id) => request('POST', `/v1/releases/${id}/activate`),
    listReleases: () => request('GET', '/v1/releases'),
    listNavigationMenus: () => request('GET', '/v1/navigation/menus'),
    getNavigationMenu: (key) => request('GET', `/v1/navigation/menus/${encodeURIComponent(key)}`),
    upsertNavigationMenu: (key, body) => request('PUT', `/v1/navigation/menus/${encodeURIComponent(key)}`, body),
    preview: (documentId) => request('GET', `/v1/preview/${documentId}`),
    getPrivateRoute: (routeId) => request('GET', `/v1/private/${encodeURIComponent(routeId)}`)
  };
}
