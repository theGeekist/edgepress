import { useEffect, useRef } from 'react';

function asErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

export function useMenusSceneController({ isAuthenticated, onLoadNavigationMenu, onSetError }) {
  const loadedDefaultRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated || loadedDefaultRef.current) {
      return;
    }
    loadedDefaultRef.current = true;
    onLoadNavigationMenu('primary').catch((nextError) => {
      if (cancelled) return;
      loadedDefaultRef.current = false;
      onSetError(asErrorMessage(nextError));
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, onLoadNavigationMenu, onSetError]);
}
