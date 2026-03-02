import { useCallback, useState } from 'react';

const SETTINGS_STORAGE_KEY = 'edgepress.admin.settings.v1';
const DEFAULT_SETTINGS = {
  siteTitle: '',
  tagline: '',
  permalinkStructure: 'name',
  siteTheme: null
};

function normalizeSiteTheme(value) {
  return value && typeof value === 'object' ? value : null;
}

function readStoredSettings() {
  if (typeof globalThis === 'undefined' || !globalThis.window || !globalThis.window.localStorage) {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const raw = globalThis.window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      siteTitle: typeof parsed?.siteTitle === 'string' ? parsed.siteTitle : DEFAULT_SETTINGS.siteTitle,
      tagline: typeof parsed?.tagline === 'string' ? parsed.tagline : DEFAULT_SETTINGS.tagline,
      permalinkStructure: parsed?.permalinkStructure === 'plain'
        || parsed?.permalinkStructure === 'day'
        || parsed?.permalinkStructure === 'name'
        ? parsed.permalinkStructure
        : DEFAULT_SETTINGS.permalinkStructure,
      siteTheme: normalizeSiteTheme(parsed?.siteTheme)
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
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

export function useAdminSettingsState() {
  const [settings, setSettings] = useState(() => readStoredSettings());

  const onUpdateSettings = useCallback((patch) => {
    setSettings((prev) => {
      const next = {
        ...prev,
        ...patch,
        siteTheme: patch && Object.prototype.hasOwnProperty.call(patch, 'siteTheme')
          ? normalizeSiteTheme(patch.siteTheme)
          : prev.siteTheme
      };
      writeStoredSettings(next);
      return next;
    });
  }, []);

  return {
    settings,
    onUpdateSettings
  };
}
