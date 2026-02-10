import { useEffect, useMemo, useRef, useState } from 'react';
import apiFetch from '@wordpress/api-fetch';

import { useAuthState, useSessionActions } from '@features/auth';
import { useDocumentsState, useReleaseLoopState, useContentActions } from '@features/content';
import { createAdminShell, configureApiFetch, useEditorState } from '@features/editor';
import { useMediaState, useMediaActions } from '@features/media';
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

  // Feature state hooks
  const auth = useAuthState(shell);
  const docs = useDocumentsState(shell);
  const editor = useEditorState(shell);
  const loop = useReleaseLoopState(shell);
  const media = useMediaState(shell);
  const { appSection, contentView, mediaView, setAppSection, setContentView, setMediaView, onChangeSection, onOpenContentList, onOpenMediaList } = useAdminRouteState();
  const { settings, onUpdateSettings } = useAdminSettingsState();

  // UI state
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [previewLink, setPreviewLink] = useState(null);
  const [saveState, setSaveState] = useState('idle');

  // Navigation actions with state
  const navigation = useNavigationActions({ auth, shell, setStatus, setError });

  // Feature action hooks
  const sessionActions = useSessionActions({ auth, docs, editor, loop, setStatus, setError, setPreviewLink, setSaveState, setNavigationMenu: navigation.setNavigationMenu, loadedNavigationMenuKeyRef: navigation.loadedNavigationMenuKeyRef });
  const contentActions = useContentActions({ docs, editor, loop, auth, setStatus, setError, setPreviewLink, setSaveState, setAppSection, setContentView });
  const mediaActions = useMediaActions({ media, setStatus, setError, setAppSection, setMediaView });

  // Configure api-fetch middleware
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

  // Initial data load after login
  useEffect(() => {
    if (!auth.user || hydratedRef.current) {
      return;
    }
    hydratedRef.current = true;
    refreshAndSelectFirst().catch((nextError) => {
      setError(asErrorMessage(nextError));
    });
  }, [auth.user]);

  // Refresh documents when content list is active
  useEffect(() => {
    if (!auth.user || appSection !== 'content' || contentView !== 'list') {
      return;
    }
    docs.refresh().catch((nextError) => {
      setError(asErrorMessage(nextError));
    });
  }, [
    auth.user,
    appSection,
    contentView,
    docs.contentSearch,
    docs.contentTypeFilter,
    docs.contentStatusFilter,
    docs.sortBy,
    docs.sortDir,
    docs.page
  ]);

  // Load navigation menu when appearance section is active
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

  // Refresh media when media section is active
  useEffect(() => {
    if (!auth.user || appSection !== 'media') {
      return;
    }
    media.refresh().catch((nextError) => {
      setError(asErrorMessage(nextError));
    });
  }, [auth.user, appSection, media.search, media.mimeTypeFilter, media.page]);

  async function refreshAndSelectFirst() {
    await docs.refresh();
    await loop.refreshReleases();
  }

  const actions = {
    ...sessionActions,
    ...contentActions,
    ...mediaActions,
    onLoadNavigationMenu: navigation.onLoadNavigationMenu,
    onSaveNavigationMenu: navigation.onSaveNavigationMenu,
    onUpdateSettings,
    onOpenContentList,
    onOpenMediaList,
    onChangeSection,
    toggleTheme: () => setMode(mode === 'dark' ? 'light' : 'dark')
  };

  return {
    palette,
    theme,
    mode,
    appSection,
    contentView,
    mediaView,
    saveState,
    settings,
    auth,
    docs,
    editor,
    loop,
    media,
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
