import { normalizeEpTheme } from './canonicalTheme.js';

function readWpPalette(settings) {
  const palette = settings?.color?.palette;
  if (!Array.isArray(palette)) return [];
  return palette.map((item) => ({
    slug: String(item?.slug || '').trim(),
    name: String(item?.name || '').trim(),
    value: String(item?.color || '').trim()
  }));
}

function toTypographyTokenRecord(settings = {}) {
  const fontFamilies = Array.isArray(settings?.typography?.fontFamilies) ? settings.typography.fontFamilies : [];
  const fontSizes = Array.isArray(settings?.typography?.fontSizes) ? settings.typography.fontSizes : [];
  const out = {};
  for (const family of fontFamilies) {
    const slug = String(family?.slug || '').trim();
    const value = String(family?.fontFamily || '').trim();
    if (slug && value) out[`family.${slug}`] = value;
  }
  for (const size of fontSizes) {
    const slug = String(size?.slug || '').trim();
    const value = String(size?.size || '').trim();
    if (slug && value) out[`size.${slug}`] = value;
  }
  return out;
}

function toSpacingTokenRecord(settings = {}) {
  const out = {};
  const spacingSizes = Array.isArray(settings?.spacing?.spacingSizes) ? settings.spacing.spacingSizes : [];
  for (const size of spacingSizes) {
    const slug = String(size?.slug || '').trim();
    const value = String(size?.size || '').trim();
    if (slug && value) out[slug] = value;
  }
  const scale = settings?.spacing?.spacingScale;
  if (scale && typeof scale === 'object') {
    for (const [key, value] of Object.entries(scale)) {
      if (value === undefined || value === null) continue;
      out[`scale.${key}`] = String(value).trim();
    }
  }
  return out;
}

function readWpPresets(settings = {}) {
  return {
    color: {
      palette: Array.isArray(settings?.color?.palette) ? settings.color.palette : [],
      gradients: Array.isArray(settings?.color?.gradients) ? settings.color.gradients : []
    },
    typography: {
      fontFamilies: Array.isArray(settings?.typography?.fontFamilies) ? settings.typography.fontFamilies : [],
      fontSizes: Array.isArray(settings?.typography?.fontSizes) ? settings.typography.fontSizes : []
    },
    spacing: {
      spacingSizes: Array.isArray(settings?.spacing?.spacingSizes) ? settings.spacing.spacingSizes : [],
      spacingScale: settings?.spacing?.spacingScale || {}
    }
  };
}

function readWpCustom(settings = {}, styles = {}) {
  return {
    settings: {
      color: settings?.color?.custom || {},
      spacing: settings?.spacing?.custom || {},
      typography: settings?.typography?.custom || {},
      blocks: settings?.blocks || {}
    },
    styles: {
      root: styles || {},
      blocks: styles?.blocks || {}
    }
  };
}

export function fromWpThemeJson(input = {}, { mode = 'light' } = {}) {
  const settings = input?.settings || {};
  const styles = input?.styles || {};

  const background = String(styles?.color?.background || '').trim();
  const text = String(styles?.color?.text || '').trim();
  const link = String(styles?.elements?.link?.color?.text || '').trim();

  const ep = normalizeEpTheme({
    name: String(input?.title || input?.name || 'Imported WP Theme').trim(),
    mode,
    tokens: {
      color: {
        background,
        text,
        accent: link
      },
      spacing: toSpacingTokenRecord(settings),
      typography: toTypographyTokenRecord(settings),
      palette: readWpPalette(settings)
    },
    surfaces: {
      page: background,
      surface: background,
      surfaceMuted: background,
      sidebar: background,
      sidebarText: text,
      topbar: background,
      topbarText: text
    },
    blockStyles: styles?.blocks || {},
    metadata: {
      source: 'wp-theme-json',
      wpVersion: String(input?.version || '').trim()
    },
    origin: {
      wp: {
        presets: readWpPresets(settings),
        custom: readWpCustom(settings, styles)
      }
    }
  });

  return ep;
}
