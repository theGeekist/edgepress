export function createNavigationFeature(state, runtime) {
  return {
    async listNavigationMenus() {
      return Array.from(state.navigationMenus.values());
    },
    async getNavigationMenu(key) {
      return state.navigationMenus.get(key) || null;
    },
    async upsertNavigationMenu(menu) {
      const normalized = {
        ...menu,
        key: String(menu?.key || '').trim(),
        updatedAt: runtime.now().toISOString()
      };
      state.navigationMenus.set(normalized.key, normalized);
      return normalized;
    }
  };
}
