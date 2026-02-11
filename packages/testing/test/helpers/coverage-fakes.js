export function createRuntime(now = '2026-02-11T00:00:00.000Z') {
  return { now: () => new Date(now) };
}

export function createInMemoryState() {
  return {
    documents: new Map(),
    revisions: new Map(),
    revisionsByDoc: new Map(),
    contentTypes: new Map(),
    taxonomies: new Map(),
    terms: new Map()
  };
}

export function createFakeD1({ allRows = {}, firstRows = {} } = {}) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      const ctx = { args: [] };
      const api = {
        bind(...args) {
          ctx.args = args;
          return api;
        },
        async all() {
          calls.push({ kind: 'all', sql, args: ctx.args });
          const key = `${sql}::${JSON.stringify(ctx.args || [])}`;
          return { results: allRows[key] ?? allRows[sql] ?? [] };
        },
        async first() {
          calls.push({ kind: 'first', sql, args: ctx.args });
          const key = `${sql}::${JSON.stringify(ctx.args || [])}`;
          return firstRows[key] ?? firstRows[sql] ?? null;
        },
        async run() {
          calls.push({ kind: 'run', sql, args: ctx.args });
          return { success: true };
        }
      };
      return api;
    },
    async batch(ops) {
      // Minimal fake: records that batch was invoked; it does not execute statements.
      calls.push({ kind: 'batch', count: ops.length });
      return [];
    }
  };
}

export function parseJsonSafe(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function createKvHelpers() {
  const kv = new Map();
  const appKey = (...parts) => parts.join(':');
  const kvGetJson = async (k) => (kv.has(k) ? kv.get(k) : null);
  const kvPutJson = async (k, v) => {
    kv.set(k, v);
  };
  const kvIndexAdd = async (k, v) => {
    const arr = (await kvGetJson(k)) || [];
    if (!arr.includes(v)) arr.push(v);
    await kvPutJson(k, arr);
  };
  const kvDelete = async (k) => {
    kv.delete(k);
  };
  return { kv, appKey, kvGetJson, kvPutJson, kvIndexAdd, kvDelete };
}
