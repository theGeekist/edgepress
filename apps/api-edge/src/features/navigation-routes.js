import { requireCapability } from '../auth.js';
import { error, json, readJson } from '../http.js';

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

export function createNavigationRoutes({ runtime, store, route, authzErrorResponse }) {
  return [
    route('GET', '/v1/navigation/menus', async (request) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        const items = await store.listNavigationMenus();
        return json({ items: Array.isArray(items) ? items : [] });
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),
    route('GET', '/v1/navigation/menus/:key', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        const key = String(params.key || '').trim();
        if (!key) return error('NAVIGATION_KEY_INVALID', 'Navigation menu key is required', 400);
        const menu = (await store.getNavigationMenu(key)) || defaultMenu(key, runtime);
        return json({ menu });
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),
    route('PUT', '/v1/navigation/menus/:key', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:write' });
        const key = String(params.key || '').trim();
        if (!key) return error('NAVIGATION_KEY_INVALID', 'Navigation menu key is required', 400);
        const body = await readJson(request);
        const nextMenu = normalizeMenuPayload(body, key, runtime);
        const menu = await store.upsertNavigationMenu(nextMenu);
        return json({ menu });
      } catch (e) {
        return authzErrorResponse(e);
      }
    })
  ];
}
