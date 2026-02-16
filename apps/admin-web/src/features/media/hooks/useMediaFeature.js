import { useEffect } from 'react';
import { useMediaState } from './useMediaState.js';
import { useMediaActions } from './useMediaActions.js';
import { useMediaRouteState } from './useMediaRouteState.js';

function asErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

export function useMediaFeature({
  shell,
  authUser,
  appSection,
  setAppSection,
  setStatus,
  setError
}) {
  const media = useMediaState(shell);
  const route = useMediaRouteState({ appSection, setAppSection });

  const actions = useMediaActions({
    media,
    setStatus,
    setError,
    setAppSection,
    setMediaView: route.setMediaView
  });

  useEffect(() => {
    if (!authUser || appSection !== 'media') {
      return;
    }
    media.refresh().catch((nextError) => {
      setError(asErrorMessage(nextError));
    });
  }, [authUser, appSection, media, media.search, media.mimeTypeFilter, media.page, setError]);

  return {
    media,
    mediaView: route.mediaView,
    actions: {
      ...actions,
      onOpenMediaList: route.onOpenMediaList
    }
  };
}
