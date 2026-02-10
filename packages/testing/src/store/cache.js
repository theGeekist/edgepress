export function createCacheStoreFeature(state) {
  return {
    async get(key) {
      const item = state.cache.get(key);
      if (!item) return null;
      if (item.expiresAt <= Date.now()) {
        state.cache.delete(key);
        return null;
      }
      return item.value;
    },
    async set(key, value, ttlSeconds = 60) {
      state.cache.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000
      });
    },
    async del(key) {
      state.cache.delete(key);
    }
  };
}
