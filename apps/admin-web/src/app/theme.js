import { useEffect, useMemo, useState } from 'react';

const lightPalette = {
  page: '#edf3f1',
  surface: '#ffffff',
  surfaceMuted: '#f7fafc',
  border: '#d5dbe8',
  borderSoft: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#475569',
  accent: '#0f172a',
  onAccent: '#ffffff',
  error: '#b91c1c'
};

const darkPalette = {
  page: '#0b1220',
  surface: '#111b2f',
  surfaceMuted: '#18233b',
  border: '#2a3a58',
  borderSoft: '#334566',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  accent: '#22c55e',
  onAccent: '#04130a',
  error: '#f87171'
};

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

  const palette = useMemo(() => (mode === 'dark' ? darkPalette : lightPalette), [mode]);
  return { mode, setMode, palette };
}
