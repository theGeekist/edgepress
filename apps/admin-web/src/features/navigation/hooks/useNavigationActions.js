import { useCallback, useRef, useState } from 'react';

function asErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

export function useNavigationActions({ auth, shell, setStatus, setError }) {
  const [navigationMenu, setNavigationMenu] = useState(null);
  const [navigationMenuLoading, setNavigationMenuLoading] = useState(false);
  const [navigationMenuSaving, setNavigationMenuSaving] = useState(false);
  const loadedNavigationMenuKeyRef = useRef(null);

  const onLoadNavigationMenu = useCallback(async (key = 'primary', { force = false } = {}) => {
    if (!auth.user) {
      return null;
    }
    if (!force && loadedNavigationMenuKeyRef.current === key && navigationMenu) {
      return navigationMenu;
    }
    setNavigationMenuLoading(true);
    try {
      const payload = await shell.getNavigationMenu(key);
      const menu = payload?.menu || null;
      setNavigationMenu(menu);
      loadedNavigationMenuKeyRef.current = key;
      return menu;
    } finally {
      setNavigationMenuLoading(false);
    }
  }, [auth.user, shell, navigationMenu]);

  const onSaveNavigationMenu = useCallback(async (nextMenu, key = 'primary') => {
    if (!auth.user) {
      return null;
    }
    setNavigationMenuSaving(true);
    setError('');
    setStatus('Saving menu...');
    try {
      const payload = await shell.upsertNavigationMenu(key, {
        title: nextMenu?.title || key,
        items: Array.isArray(nextMenu?.items) ? nextMenu.items : []
      });
      const menu = payload?.menu || null;
      if (menu) {
        setNavigationMenu(menu);
        loadedNavigationMenuKeyRef.current = key;
      }
      setStatus('Menu saved.');
      return menu;
    } catch (nextError) {
      setError(asErrorMessage(nextError));
      setStatus('');
      throw nextError;
    } finally {
      setNavigationMenuSaving(false);
    }
  }, [auth.user, shell, setError, setStatus]);

  return {
    navigationMenu,
    setNavigationMenu,
    navigationMenuLoading,
    navigationMenuSaving,
    onLoadNavigationMenu,
    onSaveNavigationMenu,
    loadedNavigationMenuKeyRef
  };
}
