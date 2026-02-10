import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const NAV_STORAGE_KEY = 'edgepress.admin.nav.v1';

function normalizeAppSection(value) {
  const allowed = new Set([
    'dashboard',
    'content',
    'media',
    'appearance',
    'settings',
    'themes',
    'menus',
    'widgets'
  ]);
  return allowed.has(value) ? value : 'content';
}

function normalizeContentView(value) {
  return value === 'editor' ? 'editor' : 'list';
}

function normalizeMediaView(value) {
  return value === 'editor' ? 'editor' : 'list';
}

function parseNavFromHash() {
  if (typeof globalThis === 'undefined' || !globalThis.window) {
    return null;
  }
  const raw = String(globalThis.window.location.hash || '').replace(/^#/, '');
  if (!raw) return null;
  const [sectionRaw, viewRaw] = raw.split('/').filter(Boolean);
  const section = normalizeAppSection(sectionRaw);

  return {
    appSection: section,
    contentView: section === 'content' ? normalizeContentView(viewRaw) : 'list',
    mediaView: section === 'media' ? normalizeMediaView(viewRaw) : 'list'
  };
}

function buildNavHash({ appSection, contentView, mediaView }) {
  const section = normalizeAppSection(appSection);
  if (section === 'content') {
    return contentView === 'editor' ? '#/content/editor' : '#/content/list';
  }
  if (section === 'media') {
    return mediaView === 'editor' ? '#/media/editor' : '#/media/list';
  }
  return `#/${section}`;
}

function readStoredNavState() {
  if (typeof globalThis === 'undefined' || !globalThis.window || !globalThis.window.localStorage) {
    return null;
  }
  try {
    const raw = globalThis.window.localStorage.getItem(NAV_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      appSection: normalizeAppSection(parsed?.appSection),
      contentView: normalizeContentView(parsed?.contentView),
      mediaView: normalizeMediaView(parsed?.mediaView)
    };
  } catch {
    return null;
  }
}

function writeStoredNavState(nextState) {
  if (typeof globalThis === 'undefined' || !globalThis.window || !globalThis.window.localStorage) {
    return;
  }
  try {
    globalThis.window.localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify({
      appSection: normalizeAppSection(nextState?.appSection),
      contentView: normalizeContentView(nextState?.contentView),
      mediaView: normalizeMediaView(nextState?.mediaView)
    }));
  } catch {
    // Ignore localStorage write errors.
  }
}

function readInitialNavState() {
  return parseNavFromHash() || readStoredNavState() || {
    appSection: 'content',
    contentView: 'list',
    mediaView: 'list'
  };
}

export function useAdminRouteState() {
  const initialNavState = useMemo(() => readInitialNavState(), []);
  const applyHashWithReplaceRef = useRef(false);
  const hasSyncedNavRef = useRef(false);

  const [appSection, setAppSection] = useState(initialNavState.appSection);
  const [contentView, setContentView] = useState(initialNavState.contentView);
  const [mediaView, setMediaView] = useState(initialNavState.mediaView);

  // Persist nav state and sync to URL hash
  useEffect(() => {
    const nextState = { appSection, contentView, mediaView };
    writeStoredNavState(nextState);
    if (typeof globalThis === 'undefined' || !globalThis.window) {
      return;
    }
    const nextHash = buildNavHash(nextState);
    if (globalThis.window.location.hash === nextHash) {
      return;
    }
    if (applyHashWithReplaceRef.current || !hasSyncedNavRef.current) {
      globalThis.window.history.replaceState({}, '', nextHash);
      applyHashWithReplaceRef.current = false;
      hasSyncedNavRef.current = true;
    } else {
      globalThis.window.history.pushState({}, '', nextHash);
    }
  }, [appSection, contentView, mediaView]);

  // Listen for hash changes (back/forward button)
  useEffect(() => {
    if (typeof globalThis === 'undefined' || !globalThis.window) {
      return undefined;
    }
    const applyFromHash = () => {
      const parsed = parseNavFromHash();
      if (!parsed) return;
      applyHashWithReplaceRef.current = true;
      setAppSection(parsed.appSection);
      setContentView(parsed.contentView);
      setMediaView(parsed.mediaView);
    };
    globalThis.window.addEventListener('popstate', applyFromHash);
    globalThis.window.addEventListener('hashchange', applyFromHash);
    return () => {
      globalThis.window.removeEventListener('popstate', applyFromHash);
      globalThis.window.removeEventListener('hashchange', applyFromHash);
    };
  }, []);

  const onChangeSection = useCallback((nextSection) => {
    const section = normalizeAppSection(nextSection);
    setAppSection(section);
    if (section === 'content') {
      setContentView('list');
    }
    if (section === 'media') {
      setMediaView('list');
    }
  }, []);

  const onOpenContentList = useCallback(() => {
    setContentView('list');
  }, []);

  const onOpenMediaList = useCallback(() => {
    setMediaView('list');
  }, []);

  return {
    appSection,
    contentView,
    mediaView,
    setAppSection,
    setContentView,
    setMediaView,
    onChangeSection,
    onOpenContentList,
    onOpenMediaList
  };
}
