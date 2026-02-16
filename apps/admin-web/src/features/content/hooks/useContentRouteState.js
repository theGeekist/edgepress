import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function parseContentRouteFromHash() {
  if (typeof globalThis === 'undefined' || !globalThis.window) {
    return null;
  }
  const raw = String(globalThis.window.location.hash || '').replace(/^#/, '');
  const [sectionRaw, viewRaw, idRaw] = raw.split('/').filter(Boolean);
  if (sectionRaw !== 'content') {
    return null;
  }
  const contentView = viewRaw === 'editor' ? 'editor' : 'list';
  const contentDocumentId = contentView === 'editor' && idRaw ? decodeURIComponent(String(idRaw)) : null;
  return { contentView, contentDocumentId };
}

function buildContentHash(contentView, contentDocumentId) {
  if (contentView === 'editor') {
    return contentDocumentId
      ? `#/content/editor/${encodeURIComponent(String(contentDocumentId))}`
      : '#/content/editor';
  }
  return '#/content/list';
}

export function useContentRouteState({ appSection, setAppSection }) {
  const initial = useMemo(() => parseContentRouteFromHash() || { contentView: 'list', contentDocumentId: null }, []);
  const [contentView, setContentView] = useState(initial.contentView);
  const [contentDocumentId, setContentDocumentId] = useState(initial.contentDocumentId);
  const applyReplaceRef = useRef(false);

  useEffect(() => {
    if (appSection !== 'content') {
      return;
    }
    if (typeof globalThis === 'undefined' || !globalThis.window) {
      return;
    }
    const nextHash = buildContentHash(contentView, contentDocumentId);
    if (globalThis.window.location.hash === nextHash) {
      return;
    }
    if (applyReplaceRef.current) {
      globalThis.window.history.replaceState({}, '', nextHash);
      applyReplaceRef.current = false;
      return;
    }
    globalThis.window.history.pushState({}, '', nextHash);
  }, [appSection, contentView, contentDocumentId]);

  useEffect(() => {
    if (typeof globalThis === 'undefined' || !globalThis.window) {
      return undefined;
    }
    const applyFromHash = () => {
      const parsed = parseContentRouteFromHash();
      if (!parsed) return;
      applyReplaceRef.current = true;
      setContentView(parsed.contentView);
      setContentDocumentId(parsed.contentDocumentId);
      if (appSection !== 'content') {
        setAppSection('content');
      }
    };
    globalThis.window.addEventListener('popstate', applyFromHash);
    globalThis.window.addEventListener('hashchange', applyFromHash);
    return () => {
      globalThis.window.removeEventListener('popstate', applyFromHash);
      globalThis.window.removeEventListener('hashchange', applyFromHash);
    };
  }, [appSection, setAppSection]);

  const onOpenContentList = useCallback(() => {
    setAppSection('content');
    setContentView('list');
    setContentDocumentId(null);
  }, [setAppSection]);

  const onOpenContentEditor = useCallback((documentId) => {
    setAppSection('content');
    setContentView('editor');
    setContentDocumentId(documentId ? String(documentId) : null);
  }, [setAppSection]);

  return {
    contentView,
    contentDocumentId,
    setContentView,
    setContentDocumentId,
    onOpenContentList,
    onOpenContentEditor
  };
}
