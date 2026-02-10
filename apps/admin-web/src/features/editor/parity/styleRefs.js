function asString(value) {
  return String(value || '').trim();
}

export function makeStyleRef(path) {
  const next = asString(path);
  return next ? { ref: next } : null;
}

export function makeStyleValue(value) {
  const next = asString(value);
  return next ? { value: next } : null;
}

export function makeSpacingStyleValue(value) {
  const next = asString(value);
  const match = next.match(/^var:preset\|spacing\|(.+)$/);
  if (match) return makeStyleRef(`spacing.preset.${match[1]}`);
  return makeStyleValue(next);
}

export function resolveSpacingStyleValue(value) {
  if (value && typeof value === 'object' && typeof value.ref === 'string') {
    const match = value.ref.match(/^spacing\.preset\.(.+)$/);
    if (match) return `var(--wp--preset--spacing--${match[1]})`;
  }
  if (value && typeof value === 'object' && typeof value.value === 'string') {
    return value.value.trim();
  }
  return asString(value);
}

export function resolveEnumStyleValue(value) {
  if (value && typeof value === 'object' && typeof value.ref === 'string') {
    const segments = value.ref.split('.');
    return asString(segments[segments.length - 1]);
  }
  if (value && typeof value === 'object' && typeof value.value === 'string') {
    return asString(value.value);
  }
  return asString(value);
}
