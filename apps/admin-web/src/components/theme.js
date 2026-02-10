import { useEffect, useMemo, useState } from 'react';

import {
  applyCssVarsToDocument,
  defaultDarkTheme,
  defaultLightTheme,
  mergeEpThemes,
  toCssVars,
  toUiPalette
} from '@features/theme';

const THEME_OVERRIDE_STORAGE_KEY = 'edgepress.admin.theme.override.v1';

function readThemeOverride(mode) {
  if (typeof globalThis === 'undefined' || !globalThis.window || !globalThis.window.localStorage) {
    return null;
  }
  try {
    const raw = globalThis.window.localStorage.getItem(THEME_OVERRIDE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const byMode = parsed && typeof parsed === 'object' ? parsed[mode] : null;
    return byMode && typeof byMode === 'object' ? byMode : null;
  } catch {
    return null;
  }
}

export function useThemeMode() {
  const [mode, setMode] = useState(() => {
    const win = globalThis.window;
    if (!win || !win.matchMedia) return 'light';
    return win.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const win = globalThis.window;
    if (!win || !win.matchMedia) return undefined;
    const media = win.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event) => setMode(event.matches ? 'dark' : 'light');
    media.addEventListener('change', onChange);

    return () => media.removeEventListener('change', onChange);
  }, []);

  const theme = useMemo(() => {
    const base = mode === 'dark' ? defaultDarkTheme : defaultLightTheme;
    const override = readThemeOverride(mode);
    return mergeEpThemes(base, override || null);
  }, [mode]);

  const palette = useMemo(() => toUiPalette(theme), [theme]);

  useEffect(() => {
    const vars = toCssVars(theme);
    applyCssVarsToDocument(vars);
  }, [theme]);

  return { mode, setMode, palette, theme };
}
