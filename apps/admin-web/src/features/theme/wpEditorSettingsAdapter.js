import { normalizeEpTheme } from './canonicalTheme.js';

function pickString(value, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

function toColorPalette(theme) {
  const fromPreset = Array.isArray(theme?.origin?.wp?.presets?.color?.palette)
    ? theme.origin.wp.presets.color.palette
    : [];
  if (fromPreset.length > 0) {
    return fromPreset
      .map((entry) => ({
        slug: pickString(entry?.slug),
        name: pickString(entry?.name || entry?.slug),
        color: pickString(entry?.color || entry?.value)
      }))
      .filter((entry) => entry.slug && entry.color);
  }
  return (theme.tokens.palette || [])
    .map((entry) => ({
      slug: pickString(entry?.slug),
      name: pickString(entry?.name || entry?.slug),
      color: pickString(entry?.value)
    }))
    .filter((entry) => entry.slug && entry.color);
}

function toTypographyPresets(theme) {
  const wpTypography = theme?.origin?.wp?.presets?.typography || {};
  const wpFontFamilies = Array.isArray(wpTypography.fontFamilies) ? wpTypography.fontFamilies : [];
  const wpFontSizes = Array.isArray(wpTypography.fontSizes) ? wpTypography.fontSizes : [];

  const tokenTypography = theme.tokens.typography || {};
  const tokenFamilies = Object.entries(tokenTypography)
    .filter(([key, value]) => key.startsWith('family.') && String(value || '').trim())
    .map(([key, value]) => ({
      slug: key.replace(/^family\./, ''),
      name: key.replace(/^family\./, ''),
      fontFamily: String(value).trim()
    }));
  const tokenSizes = Object.entries(tokenTypography)
    .filter(([key, value]) => key.startsWith('size.') && String(value || '').trim())
    .map(([key, value]) => ({
      slug: key.replace(/^size\./, ''),
      name: key.replace(/^size\./, ''),
      size: String(value).trim()
    }));

  return {
    fontFamilies: wpFontFamilies.length > 0 ? wpFontFamilies : tokenFamilies,
    fontSizes: wpFontSizes.length > 0 ? wpFontSizes : tokenSizes
  };
}

function toSpacingPresets(theme) {
  const wpSpacing = theme?.origin?.wp?.presets?.spacing || {};
  const wpSizes = Array.isArray(wpSpacing.spacingSizes) ? wpSpacing.spacingSizes : [];
  if (wpSizes.length > 0) return wpSizes;

  return Object.entries(theme.tokens.spacing || {})
    .filter(([key, value]) => !key.startsWith('scale.') && String(value || '').trim())
    .map(([key, value]) => ({
      slug: key,
      name: key,
      size: String(value).trim()
    }));
}

function buildEditorRootStyles(theme) {
  const textColor = pickString(theme.tokens.color?.text, '#1e1e1e');
  const background = pickString(theme.surfaces?.surfaceMuted || theme.tokens.color?.background, '#ffffff');
  const titleSize = pickString(theme.tokens.typography?.['size.display'] || theme.tokens.typography?.['size.xxl'], 'clamp(2.75rem, 6vw, 5rem)');
  const bodySize = pickString(theme.tokens.typography?.['size.lg'] || theme.tokens.typography?.['size.base'], '1.75rem');
  const fontFamily = pickString(theme.tokens.typography?.['family.body'], 'inherit');
  const muted = pickString(theme.tokens.color?.textMuted, '#757575');
  const contentSize = pickString(theme.tokens.layout?.contentSize, '840px');
  const wideSize = pickString(theme.tokens.layout?.wideSize, '1200px');
  const lineHeight = pickString(theme.tokens.typography?.lineHeight, '1.45');

  const css = `
.editor-styles-wrapper{
  color:${textColor};
  background:${background};
  font-family:${fontFamily};
  line-height:${lineHeight};
}
.editor-styles-wrapper .wp-block-post-title,
.editor-styles-wrapper .editor-post-title__input{
  font-size:${titleSize};
  line-height:1.08;
}
.editor-styles-wrapper p,
.editor-styles-wrapper .wp-block-paragraph,
.editor-styles-wrapper .block-editor-default-block-appender__content{
  font-size:${bodySize};
  line-height:${lineHeight};
}
.editor-styles-wrapper .editor-post-title__input::placeholder,
.editor-styles-wrapper .block-editor-rich-text__editable[data-rich-text-placeholder]::before,
.editor-styles-wrapper .block-editor-default-block-appender__content{
  color:${muted};
}
.editor-styles-wrapper .is-root-container{
  max-width:${contentSize};
}
.editor-styles-wrapper .alignwide{
  max-width:${wideSize};
}
.editor-styles-wrapper .alignfull{
  max-width:none;
}
`;
  return { css, contentSize, wideSize };
}

export function toWpEditorSettings(epTheme, { allowedBlockTypes = [] } = {}) {
  const theme = normalizeEpTheme(epTheme || {});
  const colors = toColorPalette(theme);
  const typography = toTypographyPresets(theme);
  const spacingSizes = toSpacingPresets(theme);
  const stylesRoot = buildEditorRootStyles(theme);

  return {
    hasFixedToolbar: false,
    focusMode: false,
    titlePlaceholder: 'Add title',
    bodyPlaceholder: 'Type / to choose a block',
    allowedBlockTypes,
    colors,
    fontSizes: typography.fontSizes,
    gradients: Array.isArray(theme?.origin?.wp?.presets?.color?.gradients) ? theme.origin.wp.presets.color.gradients : [],
    __experimentalFeatures: {
      color: {
        palette: colors,
        custom: true,
        defaultPalette: true
      },
      typography: {
        fontFamilies: typography.fontFamilies,
        fontSizes: typography.fontSizes,
        customFontSize: true,
        lineHeight: true
      },
      spacing: {
        spacingSizes,
        customSpacingSize: true,
        units: ['px', 'em', 'rem', '%', 'vw', 'vh'],
        blockGap: true
      },
      layout: {
        contentSize: stylesRoot.contentSize,
        wideSize: stylesRoot.wideSize
      },
      blocks: theme.blockStyles || {}
    },
    styles: [{ css: stylesRoot.css, __unstableType: 'theme' }]
  };
}
