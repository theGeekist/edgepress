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
  if (tParts.length !== aParts.length) return null;

  const params = {};
  for (let i = 0; i < tParts.length; i += 1) {
    const t = tParts[i];
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
    'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization,x-trace-id,x-ip-hash,x-ua-hash'
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
