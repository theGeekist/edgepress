export function dirname(pathname = '') {
  if (!pathname) return '';
  let normalized = String(pathname);
  while (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash <= 0) return '';
  return normalized.slice(0, lastSlash);
}

export function join(...parts) {
  return parts.filter(Boolean).join('/');
}

export function isAbsolute(pathname = '') {
  return pathname.startsWith('/');
}

export function resolve(...parts) {
  // Intentionally minimal browser shim: this does not emulate Node's absolute resolution semantics.
  return join(...parts);
}

export default {
  dirname,
  join,
  isAbsolute,
  resolve
};
