import { useEffect } from 'react';
import { useDocumentsState } from './useDocumentsState.js';
import { useReleaseLoopState } from './useReleaseLoopState.js';
import { useContentRouteState } from './useContentRouteState.js';
import { useContentActions } from './useContentActions.js';

function asErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

export function useContentFeature({
  shell,
  editor,
  authUser,
  appSection,
  setAppSection,
  setStatus,
  setError,
  setPreviewLink,
  setSaveState
}) {
  const docs = useDocumentsState(shell);
  const loop = useReleaseLoopState(shell);
  const route = useContentRouteState({ appSection, setAppSection });

  const actions = useContentActions({
    docs,
    editor,
    loop,
    setStatus,
    setError,
    setPreviewLink,
    setSaveState,
    setAppSection,
    setContentView: route.setContentView,
    setContentDocumentId: route.setContentDocumentId,
    onOpenContentEditor: route.onOpenContentEditor
  });

  useEffect(() => {
    if (!authUser) {
      return;
    }
    if (appSection !== 'content' || route.contentView !== 'list') {
      return;
    }
    docs.refresh().catch((nextError) => {
      setError(asErrorMessage(nextError));
    });
  }, [
    authUser,
    appSection,
    route.contentView,
    docs,
    docs.contentSearch,
    docs.contentTypeFilter,
    docs.contentStatusFilter,
    docs.sortBy,
    docs.sortDir,
    docs.page,
    setError
  ]);

  useEffect(() => {
    if (!authUser) {
      return;
    }
    if (appSection !== 'content' || route.contentView !== 'editor' || !route.contentDocumentId) {
      return;
    }
    if (docs.selectedId === route.contentDocumentId) {
      return;
    }
    const existing = docs.docs.find((item) => item.id === route.contentDocumentId);
    if (existing) {
      editor.openDocument(existing, docs.setSelectedId, docs.setTitle);
      loop.refreshRevisions(existing.id).catch((nextError) => {
        setError(asErrorMessage(nextError));
      });
      return;
    }
    docs.refresh()
      .then((items) => {
        const target = (items || []).find((item) => item.id === route.contentDocumentId);
        if (!target) {
          route.onOpenContentList();
          return;
        }
        editor.openDocument(target, docs.setSelectedId, docs.setTitle);
        return loop.refreshRevisions(target.id);
      })
      .catch((nextError) => {
        setError(asErrorMessage(nextError));
      });
  }, [
    authUser,
    appSection,
    docs,
    route.contentView,
    route.contentDocumentId,
    docs.selectedId,
    docs.docs,
    editor,
    loop,
    route,
    setError
  ]);

  useEffect(() => {
    if (appSection !== 'content' || route.contentView !== 'editor') {
      return;
    }
    if (!docs.selectedId) {
      return;
    }
    if (route.contentDocumentId === docs.selectedId) {
      return;
    }
    route.setContentDocumentId(docs.selectedId);
  }, [appSection, route, route.contentView, route.contentDocumentId, docs.selectedId]);

  async function hydrate() {
    const items = await docs.refresh();
    await loop.refreshReleases();
    if (appSection === 'content' && route.contentView === 'editor' && route.contentDocumentId) {
      const target = (items || []).find((item) => item.id === route.contentDocumentId);
      if (target) {
        editor.openDocument(target, docs.setSelectedId, docs.setTitle);
        await loop.refreshRevisions(target.id);
      } else {
        route.onOpenContentList();
      }
    }
    return items;
  }

  return {
    docs,
    loop,
    contentView: route.contentView,
    actions: {
      ...actions,
      onOpenContentList: route.onOpenContentList
    },
    hydrate
  };
}
