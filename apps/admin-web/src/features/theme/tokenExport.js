const TOKEN_ROOT_ALIASES = {
  colors: 'color',
  radii: 'radius',
  shadows: 'shadow'
};

function toKebabCase(input) {
  const value = String(input || '').trim();
  if (!value) return '';
  return value
    .replaceAll(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replaceAll(/[_\s]+/g, '-')
    .replaceAll(/-+/g, '-')
    .toLowerCase();
}

function normalizePrefix(prefix) {
  const value = String(prefix || 'site').trim();
  if (!value) return '--ep-site';
  if (value === 'admin') return '--ep-admin';
  if (value === 'site') return '--ep-site';

  if (value.startsWith('--')) {
    return value.endsWith('-') ? value.slice(0, -1) : value;
  }

  return `--ep-${toKebabCase(value) || 'site'}`;
}

function normalizeSegment(segment, depth) {
  const key = toKebabCase(segment);
  if (!key) return '';
  if (depth === 0 && key === 'tokens') return '';
  if (depth <= 1 && Object.prototype.hasOwnProperty.call(TOKEN_ROOT_ALIASES, key)) {
    return TOKEN_ROOT_ALIASES[key];
  }
  return key;
}

function isObjectLike(value) {
  return value && typeof value === 'object';
}

function isPlainObject(value) {
  if (!isObjectLike(value) || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function appendValue(out, basePrefix, path, value) {
  if (value == null) return;
  if (typeof value === 'string') {
    if (!value.trim()) return;
    out[`${basePrefix}-${path.join('-')}`] = value;
    return;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    out[`${basePrefix}-${path.join('-')}`] = String(value);
    return;
  }

  if (value instanceof Date) {
    out[`${basePrefix}-${path.join('-')}`] = value.toISOString();
    return;
  }

  out[`${basePrefix}-${path.join('-')}`] = String(value);
}

function walkTokens(value, path, depth, out, basePrefix) {
  if (value == null) return;

  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      walkTokens(entry, [...path, String(index)], depth + 1, out, basePrefix);
    });
    return;
  }

  if (isPlainObject(value)) {
    for (const [key, entry] of Object.entries(value)) {
      const nextSegment = normalizeSegment(key, depth);
      const nextPath = nextSegment ? [...path, nextSegment] : [...path];
      walkTokens(entry, nextPath, depth + 1, out, basePrefix);
    }
    return;
  }

  if (path.length === 0) return;
  appendValue(out, basePrefix, path, value);
}

export function toCssVars(theme, options = {}) {
  if (!theme || typeof theme !== 'object') return {};
  const basePrefix = normalizePrefix(options.scope ?? options.prefix);
  const vars = {};

  walkTokens(theme, [], 0, vars, basePrefix);

  return vars;
}
