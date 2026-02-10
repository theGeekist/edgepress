export function createNavigationD1(d1, D1_SQL, parseJsonSafe, runtime, ensureD1AppSchema) {
  return {
    async listNavigationMenus() {
      await ensureD1AppSchema();
      const rows = await d1.prepare(D1_SQL.selectNavigationMenus).all();
      return (rows.results || []).map((entry) => parseJsonSafe(entry.menu_json)).filter(Boolean);
    },
    async getNavigationMenu(key) {
      await ensureD1AppSchema();
      const row = await d1.prepare(D1_SQL.selectNavigationMenuByKey).bind(key).first();
      return parseJsonSafe(row?.menu_json);
    },
    async upsertNavigationMenu(menu) {
      await ensureD1AppSchema();
      const key = String(menu?.key || '').trim();
      const updated = { ...menu, key, updatedAt: runtime.now().toISOString() };
      await d1.prepare(D1_SQL.upsertNavigationMenu).bind(key, JSON.stringify(updated), updated.updatedAt).run();
      return updated;
    }
  };
}

export function createNavigationKv(appKey, kvGetJson, kvPutJson, ensureKvSeeded, kvIndexAdd, runtime) {
  return {
    async listNavigationMenus() {
      await ensureKvSeeded();
      const keys = (await kvGetJson(appKey('navigation_menu_keys'))) || [];
      const menus = await Promise.all(keys.map((key) => kvGetJson(appKey('navigation_menu', key))));
      return menus.filter(Boolean);
    },
    async getNavigationMenu(key) {
      await ensureKvSeeded();
      return kvGetJson(appKey('navigation_menu', key));
    },
    async upsertNavigationMenu(menu) {
      await ensureKvSeeded();
      const key = String(menu?.key || '').trim();
      const updated = { ...menu, key, updatedAt: runtime.now().toISOString() };
      await kvPutJson(appKey('navigation_menu', key), updated);
      await kvIndexAdd(appKey('navigation_menu_keys'), key);
      return updated;
    }
  };
}
