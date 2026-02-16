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

function parseNavFromHash() {
  if (typeof globalThis === 'undefined' || !globalThis.window) {
    return null;
  }
  const raw = String(globalThis.window.location.hash || '').replace(/^#/, '');
  if (!raw) return null;
  const [sectionRaw] = raw.split('/').filter(Boolean);
  const section = normalizeAppSection(sectionRaw);

  return {
    appSection: section
  };
}

function buildNavHash({ appSection }) {
  const section = normalizeAppSection(appSection);
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
      appSection: normalizeAppSection(parsed?.appSection)
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
      appSection: normalizeAppSection(nextState?.appSection)
    }));
  } catch {
    // Ignore localStorage write errors.
  }
}

function readInitialNavState() {
  return parseNavFromHash() || readStoredNavState() || {
    appSection: 'content'
  };
}

export function useAdminRouteState() {
  const initialNavState = useMemo(() => readInitialNavState(), []);
  const applyHashWithReplaceRef = useRef(false);
  const hasSyncedNavRef = useRef(false);

  const [appSection, setAppSection] = useState(initialNavState.appSection);

  // Persist nav state and sync to URL hash
  useEffect(() => {
    const nextState = { appSection };
    writeStoredNavState(nextState);
    if (typeof globalThis === 'undefined' || !globalThis.window) {
      return;
    }
    if (appSection === 'content' || appSection === 'media') {
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
  }, [appSection]);

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
  }, []);

  return {
    appSection,
    setAppSection,
    onChangeSection,
  };
}
