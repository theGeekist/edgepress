import crypto from 'node:crypto';
import { createInMemoryPlatform } from '../../testing/src/inMemoryPlatform.js';

export const D1_SQL = {
  createReleaseManifests:
    'CREATE TABLE IF NOT EXISTS release_manifests (release_id TEXT PRIMARY KEY, manifest_json TEXT NOT NULL, manifest_created_at TEXT NOT NULL, created_at TEXT NOT NULL)',
  createReleaseState:
    'CREATE TABLE IF NOT EXISTS release_state (id INTEGER PRIMARY KEY CHECK(id = 1), active_release_id TEXT)',
  createReleaseHistory:
    'CREATE TABLE IF NOT EXISTS release_history (id INTEGER PRIMARY KEY AUTOINCREMENT, event_json TEXT NOT NULL, created_at TEXT NOT NULL)',
  insertHistory: 'INSERT INTO release_history (event_json, created_at) VALUES (?, ?)',
  selectManifestId: 'SELECT release_id FROM release_manifests WHERE release_id = ?',
  selectManifestById: 'SELECT manifest_json FROM release_manifests WHERE release_id = ?',
  selectAllManifests:
    'SELECT manifest_json FROM release_manifests ORDER BY manifest_created_at ASC, created_at ASC, release_id ASC',
  insertManifest: 'INSERT INTO release_manifests (release_id, manifest_json, manifest_created_at, created_at) VALUES (?, ?, ?, ?)',
  selectActiveRelease: 'SELECT active_release_id FROM release_state WHERE id = 1',
  upsertActiveRelease:
    'INSERT INTO release_state (id, active_release_id) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET active_release_id = excluded.active_release_id',
  selectHistory: 'SELECT event_json FROM release_history ORDER BY id ASC'
};

/**
 * Reference Cloudflare adapter implementation.
 * This package is the only place where Cloudflare binding names should appear.
 *
 * @typedef {import('@cloudflare/workers-types').ExecutionContext} ExecutionContext
 * @typedef {import('@cloudflare/workers-types').KVNamespace} KVNamespace
 * @typedef {import('@cloudflare/workers-types').R2Bucket} R2Bucket
 * @typedef {import('@cloudflare/workers-types').D1Database} D1Database
 * @typedef {{ TOKEN_KEY?: string, KV?: KVNamespace & { __keys?: string[] }, R2_BUCKET?: R2Bucket & { createSignedUrl?: (path: string, ttlSeconds: number) => string }, D1?: D1Database }} CloudflareEnv
 */
export function createCloudflareReferencePlatform(env = /** @type {CloudflareEnv} */ ({}), options = {}) {
  const base = createInMemoryPlatform();
  const r2 = env.R2_BUCKET;
  const kv = env.KV;
  const d1 = env.D1;
  /** @type {ExecutionContext | null} */
  const ctx = options.ctx || null;
  const releasePrefix = 'release:';
  const releasePointerKey = `${releasePrefix}active`;
  const releaseHistoryKey = `${releasePrefix}history`;

  function manifestKey(releaseId) {
    return `${releasePrefix}manifest:${releaseId}`;
  }

  async function kvGetJson(key) {
    if (!kv?.get) return null;
    const raw = await kv.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async function kvPutJson(key, value) {
    if (!kv?.put) return;
    await kv.put(key, JSON.stringify(value));
  }

  async function kvListManifests() {
    if (!kv?.get) return null;
    const releases = [];
    for (const key of await kvKeys()) {
      if (!key.startsWith(`${releasePrefix}manifest:`)) continue;
      const manifest = await kvGetJson(key);
      if (manifest) releases.push(manifest);
    }
    return releases;
  }

  async function kvKeys() {
    if (typeof kv.list === 'function') {
      const collected = [];
      let cursor;
      do {
        const page = await kv.list({
          prefix: `${releasePrefix}manifest:`,
          cursor
        });
        for (const item of page.keys || []) {
          collected.push(item.name);
        }
        cursor = page.list_complete ? undefined : page.cursor;
      } while (cursor);
      return collected;
    }
    if (kv.__keys && Array.isArray(kv.__keys)) {
      return kv.__keys.slice();
    }
    return [];
  }

  const releaseState = {
    manifests: new Map(),
    history: [],
    activeRelease: null
  };
  let d1SchemaReady = false;

  function parseJsonSafe(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async function ensureD1ReleaseSchema() {
    if (!d1 || d1SchemaReady) return;
    await d1.exec(D1_SQL.createReleaseManifests);
    await d1.exec(D1_SQL.createReleaseState);
    await d1.exec(D1_SQL.createReleaseHistory);
    // Backward-compatible migration from earlier schemas that lacked manifest_created_at.
    try {
      await d1.exec('ALTER TABLE release_manifests ADD COLUMN manifest_created_at TEXT');
    } catch {}
    try {
      await d1.exec(
        "UPDATE release_manifests SET manifest_created_at = COALESCE(json_extract(manifest_json, '$.createdAt'), created_at) WHERE manifest_created_at IS NULL"
      );
    } catch {}
    d1SchemaReady = true;
  }

  const runtime = {
    ...base.runtime,
    env(key) {
      return env[key] || process.env[key];
    },
    async hmacSign(input, keyRef = 'TOKEN_KEY') {
      const key = this.env(keyRef) || 'cf-dev-token-key';
      return crypto.createHmac('sha256', key).update(input).digest('hex');
    },
    requestContext(request) {
      const cfRay = request?.headers.get('cf-ray') || `ray_${crypto.randomUUID().slice(0, 8)}`;
      const ipHash = request?.headers.get('cf-connecting-ip') || 'cf_ip_unknown';
      return {
        traceId: request?.headers.get('x-trace-id') || cfRay,
        ipHash,
        userAgentHash: request?.headers.get('user-agent') || 'cf_ua_unknown',
        requestId: cfRay
      };
    },
    base64urlEncode(value) {
      return base.runtime.base64urlEncode(value);
    },
    base64urlDecode(value) {
      return base.runtime.base64urlDecode(value);
    },
    waitUntil(promise) {
      if (ctx?.waitUntil) {
        ctx.waitUntil(promise);
        return;
      }
      base.runtime.waitUntil(promise);
    }
  };

  const blobStore = {
    async putBlob(path, bytes, metadata = {}) {
      if (r2?.put) {
        await r2.put(path, bytes, {
          httpMetadata: { contentType: metadata.contentType || 'application/octet-stream' }
        });
        return { path, ...metadata };
      }
      return base.blobStore.putBlob(path, bytes, metadata);
    },
    async getBlob(path) {
      if (r2?.get) {
        const object = await r2.get(path);
        if (!object) return null;
        let bytes = '';
        if (typeof object.text === 'function') {
          bytes = await object.text();
        } else if (typeof object.arrayBuffer === 'function') {
          bytes = new TextDecoder().decode(await object.arrayBuffer());
        } else if (typeof object.body === 'string') {
          bytes = object.body;
        }
        const contentType = object.httpMetadata?.contentType || object.contentType;
        return { bytes, metadata: { contentType } };
      }
      return base.blobStore.getBlob(path);
    },
    async signedReadUrl(path, ttlSeconds = 300) {
      if (r2?.createSignedUrl) {
        return r2.createSignedUrl(path, ttlSeconds);
      }
      return base.blobStore.signedReadUrl(path, ttlSeconds);
    }
  };

  const cacheStore = {
    async get(key) {
      if (kv?.get) {
        const wrapped = await kvGetJson(`cache:${key}`);
        if (!wrapped) return null;
        if (wrapped.expiresAt <= Date.now()) {
          if (kv.delete) await kv.delete(`cache:${key}`);
          return null;
        }
        return wrapped.value;
      }
      return base.cacheStore.get(key);
    },
    async set(key, value, ttlSeconds = 60) {
      if (kv?.put) {
        const wrapped = {
          value,
          expiresAt: Date.now() + ttlSeconds * 1000
        };
        await kvPutJson(`cache:${key}`, wrapped);
        return;
      }
      await base.cacheStore.set(key, value, ttlSeconds);
    },
    async del(key) {
      if (kv?.delete) {
        await kv.delete(`cache:${key}`);
        return;
      }
      await base.cacheStore.del(key);
    }
  };

  async function appendReleaseHistory(event) {
    if (d1) {
      await ensureD1ReleaseSchema();
      await d1
        .prepare(D1_SQL.insertHistory)
        .bind(JSON.stringify(event), event.at || runtime.now().toISOString())
        .run();
      return;
    }
    if (kv?.get && kv?.put) {
      const history = (await kvGetJson(releaseHistoryKey)) || [];
      history.push(event);
      await kvPutJson(releaseHistoryKey, history);
      return;
    }
    releaseState.history.push(event);
  }

  async function runD1Atomic(statements, eventLabel) {
    if (!d1) return;
    if (typeof d1.batch === 'function') {
      await d1.batch(statements);
      return;
    }
    runtime.log('warn', 'd1_non_atomic_fallback', { event: eventLabel });
    for (const statement of statements) {
      await statement.run();
    }
  }

  async function hasManifest(releaseId) {
    if (d1) {
      await ensureD1ReleaseSchema();
      const row = await d1
        .prepare(D1_SQL.selectManifestId)
        .bind(releaseId)
        .first();
      return Boolean(row?.release_id);
    }
    if (kv?.get) {
      return Boolean(await kv.get(manifestKey(releaseId)));
    }
    return releaseState.manifests.has(releaseId);
  }

  async function getActiveReleaseInternal() {
    if (d1) {
      await ensureD1ReleaseSchema();
      const row = await d1.prepare(D1_SQL.selectActiveRelease).first();
      return row?.active_release_id || null;
    }
    if (kv?.get) {
      return (await kv.get(releasePointerKey)) || null;
    }
    return releaseState.activeRelease;
  }

  const releaseStore = {
    async writeArtifact(releaseId, route, bytes, contentType = 'text/html') {
      const path = `${releaseId}/${route}.html`;
      await blobStore.putBlob(path, bytes, { contentType });
      await appendReleaseHistory({
        type: 'artifact_written',
        releaseId,
        route,
        path,
        at: runtime.now().toISOString()
      });
      return { releaseId, route, path, contentType };
    },
    async writeManifest(releaseId, manifest) {
      if (d1) {
        await ensureD1ReleaseSchema();
        const manifestWrittenAt = runtime.now().toISOString();
        const manifestCreatedAt = manifest?.createdAt || manifestWrittenAt;
        const event = {
          type: 'manifest_written',
          releaseId,
          at: manifestWrittenAt
        };
        try {
          const insertManifest = d1
            .prepare(D1_SQL.insertManifest)
            .bind(releaseId, JSON.stringify(manifest), manifestCreatedAt, manifestWrittenAt);
          const insertHistory = d1
            .prepare(D1_SQL.insertHistory)
            .bind(JSON.stringify(event), manifestWrittenAt);
          await runD1Atomic([insertManifest, insertHistory], 'write_manifest');
        } catch (error) {
          if (await hasManifest(releaseId)) {
            throw new Error('ReleaseManifest is immutable and already exists for this releaseId');
          }
          throw error;
        }
      } else if (await hasManifest(releaseId)) {
        throw new Error('ReleaseManifest is immutable and already exists for this releaseId');
      } else if (kv?.put) {
        await kvPutJson(manifestKey(releaseId), manifest);
      } else {
        releaseState.manifests.set(releaseId, manifest);
      }
      if (!d1) {
        await appendReleaseHistory({
          type: 'manifest_written',
          releaseId,
          at: runtime.now().toISOString()
        });
      }
    },
    async getManifest(releaseId) {
      if (d1) {
        await ensureD1ReleaseSchema();
        const row = await d1
          .prepare(D1_SQL.selectManifestById)
          .bind(releaseId)
          .first();
        return parseJsonSafe(row?.manifest_json);
      }
      if (kv?.get) {
        return kvGetJson(manifestKey(releaseId));
      }
      return releaseState.manifests.get(releaseId) || null;
    },
    async listReleases() {
      if (d1) {
        await ensureD1ReleaseSchema();
        const rows = await d1
          .prepare(D1_SQL.selectAllManifests)
          .all();
        return (rows.results || []).map((entry) => parseJsonSafe(entry.manifest_json)).filter(Boolean);
      }
      const manifests = await kvListManifests();
      if (manifests) return manifests;
      return Array.from(releaseState.manifests.values());
    },
    async activateRelease(releaseId) {
      if (!(await hasManifest(releaseId))) {
        throw new Error('Unknown releaseId');
      }
      const previousReleaseId = await getActiveReleaseInternal();
      if (previousReleaseId === releaseId) {
        return previousReleaseId;
      }
      if (d1) {
        await ensureD1ReleaseSchema();
        const activatedAt = runtime.now().toISOString();
        const event = {
          type: 'activated',
          releaseId,
          previousReleaseId,
          at: activatedAt
        };
        const upsertState = d1
          .prepare(D1_SQL.upsertActiveRelease)
          .bind(releaseId);
        const insertHistory = d1
          .prepare(D1_SQL.insertHistory)
          .bind(JSON.stringify(event), activatedAt);
        await runD1Atomic([upsertState, insertHistory], 'activate_release');
      } else if (kv?.put) {
        await kv.put(releasePointerKey, releaseId);
      } else {
        releaseState.activeRelease = releaseId;
      }
      if (!d1) {
        await appendReleaseHistory({
          type: 'activated',
          releaseId,
          previousReleaseId,
          at: runtime.now().toISOString()
        });
      }
      return releaseId;
    },
    async getActiveRelease() {
      return getActiveReleaseInternal();
    },
    async getReleaseHistory() {
      if (d1) {
        await ensureD1ReleaseSchema();
        const rows = await d1.prepare(D1_SQL.selectHistory).all();
        return (rows.results || []).map((entry) => parseJsonSafe(entry.event_json)).filter(Boolean);
      }
      if (kv?.get) {
        return (await kvGetJson(releaseHistoryKey)) || [];
      }
      return releaseState.history.slice();
    }
  };

  return {
    ...base,
    runtime,
    blobStore,
    cacheStore,
    releaseStore
  };
}
