function byPriorityThenId(a, b) {
  const ap = Number.isFinite(Number(a.priority)) ? Number(a.priority) : 0;
  const bp = Number.isFinite(Number(b.priority)) ? Number(b.priority) : 0;
  if (ap !== bp) {
    return bp - ap;
  }
  return String(a.id).localeCompare(String(b.id));
}

function assertTransformId(entry, registryName) {
  const id = String(entry?.id || '').trim();
  if (!id) {
    throw new Error(`${registryName}: transform id is required`);
  }
  return id;
}

export function createImportTransformRegistry(seed = []) {
  const map = new Map();

  function register(entry) {
    const id = assertTransformId(entry, 'importTransforms');
    const next = {
      id,
      priority: Number.isFinite(Number(entry?.priority)) ? Number(entry.priority) : 0,
      wpBlockNames: Array.isArray(entry?.wpBlockNames)
        ? [...new Set(entry.wpBlockNames.map((item) => String(item || '').trim()).filter(Boolean))].sort()
        : [],
      canHandle: typeof entry?.canHandle === 'function' ? entry.canHandle : () => true,
      toCanonical: entry?.toCanonical,
      meta: entry?.meta || {}
    };
    if (typeof next.toCanonical !== 'function') {
      throw new Error(`importTransforms: toCanonical is required for '${id}'`);
    }
    map.set(id, next);
    return next;
  }

  function getAll() {
    return Array.from(map.values()).sort(byPriorityThenId);
  }

  for (const entry of seed) {
    register(entry);
  }

  return {
    register,
    getAll,
    getById(id) {
      return map.get(id) || null;
    }
  };
}

export function createRendererRegistry(seed = []) {
  const map = new Map();

  function register(entry) {
    const id = assertTransformId(entry, 'renderers');
    const next = {
      id,
      priority: Number.isFinite(Number(entry?.priority)) ? Number(entry.priority) : 0,
      blockKinds: Array.isArray(entry?.blockKinds)
        ? [...new Set(entry.blockKinds.map((item) => String(item || '').trim()).filter(Boolean))].sort()
        : [],
      targets: Array.isArray(entry?.targets)
        ? [...new Set(entry.targets.map((item) => String(item || '').trim()).filter(Boolean))].sort()
        : ['publish'],
      canHandle: typeof entry?.canHandle === 'function' ? entry.canHandle : () => true,
      render: entry?.render,
      meta: entry?.meta || {}
    };
    if (typeof next.render !== 'function') {
      throw new Error(`renderers: render is required for '${id}'`);
    }
    map.set(id, next);
    return next;
  }

  function getAll() {
    return Array.from(map.values()).sort(byPriorityThenId);
  }

  for (const entry of seed) {
    register(entry);
  }

  return {
    register,
    getAll,
    getById(id) {
      return map.get(id) || null;
    }
  };
}
