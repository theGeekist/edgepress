import { useEffect, useMemo, useRef, useState } from 'react';
import apiFetch from '@wordpress/api-fetch';

import { useAuthState, useSessionActions } from '@features/auth';
import { useContentFeature } from '@features/content';
import { createAdminShell, configureApiFetch, useEditorState } from '@features/editor';
import { useMediaFeature } from '@features/media';
import { useThemeMode } from '@components/theme.js';
import { useAdminRouteState } from '@features/layout';
import { useAdminSettingsState } from '@features/settings';
import { useNavigationActions } from '@features/navigation';

function asErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

export function useAdminAppController() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';
  const shell = useMemo(() => createAdminShell({ baseUrl: apiBase || '' }), [apiBase]);
  const configuredApiFetchRef = useRef(null);
  const hydratedRef = useRef(false);

  const { palette, theme, mode, setMode } = useThemeMode();

  const auth = useAuthState(shell);
  const editor = useEditorState(shell);
  const { appSection, setAppSection, onChangeSection } = useAdminRouteState();
  const { settings, onUpdateSettings } = useAdminSettingsState();

  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [previewLink, setPreviewLink] = useState(null);
  const [saveState, setSaveState] = useState('idle');

  const navigation = useNavigationActions({ auth, shell, setStatus, setError });

  const content = useContentFeature({
    shell,
    editor,
    authUser: auth.user,
    appSection,
    setAppSection,
    setStatus,
    setError,
    setPreviewLink,
    setSaveState
  });

  const mediaFeature = useMediaFeature({
    shell,
    authUser: auth.user,
    appSection,
    setAppSection,
    setStatus,
    setError
  });

  const sessionActions = useSessionActions({
    auth,
    docs: content.docs,
    editor,
    loop: content.loop,
    setStatus,
    setError,
    setPreviewLink,
    setSaveState,
    setNavigationMenu: navigation.setNavigationMenu,
    loadedNavigationMenuKeyRef: navigation.loadedNavigationMenuKeyRef
  });

  useEffect(() => {
    const configKey = apiBase || '(same-origin)';
    if (configuredApiFetchRef.current === configKey) {
      return;
    }
    configuredApiFetchRef.current = configKey;

    configureApiFetch(apiFetch, {
      getAccessToken: () => shell.session.accessToken,
      refresh: () => shell.refreshSession(),
      apiRoot: apiBase || '/v1'
    });
  }, [apiBase, shell]);

  useEffect(() => {
    if (!auth.user || hydratedRef.current) {
      return;
    }
    hydratedRef.current = true;
    content.hydrate().catch((nextError) => {
      setError(asErrorMessage(nextError));
    });
  }, [auth.user, content]);

  useEffect(() => {
    if (!auth.user || (appSection !== 'appearance' && appSection !== 'themes' && appSection !== 'menus' && appSection !== 'widgets')) {
      return;
    }
    if (navigation.loadedNavigationMenuKeyRef.current === 'primary') {
      return;
    }
    navigation.onLoadNavigationMenu('primary').catch((nextError) => {
      setError(asErrorMessage(nextError));
    });
  }, [auth.user, appSection, navigation]);

  const actions = {
    ...sessionActions,
    ...content.actions,
    ...mediaFeature.actions,
    onLoadNavigationMenu: navigation.onLoadNavigationMenu,
    onSaveNavigationMenu: navigation.onSaveNavigationMenu,
    onUpdateSettings,
    onChangeSection,
    toggleTheme: () => setMode(mode === 'dark' ? 'light' : 'dark')
  };

  return {
    palette,
    theme,
    mode,
    appSection,
    contentView: content.contentView,
    mediaView: mediaFeature.mediaView,
    saveState,
    settings,
    auth,
    docs: content.docs,
    editor,
    loop: content.loop,
    media: mediaFeature.media,
    navigation: {
      menu: navigation.navigationMenu,
      isLoading: navigation.navigationMenuLoading,
      isSaving: navigation.navigationMenuSaving
    },
    status,
    error,
    previewLink,
    actions
  };
}
