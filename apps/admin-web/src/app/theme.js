import { useEffect, useMemo, useState } from 'react';

const lightPalette = {
  page: '#f0f0f1',
  surface: '#ffffff',
  surfaceMuted: '#f7fafc',
  border: '#c3c4c7', // WP Border
  borderSoft: '#dcdcde',
  text: '#3c434a', // WP Text
  textMuted: '#646970',
  accent: '#2271b1', // WP Blue
  onAccent: '#ffffff',
  error: '#d63638',
  sidebar: '#1d2327',
  sidebarText: '#f0f0f1',
  topbar: '#1d2327',
  topbarText: '#f0f0f1'
};

const darkPalette = {
  page: '#101517', // Darker WP-ish
  surface: '#1d2327',
  surfaceMuted: '#2c3338',
  border: '#454e58',
  borderSoft: '#50575e',
  text: '#f0f0f1',
  textMuted: '#a7aaad',
  accent: '#72aee6', // WP Blue Dark Mode
  onAccent: '#101517',
  error: '#e65054',
  sidebar: '#141414', // Slightly darker than surface
  sidebarText: '#f0f0f1',
  topbar: '#141414',
  topbarText: '#f0f0f1'
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
