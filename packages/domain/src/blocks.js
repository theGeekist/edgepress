export const BLOCKS_SCHEMA_VERSION = 1;

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
  const keys = Object.keys(value).sort();
  const out = {};
  for (const key of keys) {
    out[key] = canonicalizeValue(value[key]);
  }
  return out;
}

function normalizeBlock(block, path) {
  if (!isPlainObject(block)) {
    throw new Error(`${path} must be an object`);
  }
  if (typeof block.name !== 'string' || !block.name.trim()) {
    throw new Error(`${path}.name must be a non-empty string`);
  }

  const normalized = canonicalizeValue(block);
  if (!Array.isArray(normalized.innerBlocks)) {
    if (normalized.innerBlocks === undefined) {
      normalized.innerBlocks = [];
    } else {
      throw new Error(`${path}.innerBlocks must be an array when provided`);
    }
  }
  normalized.innerBlocks = normalized.innerBlocks.map((entry, index) =>
    normalizeBlock(entry, `${path}.innerBlocks[${index}]`)
  );

  if (normalized.attributes !== undefined && !isPlainObject(normalized.attributes)) {
    throw new Error(`${path}.attributes must be an object when provided`);
  }
  if (normalized.attributes === undefined) {
    normalized.attributes = {};
  }
  return normalized;
}

export function normalizeBlocksInput(input) {
  if (input === undefined) return [];
  if (!Array.isArray(input)) {
    throw new Error('blocks must be an array');
  }
  return input.map((block, index) => normalizeBlock(block, `blocks[${index}]`));
}
