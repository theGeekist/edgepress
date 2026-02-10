import { useCallback, useState } from 'react';

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

export function useAdminSettingsState() {
  const [settings, setSettings] = useState(() => readStoredSettings());

  const onUpdateSettings = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      writeStoredSettings(next);
      return next;
    });
  }, []);

  return {
    settings,
    onUpdateSettings
  };
}
