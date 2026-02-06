export function createBlobStore({ r2, baseBlobStore }) {
  return {
    async putBlob(path, bytes, metadata = {}) {
      if (r2?.put) {
        await r2.put(path, bytes, {
          httpMetadata: { contentType: metadata.contentType || 'application/octet-stream' }
        });
        return { path, ...metadata };
      }
      return baseBlobStore.putBlob(path, bytes, metadata);
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
      return baseBlobStore.getBlob(path);
    },
    async signedReadUrl(path, ttlSeconds = 300) {
      if (r2?.createSignedUrl) {
        return r2.createSignedUrl(path, ttlSeconds);
      }
      return baseBlobStore.signedReadUrl(path, ttlSeconds);
    }
  };
}

export function createCacheStore({ kv, baseCacheStore, kvGetJson, kvPutJson }) {
  return {
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
      return baseCacheStore.get(key);
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
      await baseCacheStore.set(key, value, ttlSeconds);
    },
    async del(key) {
      if (kv?.delete) {
        await kv.delete(`cache:${key}`);
        return;
      }
      await baseCacheStore.del(key);
    }
  };
}
