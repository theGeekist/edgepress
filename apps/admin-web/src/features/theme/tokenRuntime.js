import { normalizeEpTheme } from './canonicalTheme.js';

function firstNonEmpty(...values) {
  for (const value of values) {
    const next = String(value || '').trim();
    if (next) return next;
  }
  return '';
}

export function mergeEpThemes(base, ...overlays) {
  let merged = normalizeEpTheme(base);
  for (const overlay of overlays) {
    if (!overlay) continue;
    const next = normalizeEpTheme(overlay);
    const hasExplicitMode = Object.prototype.hasOwnProperty.call(overlay, 'mode');
    const hasExplicitName = Object.prototype.hasOwnProperty.call(overlay, 'name');
    merged = normalizeEpTheme({
      ...merged,
      ...next,
      mode: hasExplicitMode ? next.mode : merged.mode,
      name: hasExplicitName ? next.name : merged.name,
      tokens: {
        ...merged.tokens,
        ...next.tokens,
        color: { ...merged.tokens.color, ...next.tokens.color },
        spacing: { ...merged.tokens.spacing, ...next.tokens.spacing },
        typography: { ...merged.tokens.typography, ...next.tokens.typography },
        radius: { ...merged.tokens.radius, ...next.tokens.radius },
        shadow: { ...merged.tokens.shadow, ...next.tokens.shadow },
        layout: { ...merged.tokens.layout, ...next.tokens.layout },
        palette: next.tokens.palette.length > 0 ? next.tokens.palette : merged.tokens.palette
      },
      surfaces: { ...merged.surfaces, ...next.surfaces },
      blockStyles: { ...merged.blockStyles, ...next.blockStyles },
      metadata: { ...merged.metadata, ...next.metadata }
    });
  }
  return merged;
}

export function toCssVars(theme, { prefix = '--ep' } = {}) {
  const normalized = normalizeEpTheme(theme);
  const vars = {};
  const themeTokenRoots = new Set(['color', 'spacing', 'typography', 'radius', 'shadow', 'layout']);
  const resolveStyleValue = (value) => {
    if (value && typeof value === 'object' && typeof value.ref === 'string') {
      const path = value.ref.split('.');
      if (path.length < 2 || !themeTokenRoots.has(path[0])) return '';
      let cursor = normalized.tokens;
      for (const segment of path) {
        if (!cursor || typeof cursor !== 'object') return '';
        cursor = cursor[segment];
      }
      return String(cursor || '').trim();
    }
    return String(value || '').trim();
  };

  for (const [key, value] of Object.entries(normalized.styleProps.color)) {
    const resolved = resolveStyleValue(value);
    if (!resolved) continue;
    vars[`${prefix}-color-${key}`] = resolved;
  }
  for (const [key, value] of Object.entries(normalized.styleProps.spacing)) {
    const resolved = resolveStyleValue(value);
    if (!resolved) continue;
    vars[`${prefix}-space-${key}`] = resolved;
  }
  for (const [key, value] of Object.entries(normalized.styleProps.radius)) {
    const resolved = resolveStyleValue(value);
    if (!resolved) continue;
    vars[`${prefix}-radius-${key}`] = resolved;
  }
  for (const [key, value] of Object.entries(normalized.surfaces)) {
    const resolved = resolveStyleValue(value);
    if (!resolved) continue;
    vars[`${prefix}-surface-${key}`] = resolved;
  }

  normalized.tokens.palette.forEach((entry) => {
    vars[`${prefix}-palette-${entry.slug}`] = entry.value;
  });

  return vars;
}

export function toUiPalette(theme) {
  const normalized = normalizeEpTheme(theme);
  const color = normalized.tokens.color;
  const surfaces = normalized.surfaces;

  const accent = firstNonEmpty(color.accent, color.primary, '#2271b1');
  const text = firstNonEmpty(color.text, '#3c434a');
  const background = firstNonEmpty(color.background, '#f0f0f1');

  return {
    page: firstNonEmpty(surfaces.page, background, '#f0f0f1'),
    surface: firstNonEmpty(surfaces.surface, '#ffffff'),
    surfaceMuted: firstNonEmpty(surfaces.surfaceMuted, '#f7fafc'),
    border: firstNonEmpty(color.border, '#c3c4c7'),
    borderSoft: firstNonEmpty(color.borderSoft, '#dcdcde'),
    text,
    textMuted: firstNonEmpty(color.textMuted, '#646970'),
    accent,
    onAccent: firstNonEmpty(color.onAccent, '#ffffff'),
    error: firstNonEmpty(color.error, '#d63638'),
    sidebar: firstNonEmpty(surfaces.sidebar, '#1d2327'),
    sidebarText: firstNonEmpty(surfaces.sidebarText, '#f0f0f1'),
    topbar: firstNonEmpty(surfaces.topbar, '#1d2327'),
    topbarText: firstNonEmpty(surfaces.topbarText, '#f0f0f1')
  };
}

export function applyCssVarsToDocument(vars, target = globalThis?.document?.documentElement) {
  if (!target || !target.style) return;
  for (const [key, value] of Object.entries(vars || {})) {
    target.style.setProperty(key, value);
  }
}
