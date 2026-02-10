export function createCoordinationFeature() {
  return {
    async acquireLock(name) {
      return { token: `lock:${name}` };
    },
    async releaseLock() {}
  };
}
