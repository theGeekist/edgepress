function normalizeMenuItem(item, index, runtime) {
  const kind = item?.kind === 'external' ? 'external' : 'internal';
  const id = String(item?.id || `nav_item_${runtime.uuid()}`);
  return {
    id,
    label: String(item?.label || '').trim() || `Item ${index + 1}`,
    kind,
    route: kind === 'internal' ? String(item?.route || '').trim() : '',
    documentId: kind === 'internal' ? String(item?.documentId || '').trim() : '',
    externalUrl: kind === 'external' ? String(item?.externalUrl || '').trim() : '',
    order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index,
    parentId: String(item?.parentId || '').trim() || null,
    target: String(item?.target || '_self').trim() || '_self',
    rel: String(item?.rel || '').trim()
  };
}

function normalizeMenuPayload(input, key, runtime) {
  const itemsInput = Array.isArray(input?.items) ? input.items : [];
  const normalizedItems = itemsInput
    .map((entry, index) => normalizeMenuItem(entry, index, runtime))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
    .map((entry, index) => ({ ...entry, order: index }));
  const now = runtime.now().toISOString();
  return {
    id: `nav_${key}`,
    key,
    title: String(input?.title || key).trim() || key,
    items: normalizedItems,
    updatedAt: now
  };
}

function defaultMenu(key, runtime) {
  return {
    id: `nav_${key}`,
    key,
    title: key,
    items: [],
    updatedAt: runtime.now().toISOString()
  };
}

export function createNavigationFeature({ runtime, store }) {
  async function listMenus() {
    const items = await store.listNavigationMenus();
    return { items: Array.isArray(items) ? items : [] };
  }

  async function getMenu({ key }) {
    const menuKey = String(key || '').trim();
    if (!menuKey) return { error: { code: 'NAVIGATION_KEY_INVALID', message: 'Navigation menu key is required', status: 400 } };
    const menu = (await store.getNavigationMenu(menuKey)) || defaultMenu(menuKey, runtime);
    return { menu };
  }

  async function upsertMenu({ key, body }) {
    const menuKey = String(key || '').trim();
    if (!menuKey) return { error: { code: 'NAVIGATION_KEY_INVALID', message: 'Navigation menu key is required', status: 400 } };
    const nextMenu = normalizeMenuPayload(body, menuKey, runtime);
    const menu = await store.upsertNavigationMenu(nextMenu);
    return { menu };
  }

  return {
    listMenus,
    getMenu,
    upsertMenu
  };
}
