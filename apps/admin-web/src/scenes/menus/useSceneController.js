import { useEffect, useRef } from 'react';

function asErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

export function useMenusSceneController({ isAuthenticated, onLoadNavigationMenu, onSetError }) {
  const loadedDefaultRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || loadedDefaultRef.current) {
      return;
    }
    loadedDefaultRef.current = true;
    onLoadNavigationMenu('primary').catch((nextError) => {
      loadedDefaultRef.current = false;
      onSetError(asErrorMessage(nextError));
    });
  }, [isAuthenticated, onLoadNavigationMenu, onSetError]);
}
