export function createBlobStoreFeature(state, _runtime) {
  return {
    async putBlob(path, bytes, metadata = {}) {
      state.blobs.set(path, { bytes, metadata });
      return { path, ...metadata };
    },
    async getBlob(path) {
      return state.blobs.get(path) || null;
    },
    async signedReadUrl(path, ttlSeconds = 300) {
      return `/blob/${encodeURIComponent(path)}?ttl=${ttlSeconds}`;
    }
  };
}
