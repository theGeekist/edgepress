export const defaultLightTheme = {
  schemaVersion: 1,
  name: 'EP Light',
  mode: 'light',
  tokens: {
    color: {
      background: '#f0f0f1',
      surface: '#ffffff',
      surfaceMuted: '#f7fafc',
      text: '#3c434a',
      textMuted: '#646970',
      accent: '#2271b1',
      onAccent: '#ffffff',
      border: '#c3c4c7',
      borderSoft: '#dcdcde',
      error: '#d63638'
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '12px',
      lg: '20px',
      xl: '32px'
    },
    typography: {},
    radius: {
      sm: '2px',
      md: '4px'
    },
    shadow: {},
    layout: {},
    palette: [
      { slug: 'accent', name: 'Accent', value: '#2271b1' },
      { slug: 'error', name: 'Error', value: '#d63638' }
    ]
  },
  surfaces: {
    page: '#f0f0f1',
    surface: '#ffffff',
    surfaceMuted: '#f7fafc',
    sidebar: '#1d2327',
    sidebarText: '#f0f0f1',
    sidebarSubmenu: '#2c3338',
    sidebarBorder: 'rgba(255, 255, 255, 0.1)',
    sidebarHover: 'rgba(255, 255, 255, 0.05)',
    sidebarActiveBg: '#2271b1',
    topbar: '#1d2327',
    topbarText: '#f0f0f1'
  }
};

export const defaultDarkTheme = {
  schemaVersion: 1,
  name: 'EP Dark',
  mode: 'dark',
  tokens: {
    color: {
      background: '#101517',
      surface: '#1d2327',
      surfaceMuted: '#2c3338',
      text: '#f0f0f1',
      textMuted: '#a7aaad',
      accent: '#72aee6',
      onAccent: '#101517',
      border: '#454e58',
      borderSoft: '#50575e',
      error: '#e65054'
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '12px',
      lg: '20px',
      xl: '32px'
    },
    typography: {},
    radius: {
      sm: '2px',
      md: '4px'
    },
    shadow: {},
    layout: {},
    palette: [
      { slug: 'accent', name: 'Accent', value: '#72aee6' },
      { slug: 'error', name: 'Error', value: '#e65054' }
    ]
  },
  surfaces: {
    page: '#101517',
    surface: '#1d2327',
    surfaceMuted: '#2c3338',
    sidebar: '#141414',
    sidebarText: '#f0f0f1',
    sidebarSubmenu: '#1a1a1a',
    sidebarBorder: 'rgba(255, 255, 255, 0.08)',
    sidebarHover: 'rgba(255, 255, 255, 0.04)',
    sidebarActiveBg: '#72aee6',
    topbar: '#141414',
    topbarText: '#f0f0f1'
  }
};
