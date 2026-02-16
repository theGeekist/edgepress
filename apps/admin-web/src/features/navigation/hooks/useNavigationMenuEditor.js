import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function normalizeKind(item) {
  if (item?.kind === 'external' || item?.kind === 'internal') {
    return item.kind;
  }
  if (item?.documentId) {
    return 'internal';
  }
  return 'external';
}

function normalizeMenuItem(item, index) {
  const kind = normalizeKind(item);
  const route = String(item?.route || item?.url || '');
  const externalUrl = String(item?.externalUrl || item?.url || '');
  return {
    ...item,
    id: String(item?.id || `item_${index}`),
    label: String(item?.label || ''),
    kind,
    documentId: item?.documentId ? String(item.documentId) : null,
    route: kind === 'internal' ? route : '',
    externalUrl: kind === 'external' ? externalUrl : '',
    url: kind === 'internal' ? route : externalUrl,
    parentId: item?.parentId ? String(item.parentId) : null,
    order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index,
    target: String(item?.target || '_self'),
    rel: String(item?.rel || '')
  };
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter(Boolean)
    .map((item, index) => normalizeMenuItem(item, index));
}

function normalizeForSave(title, items) {
  return {
    title: String(title || 'Primary Menu'),
    items: normalizeItems(items)
  };
}

function stableSignature(payload) {
  return JSON.stringify(payload);
}

export function useNavigationMenuEditor({ navigation, actions, menuKey = 'primary' }) {
  const newItemCounterRef = useRef(0);
  const [menuTitle, setMenuTitle] = useState('Primary Menu');
  const [items, setItems] = useState([]);
  const [baselineSignature, setBaselineSignature] = useState(
    stableSignature(normalizeForSave('Primary Menu', []))
  );
  const [uiState, setUiState] = useState({
    isLoading: false,
    isSaving: false,
    isDirty: false
  });

  const currentSignature = useMemo(
    () => stableSignature(normalizeForSave(menuTitle, items)),
    [menuTitle, items]
  );
  const isDirty = currentSignature !== baselineSignature;

  useEffect(() => {
    setUiState((prev) => ({ ...prev, isDirty }));
  }, [isDirty]);

  useEffect(() => {
    const menu = navigation?.menu;
    if (!menu) return;
    const nextTitle = String(menu.title || 'Primary Menu');
    const nextItems = normalizeItems(menu.items);
    const signature = stableSignature(normalizeForSave(nextTitle, nextItems));
    setMenuTitle(nextTitle);
    setItems(nextItems);
    setBaselineSignature(signature);
    setUiState((prev) => ({ ...prev, isLoading: false, isDirty: false }));
  }, [navigation?.menu]);

  const addItem = useCallback((partialItem) => {
    setItems((prev) => {
      const next = normalizeItems(prev);
      newItemCounterRef.current += 1;
      next.push({
        id: `new_${Date.now()}_${newItemCounterRef.current}`,
        label: String(partialItem?.label || ''),
        kind: normalizeKind(partialItem),
        documentId: partialItem?.documentId ? String(partialItem.documentId) : null,
        route: String(partialItem?.route || ''),
        externalUrl: String(partialItem?.externalUrl || ''),
        url: String(partialItem?.url || partialItem?.route || partialItem?.externalUrl || ''),
        parentId: null,
        order: next.length,
        target: '_self',
        rel: ''
      });
      return next;
    });
  }, []);

  const saveMenu = useCallback(async () => {
    if (!actions?.onSaveNavigationMenu) {
      return false;
    }
    setUiState((prev) => ({ ...prev, isSaving: true }));
    const payload = normalizeForSave(menuTitle, items);
    try {
      await actions.onSaveNavigationMenu(payload, menuKey);
      setBaselineSignature(stableSignature(payload));
      setUiState((prev) => ({ ...prev, isSaving: false, isDirty: false }));
      return true;
    } catch (error) {
      setUiState((prev) => ({ ...prev, isSaving: false }));
      throw error;
    }
  }, [actions, items, menuKey, menuTitle]);

  return {
    menuTitle,
    setMenuTitle,
    items,
    setItems,
    addItem,
    saveMenu,
    uiState
  };
}
