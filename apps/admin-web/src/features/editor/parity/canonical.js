export const CANONICAL_SCHEMA_VERSION = 1;

const LOSSINESS_VALUES = new Set(['none', 'partial', 'fallback']);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function canonicalizeValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalizeValue(entry));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const out = {};
  for (const key of Object.keys(value).sort()) {
    out[key] = canonicalizeValue(value[key]);
  }
  return out;
}

function normalizeLossiness(value) {
  return LOSSINESS_VALUES.has(value) ? value : 'none';
}

function normalizeNodeId(id, path) {
  const raw = String(id || '').trim();
  if (raw) return raw;
  return `epn_${path.length === 0 ? 'root' : path.join('_')}`;
}

function normalizeOrigin(origin, unknownTopLevelFields) {
  const normalizedOrigin = canonicalizeValue(isPlainObject(origin) ? origin : {});
  if (Object.keys(unknownTopLevelFields).length === 0) {
    return normalizedOrigin;
  }
  const nextUnknown = {
    ...(isPlainObject(normalizedOrigin.unknownFields) ? normalizedOrigin.unknownFields : {}),
    ...unknownTopLevelFields
  };
  return {
    ...normalizedOrigin,
    unknownFields: canonicalizeValue(nextUnknown)
  };
}

export function normalizeCanonicalNode(input, path = []) {
  if (!isPlainObject(input)) {
    throw new Error('canonical node must be an object');
  }

  const {
    schemaVersion,
    sourceSchemaVersion,
    id,
    blockKind,
    props,
    children,
    origin,
    lossiness,
    ...unknownTopLevelFields
  } = input;

  const normalizedBlockKind = String(blockKind || '').trim();
  if (!normalizedBlockKind) {
    throw new Error('canonical node.blockKind must be a non-empty string');
  }

  const normalizedChildren = Array.isArray(children) ? children : [];

  return {
    schemaVersion: CANONICAL_SCHEMA_VERSION,
    id: normalizeNodeId(id, path),
    blockKind: normalizedBlockKind,
    props: canonicalizeValue(isPlainObject(props) ? props : {}),
    children: normalizedChildren.map((entry, index) => normalizeCanonicalNode(entry, [...path, index])),
    origin: normalizeOrigin(origin, unknownTopLevelFields),
    lossiness: normalizeLossiness(lossiness),
    // Keep future compatibility explicit when decoding older payloads.
    sourceSchemaVersion: Number.isFinite(Number(sourceSchemaVersion))
      ? Number(sourceSchemaVersion)
      : Number.isFinite(Number(schemaVersion))
        ? Number(schemaVersion)
        : CANONICAL_SCHEMA_VERSION
  };
}

export function normalizeCanonicalNodes(nodes) {
  if (!Array.isArray(nodes)) {
    throw new Error('canonical nodes must be an array');
  }
  return nodes.map((entry, index) => normalizeCanonicalNode(entry, [index]));
}

export function encodeCanonicalNodes(nodes) {
  return JSON.stringify(normalizeCanonicalNodes(nodes));
}

export function decodeCanonicalNodes(raw) {
  const parsed = JSON.parse(String(raw || '[]'));
  return normalizeCanonicalNodes(parsed);
}
