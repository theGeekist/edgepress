import { createApiHandler } from '../../../apps/api/src/app.js';

export function createHandler(platform) {
  return createApiHandler(platform);
}

export async function requestJson(handler, method, path, { body, token, headers } = {}) {
  const reqHeaders = new Headers(headers || {});
  if (body !== undefined) reqHeaders.set('content-type', 'application/json');
  if (token) reqHeaders.set('authorization', `Bearer ${token}`);

  const req = new Request(`http://test.local${path}`, {
    method,
    headers: reqHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const res = await handler(req);
  let json;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { res, json };
}

export async function authAsAdmin(platform) {
  const handler = createHandler(platform);
  const { json, res } = await requestJson(handler, 'POST', '/v1/auth/token', {
    body: { username: 'admin', password: 'admin' }
  });
  if (res.status !== 200) {
    throw new Error('Failed to authenticate admin in test setup');
  }
  return {
    handler,
    accessToken: json.accessToken,
    refreshToken: json.refreshToken,
    platform
  };
}
