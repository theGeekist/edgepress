import { useCallback } from 'react';

function asErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

export function useMediaActions({ media, setStatus, setError, setAppSection, setMediaView }) {
  const onSaveSelectedMedia = useCallback(async () => {
    setError('');
    setStatus('Saving media metadata...');
    try {
      const saved = await media.saveSelected();
      if (saved) {
        setStatus('Media metadata saved.');
      } else {
        setStatus('No media selected.');
      }
    } catch (nextError) {
      setError(asErrorMessage(nextError));
      setStatus('');
    }
  }, [media, setError, setStatus]);

  const onUploadMedia = useCallback(async (files) => {
    setError('');
    setStatus('Uploading media...');
    try {
      const uploaded = await media.uploadFiles(files);
      if (uploaded.length > 0) {
        setStatus(`Uploaded ${uploaded.length} media item${uploaded.length === 1 ? '' : 's'}.`);
      } else {
        setStatus('No files selected.');
      }
    } catch (nextError) {
      setError(asErrorMessage(nextError));
      setStatus('');
    }
  }, [media, setError, setStatus]);

  const onEditMedia = useCallback((item) => {
    if (!item) return;
    media.selectItem(item);
    setAppSection('media');
    setMediaView('editor');
  }, [media, setAppSection, setMediaView]);

  const onDeleteMedia = useCallback(async (item) => {
    if (!item?.id) return;
    setError('');
    setStatus('Deleting media...');
    try {
      await media.deleteMedia(item.id);
      setStatus('Media deleted.');
      setMediaView('list');
    } catch (nextError) {
      setError(asErrorMessage(nextError));
      setStatus('');
    }
  }, [media, setError, setStatus, setMediaView]);

  const onBulkDeleteMedia = useCallback(async () => {
    setError('');
    setStatus('Deleting selected media...');
    try {
      const deleted = await media.bulkDeleteSelected();
      if (deleted > 0) {
        setStatus(`Deleted ${deleted} media item${deleted === 1 ? '' : 's'}.`);
      } else {
        setStatus('No rows selected.');
      }
      setMediaView('list');
    } catch (nextError) {
      setError(asErrorMessage(nextError));
      setStatus('');
    }
  }, [media, setError, setStatus, setMediaView]);

  return {
    onSaveSelectedMedia,
    onUploadMedia,
    onEditMedia,
    onDeleteMedia,
    onBulkDeleteMedia
  };
}
