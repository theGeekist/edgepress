import { useEffect, useRef } from 'react';

function asErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

export function useContentSceneController({ isAuthenticated, onHydrateContent, onSetError }) {
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || hydratedRef.current) {
      return;
    }
    hydratedRef.current = true;
    onHydrateContent().catch((nextError) => {
      onSetError(asErrorMessage(nextError));
    });
  }, [isAuthenticated, onHydrateContent, onSetError]);
}
