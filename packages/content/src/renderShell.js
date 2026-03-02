function escapeHtml(input) {
  return String(input ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const CSS_VAR_NAME_RE = /^--[a-z0-9-_]+$/i;
const UNSAFE_STYLE_VALUE_TOKEN_RE = /[<>{};]|\/\*|\*\/|url\(/i;
const UNSAFE_VAR_NAME_TOKEN_RE = /[;:{}()'"\\`]/;

function toKebabCase(input) {
  const value = String(input || '').trim();
  if (!value) return '';
  return value
    .replaceAll(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replaceAll(/[_\s]+/g, '-')
    .replaceAll(/-+/g, '-')
    .toLowerCase();
}

function normalizeClassName(input) {
  if (Array.isArray(input)) {
    return input.map((entry) => String(entry || '').trim()).filter(Boolean).join(' ');
  }
  return String(input || '').trim();
}

function normalizeCssVars(cssVars) {
  if (!cssVars || typeof cssVars !== 'object' || Array.isArray(cssVars)) return {};
  const out = {};
  for (const [key, value] of Object.entries(cssVars)) {
    const varName = String(key ?? '').trim();
    const varValue = value == null ? '' : String(value).trim();
    if (!CSS_VAR_NAME_RE.test(varName) || !varValue) continue;
    if (UNSAFE_VAR_NAME_TOKEN_RE.test(varName) || UNSAFE_STYLE_VALUE_TOKEN_RE.test(varValue)) continue;
    out[varName] = varValue;
  }
  return out;
}

function buildThemeVars(theme, prefix) {
  if (!theme || typeof theme !== 'object' || Array.isArray(theme)) return {};
  const safePrefix = String(prefix || '').trim();
  const out = {};
  for (const [key, value] of Object.entries(theme)) {
    const rawName = String(key ?? '').trim();
    const normalizedKey = rawName.startsWith('--')
      ? rawName.slice(2)
      : toKebabCase(rawName);
    const varValue = value == null ? '' : String(value).trim();
    if (!normalizedKey || !varValue) continue;
    if (UNSAFE_STYLE_VALUE_TOKEN_RE.test(varValue)) continue;
    const fullVarName = safePrefix
      ? `${safePrefix}${normalizedKey}`
      : `--${normalizedKey}`;
    if (!CSS_VAR_NAME_RE.test(fullVarName) || UNSAFE_VAR_NAME_TOKEN_RE.test(fullVarName)) continue;
    out[fullVarName] = varValue;
  }
  return out;
}

function toCssVarBlock(themeVars, cssVars) {
  const merged = {
    ...themeVars,
    ...cssVars
  };
  const entries = Object.entries(merged);
  if (entries.length === 0) return '';
  return entries.map(([key, value]) => `${key}: ${value};`).join('\n        ');
}

export function buildShell(theme, cssVars, options = {}) {
  const {
    prefix = '--ep-site-',
    includeMeta = true,
    title = 'EdgePress',
    description = 'EdgePress content shell',
    lang = 'en',
    content = '',
    bodyClass = '',
    mainClass = '',
    classes = ''
  } = options;
  const themeVars = buildThemeVars(theme, prefix);
  const explicitVars = normalizeCssVars(cssVars);
  const cssVarBlock = toCssVarBlock(themeVars, explicitVars);
  const shellClass = normalizeClassName(['ep-shell', classes]);
  const shellBodyClass = normalizeClassName(['ep-shell-body', bodyClass]);
  const shellMainClass = normalizeClassName(['ep-shell-main', mainClass]);
  const metaMarkup = includeMeta
    ? `
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${escapeHtml(description)}" />`
    : '';

  return `<!doctype html>
<html lang="${escapeHtml(lang)}">
  <head>${metaMarkup}
    <title>${escapeHtml(title)}</title>
    <style>
      .${shellClass.replaceAll(' ', '.')} {
        ${cssVarBlock}
      }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      .ep-shell-body {
        background: var(--ep-surface-page, #f0f0f1);
        color: var(--ep-color-text, #1d2327);
        font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      }
      .ep-shell-main { width: 100%; }
    </style>
  </head>
  <body class="${escapeHtml(shellBodyClass)}">
    <main class="${escapeHtml(normalizeClassName([shellClass, shellMainClass]))}">${content}</main>
  </body>
</html>`;
}

export function buildAdminShell(theme, cssVars, options = {}) {
  return buildShell(theme, cssVars, {
    ...options,
    prefix: '--ep-admin-',
    classes: normalizeClassName(['ep-shell-admin', options.classes])
  });
}

export function buildSiteShell(theme, cssVars, options = {}) {
  return buildShell(theme, cssVars, {
    ...options,
    prefix: '--ep-site-',
    classes: normalizeClassName(['ep-shell-site', options.classes])
  });
}

export function buildPreviewShell(theme, cssVars, options = {}) {
  return buildShell(theme, cssVars, {
    ...options,
    prefix: '',
    classes: normalizeClassName(['ep-shell-preview', options.classes])
  });
}
