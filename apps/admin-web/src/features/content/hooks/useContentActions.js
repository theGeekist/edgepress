import { useCallback } from 'react';
import { toCssVars } from '@features/theme';

function asErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

export function useContentActions({ docs, editor, loop, setStatus, setError, setPreviewLink, setSaveState, setAppSection, setContentView }) {
  const onEditContent = useCallback(async (doc) => {
    editor.openDocument(doc, docs.setSelectedId, docs.setTitle);
    await loop.refreshRevisions(doc.id);
    setAppSection('content');
    setContentView('editor');
  }, [editor, docs, loop, setAppSection, setContentView]);

  const onCreate = useCallback(async (type = 'page') => {
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
  }, [setAppSection, docs, editor, loop, setContentView, setError, setPreviewLink, setStatus, setSaveState]);

  const onSave = useCallback(async () => {
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
        slug: selectedDoc?.ui?.slug || selectedDoc?.slug || '',
        featuredImageId: selectedDoc?.ui?.featuredImageId || selectedDoc?.featuredImageId || ''
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
  }, [docs, editor, loop, setError, setPreviewLink, setStatus, setSaveState]);

  const onPreview = useCallback(async (theme) => {
    if (!docs.selectedId) {
      return;
    }
    setError('');
    setStatus('Generating draft preview...');
    setPreviewLink(null);
    try {
      const payload = await loop.generatePreview(docs.selectedId, {
        themeVars: toCssVars(theme, { prefix: '--ep' })
      });
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
  }, [docs, loop, setError, setPreviewLink, setStatus]);

  const onPublish = useCallback(async () => {
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
  }, [docs, loop, setError, setPreviewLink, setStatus]);

  const onVerifyPrivate = useCallback(async () => {
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
  }, [docs, loop, setError, setPreviewLink, setStatus]);

  const onBulkApply = useCallback(async (action) => {
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
    } finally {
      docs.clearSelectedRows();
      try {
        await docs.refresh();
      } catch (refreshError) {
        console.warn('docs.refresh failed after bulk apply', refreshError);
      }
    }
  }, [docs, setError, setStatus]);

  const onTrashContent = useCallback(async (doc) => {
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
      try {
        await docs.refresh();
      } catch (refreshError) {
        console.error('docs.refresh failed after bulk apply', refreshError);
      }
    }
  }, [docs, setError, setStatus]);

  const onDeleteContent = useCallback(async (doc) => {
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
      try {
        await docs.refresh();
      } catch (refreshError) {
        console.error('docs.refresh failed after bulk apply', refreshError);
      }
    }
  }, [docs, setError, setStatus]);

  return {
    onEditContent,
    onCreate,
    onSave,
    onPreview,
    onPublish,
    onVerifyPrivate,
    onBulkApply,
    onTrashContent,
    onDeleteContent
  };
}
