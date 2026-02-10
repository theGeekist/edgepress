export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      ...headers
    }
  });
}

export function error(code, message, status = 400) {
  return json({ error: { code, message } }, status);
}

export async function readJson(request) {
  try {
    const text = await request.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export function matchPath(template, actualPath) {
  const tParts = template.split('/').filter(Boolean);
  const aParts = actualPath.split('/').filter(Boolean);
  const hasTrailingSplatParam = tParts.length > 0
    && tParts[tParts.length - 1].startsWith(':')
    && tParts[tParts.length - 1].endsWith('*');
  if (!hasTrailingSplatParam && tParts.length !== aParts.length) return null;
  if (hasTrailingSplatParam && aParts.length < tParts.length - 1) return null;

  const params = {};
  for (let i = 0; i < tParts.length; i += 1) {
    const t = tParts[i];
    if (t.startsWith(':') && t.endsWith('*')) {
      const key = t.slice(1, -1);
      params[key] = decodeURIComponent(aParts.slice(i).join('/'));
      return params;
    }
    const a = aParts[i];
    if (t.startsWith(':')) {
      params[t.slice(1)] = decodeURIComponent(a);
      continue;
    }
    if (t !== a) return null;
  }

  return params;
}

export function getBearerToken(request) {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length);
}

export function getCorsHeaders(origin = '*') {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization,x-upload-token,x-trace-id,x-ip-hash,x-ua-hash'
  };
}

export function withCors(response, origin = '*') {
  const headers = new Headers(response.headers);
  const cors = getCorsHeaders(origin);
  for (const [key, value] of Object.entries(cors)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
