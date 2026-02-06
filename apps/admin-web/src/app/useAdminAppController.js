import { useEffect, useMemo, useRef, useState } from 'react';
import apiFetch from '@wordpress/api-fetch';

import { createAdminShell } from '../editor-shell.js';
import { configureApiFetch } from '../gutenberg-integration.js';
import { useThemeMode } from './theme.js';
import { useAuthState } from '../features/auth/useAuthState.js';
import { useDocumentsState } from '../features/documents/useDocumentsState.js';
import { useEditorState } from '../features/editor/useEditorState.js';
import { useReleaseLoopState } from '../features/releases/useReleaseLoopState.js';

function asErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

const SETTINGS_STORAGE_KEY = 'edgepress.admin.settings.v1';

function readStoredSettings() {
  if (typeof globalThis === 'undefined' || !globalThis.window || !globalThis.window.localStorage) {
    return { permalinkStructure: 'name' };
  }
  try {
    const raw = globalThis.window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { permalinkStructure: 'name' };
    const parsed = JSON.parse(raw);
    return {
      permalinkStructure: parsed?.permalinkStructure === 'plain' || parsed?.permalinkStructure === 'day'
        ? parsed.permalinkStructure
        : 'name'
    };
  } catch {
    return { permalinkStructure: 'name' };
  }
}

function writeStoredSettings(settings) {
  if (typeof globalThis === 'undefined' || !globalThis.window || !globalThis.window.localStorage) {
    return;
  }
  try {
    globalThis.window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore localStorage write errors.
  }
}

export function useAdminAppController() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';
  const shell = useMemo(() => createAdminShell({ baseUrl: apiBase || '' }), [apiBase]);
  const configuredApiFetchRef = useRef(null);
  const hydratedRef = useRef(false);
  const { palette, mode, setMode } = useThemeMode();

  const auth = useAuthState(shell);
  const docs = useDocumentsState(shell);
  const editor = useEditorState(shell);
  const loop = useReleaseLoopState(shell);

  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [previewLink, setPreviewLink] = useState(null);
  const [saveState, setSaveState] = useState('idle');
  const [appSection, setAppSection] = useState('content');
  const [contentView, setContentView] = useState('list');
  const [settings, setSettings] = useState(() => readStoredSettings());

  useEffect(() => {
    const configKey = apiBase || '(same-origin)';
    if (configuredApiFetchRef.current === configKey) {
      return;
    }
    configuredApiFetchRef.current = configKey;

    configureApiFetch(apiFetch, {
      getAccessToken: () => shell.session.accessToken,
      refresh: () => shell.refreshSession(),
      apiRoot: apiBase || undefined
    });
  }, [apiBase, shell]);

  useEffect(() => {
    if (!auth.user || hydratedRef.current) {
      return;
    }
    hydratedRef.current = true;
    refreshAndSelectFirst().catch((nextError) => {
      setError(asErrorMessage(nextError));
    });
  }, [auth.user]);

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

  async function refreshAndSelectFirst() {
    await docs.refresh();
    await loop.refreshReleases();
  }

  async function onEditContent(doc) {
    editor.openDocument(doc, docs.setSelectedId, docs.setTitle);
    await loop.refreshRevisions(doc.id);
    setAppSection('content');
    setContentView('editor');
  }

  async function onLogin() {
    setError('');
    setPreviewLink(null);
    setStatus('Signing in...');
    try {
      const account = await auth.login();
      await refreshAndSelectFirst();
      setStatus(`Signed in as ${account.username}`);
    } catch (nextError) {
      setError(asErrorMessage(nextError));
      setStatus('');
    }
  }

  async function onCreate(type = 'page') {
    setAppSection('content');
    docs.setContentTypeFilter('all');
    docs.setContentStatusFilter('all');
    setError('');
    setPreviewLink(null);
    setStatus(`Creating ${type} draft...`);
    setSaveState('saving');
    try {
      const created = await docs.createDraft({ type });
      editor.openDocument(created, docs.setSelectedId, docs.setTitle);
      await loop.refreshRevisions(created.id);
      setContentView('editor');
      setStatus(`${type === 'post' ? 'Post' : 'Page'} draft created`);
      setSaveState('saved');
    } catch (nextError) {
      setError(asErrorMessage(nextError));
      setStatus('');
      setSaveState('idle');
    }
  }

  async function onSave() {
    if (!docs.selectedId) {
      return;
    }
    setError('');
    setPreviewLink(null);
    setStatus('Saving...');
    setSaveState('saving');
    try {
      const selectedDoc = docs.getSelectedDoc();
      const updated = await editor.saveDocument(docs.selectedId, docs.title, {
        type: selectedDoc?.ui?.type || selectedDoc?.type || 'page',
        slug: selectedDoc?.ui?.slug || selectedDoc?.slug || ''
      });
      await docs.refresh();
      if (updated) {
        editor.openDocument(updated, docs.setSelectedId, docs.setTitle);
        await loop.refreshRevisions(updated.id);
      }
      setStatus('Saved');
      setSaveState('saved');
    } catch (nextError) {
      setError(asErrorMessage(nextError));
      setStatus('');
      setSaveState('idle');
    }
  }

  async function onLogout() {
    try {
      await auth.logout();
    } catch (nextError) {
      setError(asErrorMessage(nextError));
    }
    docs.setSelectedId(null);
    docs.setTitle('');
    editor.setBlocks([]);
    loop.reset();
    docs.clearSelectedRows();
    setStatus('Signed out');
    setError('');
    setPreviewLink(null);
    setSaveState('idle');
  }

  async function onPreview() {
    if (!docs.selectedId) {
      return;
    }
    setError('');
    setStatus('Generating draft preview...');
    setPreviewLink(null);
    try {
      const payload = await loop.generatePreview(docs.selectedId);
      const rawPreviewUrl = payload.previewUrl || '';
      let resolvedPreviewUrl = rawPreviewUrl;
      if (rawPreviewUrl && !/^https?:\/\//i.test(rawPreviewUrl)) {
        const base = typeof globalThis !== 'undefined' && globalThis.window ? globalThis.window.location.origin : 'http://localhost';
        resolvedPreviewUrl = new URL(rawPreviewUrl, base).toString();
      }
      if (resolvedPreviewUrl) {
        setPreviewLink({ label: rawPreviewUrl, url: resolvedPreviewUrl });
      }
      setStatus('Preview is ready.');
    } catch (nextError) {
      setError(asErrorMessage(nextError));
      setStatus('');
    }
  }

  async function onPublish() {
    if (!docs.selectedId) {
      return;
    }
    setError('');
    setPreviewLink(null);
    setStatus('Publishing...');
    try {
      const payload = await loop.publishCurrent();
      const releaseIdFromJob = payload?.job?.releaseId || '';
      const releasesPayload = await loop.refreshReleases();
      let releaseId = releaseIdFromJob;
      if (!releaseId) {
        releaseId = loop.getLatestReleaseId(releasesPayload.items || []);
      }
      if (releaseId) {
        await loop.activate(releaseId);
        await loop.refreshReleases();
      }
      setStatus('Published.');
    } catch (nextError) {
      setError(asErrorMessage(nextError));
      setStatus('');
    }
  }

  async function onVerifyPrivate() {
    if (!docs.selectedId) {
      return;
    }
    if (!loop.activeRelease) {
      setError('');
      setStatus('No live release found. Create a release, then make it live.');
      return;
    }
    setError('');
    setPreviewLink(null);
    setStatus('Checking live content delivery...');
    try {
      const selectedDoc = docs.getSelectedDoc();
      const routeId = selectedDoc?.slug || selectedDoc?.ui?.slug || selectedDoc?.id || docs.selectedId;
      const payload = await loop.verifyPrivateRead(routeId);
      if (payload.releaseId) {
        setStatus('Live content check passed.');
      } else {
        setStatus('Live content check completed with no active release id.');
      }
    } catch (nextError) {
      setError(asErrorMessage(nextError));
      setStatus('');
    }
  }

  async function onBulkApply(action) {
    setError('');
    setStatus('Updating selected content...');
    try {
      let updatedCount = 0;
      if (action === 'draft' || action === 'published' || action === 'trash') {
        if (action === 'trash') {
          updatedCount = await docs.bulkDeleteSelected({ permanent: false });
        } else {
          updatedCount = await docs.bulkSetStatus(action);
        }
      } else if (action === 'delete') {
        updatedCount = await docs.bulkDeleteSelected({ permanent: true });
      }
      if (updatedCount > 0) {
        setStatus(`Updated ${updatedCount} item${updatedCount === 1 ? '' : 's'} with ${action}.`);
      } else {
        setStatus('No rows selected.');
      }
    } catch (nextError) {
      setError(asErrorMessage(nextError));
      setStatus('');
    }
  }

  async function onTrashContent(doc) {
    setError('');
    setStatus('Moving content to trash...');
    try {
      await docs.deleteDocument(doc.id, { permanent: false });
      setStatus('Moved to trash.');
    } catch (nextError) {
      setError(asErrorMessage(nextError));
      setStatus('');
    } finally {
      docs.clearSelectedRows();
      await docs.refresh();
    }
  }

  async function onDeleteContent(doc) {
    setError('');
    setStatus('Deleting permanently...');
    try {
      await docs.deleteDocument(doc.id, { permanent: true });
      setStatus('Deleted permanently.');
    } catch (nextError) {
      setError(asErrorMessage(nextError));
      setStatus('');
    } finally {
      docs.clearSelectedRows();
      await docs.refresh();
    }
  }

  const actions = {
    onLogin,
    onCreate,
    onSave,
    onLogout,
    onPreview,
    onPublish,
    onVerifyPrivate,
    onEditContent,
    onBulkApply,
    onTrashContent,
    onDeleteContent,
    onUpdateSettings: (patch) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        writeStoredSettings(next);
        return next;
      });
    },
    onOpenContentList: () => setContentView('list'),
    onChangeSection: (nextSection) => {
      setAppSection(nextSection);
      if (nextSection === 'content') {
        setContentView('list');
      }
    },
    toggleTheme: () => setMode(mode === 'dark' ? 'light' : 'dark')
  };

  return {
    palette,
    mode,
    appSection,
    contentView,
    saveState,
    settings,
    auth,
    docs,
    editor,
    loop,
    status,
    error,
    previewLink,
    actions
  };
}
