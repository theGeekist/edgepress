export const EP_THEME_SCHEMA_VERSION = 1;

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function makeTokenRef(path) {
  const next = String(path || '').trim();
  if (!next) return null;
  return { ref: next };
}

export function isTokenRef(value) {
  return isPlainObject(value) && typeof value.ref === 'string' && value.ref.trim().length > 0;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map((item) => canonicalize(item));
  if (!isPlainObject(value)) return value;
  const out = {};
  for (const key of Object.keys(value).sort()) {
    out[key] = canonicalize(value[key]);
  }
  return out;
}

function normalizeRecord(input = {}) {
  return canonicalize(isPlainObject(input) ? input : {});
}

function normalizeStyleValue(value) {
  if (isTokenRef(value)) return { ref: value.ref.trim() };
  if (isPlainObject(value) && typeof value.path === 'string' && value.path.trim()) {
    return { ref: value.path.trim() };
  }
  if (typeof value === 'string') {
    const next = value.trim();
    return next || '';
  }
  return value ?? '';
}

function normalizeStyleRecord(input = {}) {
  const source = isPlainObject(input) ? input : {};
  const out = {};
  for (const key of Object.keys(source).sort()) {
    out[key] = normalizeStyleValue(source[key]);
  }
  return out;
}

function applyTokenRefs(target, tokenGroup, groupName) {
  for (const key of Object.keys(tokenGroup || {})) {
    if (!(key in target)) {
      target[key] = makeTokenRef(`${groupName}.${key}`);
    }
  }
}

function withStylePropDefaults(source = {}, tokens = {}, surfaces = {}) {
  const styleProps = {
    color: normalizeStyleRecord(source?.color),
    spacing: normalizeStyleRecord(source?.spacing),
    typography: normalizeStyleRecord(source?.typography),
    radius: normalizeStyleRecord(source?.radius),
    shadow: normalizeStyleRecord(source?.shadow),
    layout: normalizeStyleRecord(source?.layout)
  };

  applyTokenRefs(styleProps.color, tokens.color, 'color');
  applyTokenRefs(styleProps.spacing, tokens.spacing, 'spacing');
  applyTokenRefs(styleProps.typography, tokens.typography, 'typography');
  applyTokenRefs(styleProps.radius, tokens.radius, 'radius');
  applyTokenRefs(styleProps.shadow, tokens.shadow, 'shadow');
  applyTokenRefs(styleProps.layout, tokens.layout, 'layout');
  for (const key of Object.keys(surfaces || {})) {
    if (!(key in styleProps.color)) styleProps.color[key] = String(surfaces[key] || '').trim();
  }

  return styleProps;
}

function normalizePalette(input = []) {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => ({
      slug: String(item?.slug || '').trim(),
      name: String(item?.name || '').trim(),
      value: String(item?.value || item?.color || '').trim()
    }))
    .filter((item) => item.slug && item.value)
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

function normalizeWpOrigin(input = {}) {
  const source = isPlainObject(input) ? input : {};
  return canonicalize({
    presets: isPlainObject(source.presets) ? source.presets : {},
    custom: isPlainObject(source.custom) ? source.custom : {}
  });
}

export function normalizeEpTheme(input = {}) {
  const source = isPlainObject(input) ? input : {};
  const tokens = isPlainObject(source.tokens) ? source.tokens : {};
  const surfaces = isPlainObject(source.surfaces) ? source.surfaces : {};
  const normalizedTokens = {
    color: normalizeRecord(tokens.color),
    spacing: normalizeRecord(tokens.spacing),
    typography: normalizeRecord(tokens.typography),
    radius: normalizeRecord(tokens.radius),
    shadow: normalizeRecord(tokens.shadow),
    layout: normalizeRecord(tokens.layout),
    palette: normalizePalette(tokens.palette)
  };
  const normalizedSurfaces = {
    page: String(surfaces.page || '').trim(),
    surface: String(surfaces.surface || '').trim(),
    surfaceMuted: String(surfaces.surfaceMuted || '').trim(),
    sidebar: String(surfaces.sidebar || '').trim(),
    sidebarText: String(surfaces.sidebarText || '').trim(),
    topbar: String(surfaces.topbar || '').trim(),
    topbarText: String(surfaces.topbarText || '').trim()
  };

  return {
    schemaVersion: EP_THEME_SCHEMA_VERSION,
    name: String(source.name || 'EP Theme').trim(),
    mode: source.mode === 'dark' ? 'dark' : 'light',
    tokens: normalizedTokens,
    surfaces: normalizedSurfaces,
    styleProps: withStylePropDefaults(source?.styleProps, normalizedTokens, normalizedSurfaces),
    blockStyles: normalizeRecord(source.blockStyles),
    metadata: normalizeRecord(source.metadata),
    origin: {
      wp: normalizeWpOrigin(source?.origin?.wp)
    }
  };
}

export function encodeEpTheme(theme) {
  return JSON.stringify(normalizeEpTheme(theme));
}

export function decodeEpTheme(raw) {
  const parsed = JSON.parse(String(raw || '{}'));
  return normalizeEpTheme(parsed);
}
