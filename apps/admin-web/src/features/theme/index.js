export {
  EP_THEME_SCHEMA_VERSION,
  makeTokenRef,
  isTokenRef,
  normalizeEpTheme,
  encodeEpTheme,
  decodeEpTheme
} from './canonicalTheme.js';

export { fromWpThemeJson, toWpThemeJson } from './wpThemeAdapter.js';
export { toWpEditorSettings } from './wpEditorSettingsAdapter.js';

export {
  mergeEpThemes,
  toCssVars,
  toUiPalette,
  applyCssVarsToDocument
} from './tokenRuntime.js';

export { defaultLightTheme, defaultDarkTheme } from './defaultThemes.js';
