import { useEffect, useMemo, useState } from 'react';

function normalizeItems(items) {
  const input = Array.isArray(items) ? items : [];
  return input.map((entry, index) => ({
    id: String(entry?.id || `menu_item_${index + 1}`),
    label: String(entry?.label || '').trim() || `Item ${index + 1}`,
    kind: entry?.kind === 'external' ? 'external' : 'internal',
    route: String(entry?.route || ''),
    documentId: String(entry?.documentId || ''),
    externalUrl: String(entry?.externalUrl || ''),
    parentId: entry?.parentId || null,
    order: Number.isFinite(Number(entry?.order)) ? Number(entry.order) : index,
    target: String(entry?.target || '_self'),
    rel: String(entry?.rel || ''),
  }));
}

function normalizeForSave(title, items) {
  return {
    title: String(title || '').trim() || 'Primary Menu',
    items: normalizeItems(items).map((entry, index) => ({
      ...entry,
      order: index
    }))
  };
}

function stableSignature(value) {
  return JSON.stringify(value);
}

export function useNavigationMenuEditor({ navigation, actions, menuKey = 'primary' }) {
  const [menuTitle, setMenuTitle] = useState('Primary Menu');
  const [items, setItems] = useState([]);
  const [baselineSignature, setBaselineSignature] = useState(stableSignature(normalizeForSave('Primary Menu', [])));

  useEffect(() => {
    actions.onLoadNavigationMenu?.(menuKey).catch(() => { });
  }, [actions, menuKey]);

  useEffect(() => {
    const menu = navigation?.menu;
    if (!menu) return;
    const normalizedTitle = menu.title || 'Primary Menu';
    const normalizedItems = normalizeItems(menu.items);
    const normalizedMenu = normalizeForSave(normalizedTitle, normalizedItems);
    setMenuTitle(normalizedTitle);
    setItems(normalizedItems);
    setBaselineSignature(stableSignature(normalizedMenu));
  }, [navigation?.menu?.updatedAt, navigation?.menu?.key]);

  const currentSignature = useMemo(
    () => stableSignature(normalizeForSave(menuTitle, items)),
    [menuTitle, items]
  );
  const isDirty = currentSignature !== baselineSignature;

  const uiState = useMemo(() => ({
    isLoading: Boolean(navigation?.isLoading),
    isSaving: Boolean(navigation?.isSaving),
    isDirty
  }), [navigation?.isLoading, navigation?.isSaving, isDirty]);

  function addItem(partialItem) {
    const newItem = {
      ...partialItem,
      id: `new_${Date.now()}`,
      parentId: null,
      order: items.length,
      target: '_self',
      rel: '',
    };
    setItems((prev) => [...prev, newItem]);
  }

  async function saveMenu() {
    const payload = normalizeForSave(menuTitle, items);
    await actions.onSaveNavigationMenu?.(payload, menuKey);
    setBaselineSignature(stableSignature(payload));
  }

  return {
    menuTitle,
    setMenuTitle,
    items,
    setItems,
    addItem,
    saveMenu,
    uiState,
  };
}
