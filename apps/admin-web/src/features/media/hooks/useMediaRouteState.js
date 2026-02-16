import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function parseMediaRouteFromHash() {
  if (typeof globalThis === 'undefined' || !globalThis.window) {
    return null;
  }
  const raw = String(globalThis.window.location.hash || '').replace(/^#/, '');
  const [sectionRaw, viewRaw] = raw.split('/').filter(Boolean);
  if (sectionRaw !== 'media') {
    return null;
  }
  return { mediaView: viewRaw === 'editor' ? 'editor' : 'list' };
}

function buildMediaHash(mediaView) {
  return mediaView === 'editor' ? '#/media/editor' : '#/media/list';
}

export function useMediaRouteState({ appSection, setAppSection }) {
  const initial = useMemo(() => parseMediaRouteFromHash() || { mediaView: 'list' }, []);
  const [mediaView, setMediaView] = useState(initial.mediaView);
  const applyReplaceRef = useRef(false);

  useEffect(() => {
    if (appSection !== 'media') {
      return;
    }
    if (typeof globalThis === 'undefined' || !globalThis.window) {
      return;
    }
    const nextHash = buildMediaHash(mediaView);
    if (globalThis.window.location.hash === nextHash) {
      return;
    }
    if (applyReplaceRef.current) {
      globalThis.window.history.replaceState({}, '', nextHash);
      applyReplaceRef.current = false;
      return;
    }
    globalThis.window.history.pushState({}, '', nextHash);
  }, [appSection, mediaView]);

  useEffect(() => {
    if (typeof globalThis === 'undefined' || !globalThis.window) {
      return undefined;
    }
    const applyFromHash = () => {
      const parsed = parseMediaRouteFromHash();
      if (!parsed) return;
      applyReplaceRef.current = true;
      setMediaView(parsed.mediaView);
      if (appSection !== 'media') {
        setAppSection('media');
      }
    };
    globalThis.window.addEventListener('popstate', applyFromHash);
    globalThis.window.addEventListener('hashchange', applyFromHash);
    return () => {
      globalThis.window.removeEventListener('popstate', applyFromHash);
      globalThis.window.removeEventListener('hashchange', applyFromHash);
    };
  }, [appSection, setAppSection]);

  const onOpenMediaList = useCallback(() => {
    setAppSection('media');
    setMediaView('list');
  }, [setAppSection]);

  return {
    mediaView,
    setMediaView,
    onOpenMediaList
  };
}
