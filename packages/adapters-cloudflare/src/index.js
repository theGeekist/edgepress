import { createInMemoryPlatform } from '../../testing/src/inMemoryPlatform.js';
import { createCloudflareRuntime } from './runtime.js';
import { createBlobStore, createCacheStore } from './io-stores.js';
import { createReleaseStore } from './release-store.js';
import { createAppStores } from './app-store.js';
import { D1_SQL } from './d1-sql.js';

export { D1_SQL } from './d1-sql.js';

/**
 * Reference Cloudflare adapter implementation.
 * This package is the only place where Cloudflare binding names should appear.
 *
 * @typedef {import('@cloudflare/workers-types').ExecutionContext} ExecutionContext
 * @typedef {import('@cloudflare/workers-types').KVNamespace} KVNamespace
 * @typedef {import('@cloudflare/workers-types').R2Bucket} R2Bucket
 * @typedef {import('@cloudflare/workers-types').D1Database} D1Database
 * @typedef {{ TOKEN_KEY?: string, PREVIEW_TOKEN_KEY?: string, PRIVATE_CACHE_SCOPE_KEY?: string, BOOTSTRAP_ADMIN_USERNAME?: string, BOOTSTRAP_ADMIN_PASSWORD?: string, BOOTSTRAP_ADMIN_ROLE?: string, KV?: KVNamespace & { __keys?: string[] }, R2_BUCKET?: R2Bucket & { createSignedUrl?: (path: string, ttlSeconds: number) => string }, D1?: D1Database }} CloudflareEnv
 */
export function createCloudflareReferencePlatform(env = /** @type {CloudflareEnv} */ ({}), options = {}) {
  const base = createInMemoryPlatform();
  const r2 = env.R2_BUCKET;
  const kv = env.KV;
  const d1 = env.D1;
  /** @type {ExecutionContext | null} */
  const ctx = options.ctx || null;

  const bootstrapAdminUsername = env.BOOTSTRAP_ADMIN_USERNAME || process.env.BOOTSTRAP_ADMIN_USERNAME || null;
  const bootstrapAdminPassword = env.BOOTSTRAP_ADMIN_PASSWORD || process.env.BOOTSTRAP_ADMIN_PASSWORD || null;
  const bootstrapAdminRole = env.BOOTSTRAP_ADMIN_ROLE || process.env.BOOTSTRAP_ADMIN_ROLE || 'admin';

  const bootstrapAdmin = bootstrapAdminUsername && bootstrapAdminPassword
    ? {
        username: bootstrapAdminUsername,
        password: bootstrapAdminPassword,
        role: bootstrapAdminRole
      }
    : null;

  function parseJsonSafe(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async function kvGetJson(key) {
    if (!kv?.get) return null;
    const raw = await kv.get(key);
    return parseJsonSafe(raw);
  }

  async function kvPutJson(key, value) {
    if (!kv?.put) return;
    await kv.put(key, JSON.stringify(value));
  }

  async function kvPutString(key, value) {
    if (!kv?.put) return;
    await kv.put(key, value);
  }

  async function kvGetString(key) {
    if (!kv?.get) return null;
    return kv.get(key);
  }

  const runtime = createCloudflareRuntime({
    baseRuntime: base.runtime,
    env,
    ctx
  });

  const blobStore = createBlobStore({
    r2,
    baseBlobStore: base.blobStore
  });

  const cacheStore = createCacheStore({
    kv,
    baseCacheStore: base.cacheStore,
    kvGetJson,
    kvPutJson
  });

  const releaseStore = createReleaseStore({
    d1,
    kv,
    runtime,
    blobStore,
    baseReleaseStore: base.releaseStore,
    kvGetJson,
    kvPutJson,
    parseJsonSafe,
    D1_SQL
  });

  const { store, previewStore } = createAppStores({
    d1,
    kv,
    runtime,
    baseStore: base.store,
    basePreviewStore: base.previewStore,
    D1_SQL,
    parseJsonSafe,
    kvGetJson,
    kvPutJson,
    kvGetString,
    kvPutString,
    bootstrapAdmin
  });

  return {
    ...base,
    runtime,
    store,
    blobStore,
    cacheStore,
    releaseStore,
    previewStore
  };
}
