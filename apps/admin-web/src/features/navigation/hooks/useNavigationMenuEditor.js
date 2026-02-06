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

export function useNavigationMenuEditor({ navigation, actions, menuKey = 'primary' }) {
  const [menuTitle, setMenuTitle] = useState('Primary Menu');
  const [items, setItems] = useState([]);

  useEffect(() => {
    actions.onLoadNavigationMenu?.(menuKey).catch(() => { });
  }, [actions, menuKey]);

  useEffect(() => {
    const menu = navigation?.menu;
    if (!menu) return;
    setMenuTitle(menu.title || 'Primary Menu');
    setItems(normalizeItems(menu.items));
  }, [navigation?.menu?.updatedAt, navigation?.menu?.key]);

  const uiState = useMemo(() => ({
    isLoading: Boolean(navigation?.isLoading),
    isSaving: Boolean(navigation?.isSaving),
  }), [navigation?.isLoading, navigation?.isSaving]);

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
    await actions.onSaveNavigationMenu?.({
      title: menuTitle,
      items: items.map((entry, index) => ({ ...entry, order: index })),
    }, menuKey);
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
