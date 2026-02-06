import { useState } from 'react';

function getReleaseIdLike(entry) {
  if (!entry || typeof entry !== 'object') return '';
  if (typeof entry.releaseId === 'string') return entry.releaseId;
  if (typeof entry.id === 'string') return entry.id;
  if (typeof entry.release?.id === 'string') return entry.release.id;
  return '';
}

function getReleaseCreatedAtLike(entry) {
  if (!entry || typeof entry !== 'object') return '';
  if (typeof entry.createdAt === 'string') return entry.createdAt;
  if (typeof entry.publishedAt === 'string') return entry.publishedAt;
  if (typeof entry.release?.createdAt === 'string') return entry.release.createdAt;
  return '';
}

function getLatestReleaseId(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  const withDates = items
    .map((entry) => ({
      id: getReleaseIdLike(entry),
      createdAt: getReleaseCreatedAtLike(entry)
    }))
    .filter((entry) => entry.id);
  if (withDates.length === 0) return '';

  const sortable = withDates.filter((entry) => entry.createdAt);
  if (sortable.length > 0) {
    sortable.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    return sortable.at(-1)?.id || '';
  }

  return withDates.at(-1)?.id || '';
}

export function useReleaseLoopState(shell) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [releaseItems, setReleaseItems] = useState([]);
  const [activeRelease, setActiveRelease] = useState('');
  const [latestPublishJobId, setLatestPublishJobId] = useState('');
  const [latestPublishedReleaseId, setLatestPublishedReleaseId] = useState('');
  const [revisionCount, setRevisionCount] = useState(0);
  const [privateReadState, setPrivateReadState] = useState('');

  async function refreshRevisions(documentId) {
    if (!documentId) {
      setRevisionCount(0);
      return 0;
    }
    try {
      const payload = await shell.listRevisions(documentId);
      const items = payload.items || [];
      setRevisionCount(items.length);
      return items.length;
    } catch (error) {
      console.error('refreshRevisions failed', { documentId, error });
      setRevisionCount(0);
      return 0;
    }
  }

  async function refreshReleases() {
    try {
      const payload = await shell.listReleases();
      const rawItems = payload.items || [];
      const items = rawItems.map((entry) => ({
        ...entry,
        __releaseId: getReleaseIdLike(entry)
      }));
      setReleaseItems(items);
      setActiveRelease(payload.activeRelease || '');
      return payload;
    } catch (error) {
      console.error('refreshReleases failed', { error });
      setReleaseItems([]);
      setActiveRelease('');
      return { items: [], activeRelease: '' };
    }
  }

  async function generatePreview(documentId) {
    const payload = await shell.preview(documentId);
    setPreviewUrl(payload.previewUrl || '');
    return payload;
  }

  async function publishCurrent() {
    try {
      const payload = await shell.publish({});
      setLatestPublishJobId(payload.job?.id || '');
      setLatestPublishedReleaseId(payload.job?.releaseId || '');
      return payload;
    } catch (error) {
      console.error('publishCurrent failed', { error });
      setLatestPublishJobId('');
      setLatestPublishedReleaseId('');
      throw error;
    }
  }

  async function activate(releaseId) {
    const payload = await shell.activateRelease(releaseId);
    if (!payload?.activeRelease) {
      console.error('activate returned missing activeRelease', { releaseId, payload });
      throw new Error('Activation response missing activeRelease');
    }
    setActiveRelease(payload.activeRelease);
    return payload;
  }

  async function verifyPrivateRead(documentId) {
    const payload = await shell.verifyPrivate(documentId);
    const state = `${payload.cache || 'unknown'}:${payload.releaseId || 'none'}`;
    setPrivateReadState(state);
    return payload;
  }

  function reset() {
    setPreviewUrl('');
    setReleaseItems([]);
    setActiveRelease('');
    setLatestPublishJobId('');
    setLatestPublishedReleaseId('');
    setRevisionCount(0);
    setPrivateReadState('');
  }

  return {
    previewUrl,
    releaseItems,
    activeRelease,
    latestPublishJobId,
    latestPublishedReleaseId,
    revisionCount,
    privateReadState,
    getReleaseIdLike,
    getLatestReleaseId,
    refreshRevisions,
    refreshReleases,
    generatePreview,
    publishCurrent,
    activate,
    verifyPrivateRead,
    reset
  };
}
