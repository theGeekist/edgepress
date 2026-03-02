import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAdminShell,
  buildSiteShell,
  buildPreviewShell
} from '../../../packages/content/src/renderShell.js';

function buildPublishShell(theme, cssVars, options = {}) {
  return buildSiteShell(theme, cssVars, {
    ...options,
    classes: ['ep-shell-publish', options.classes].filter(Boolean).join(' ')
  });
}

function extractCssVars(html) {
  const vars = {};
  const source = String(html || '');
  for (const chunk of source.split(';')) {
    const colonIndex = chunk.indexOf(':');
    if (colonIndex <= 0) continue;

    const rawName = chunk.slice(0, colonIndex).trim();
    const lastBrace = Math.max(rawName.lastIndexOf('{'), rawName.lastIndexOf('}'));
    const candidateName = rawName.slice(lastBrace + 1).trim();
    if (!/^--[a-z0-9-_]+$/i.test(candidateName)) continue;

    const rawValue = chunk.slice(colonIndex + 1).trim();
    if (!rawValue) continue;
    vars[candidateName] = rawValue;
  }
  return vars;
}

function normalizeThemeScope(vars) {
  const normalized = {};
  for (const [name, value] of Object.entries(vars || {})) {
    if (name.startsWith('--ep-admin-')) {
      normalized[`--${name.slice('--ep-admin-'.length)}`] = value;
      continue;
    }
    if (name.startsWith('--ep-site-')) {
      normalized[`--${name.slice('--ep-site-'.length)}`] = value;
      continue;
    }
    normalized[name] = value;
  }
  return normalized;
}

function select(vars, keys) {
  return Object.fromEntries(keys.map((key) => {
    assert.ok(Object.prototype.hasOwnProperty.call(vars, key), `Missing key ${key}`);
    return [key, vars[key]];
  }));
}

describe('Theme shell parity', () => {
  const theme = {
    colorText: '#1d2327',
    colorBackground: '#f6f7f7',
    typographyBodySize: '16px',
    spacingBlockGap: '1.5rem'
  };
  const sharedCssVars = {
    '--wp--style--color--link': '#2271b1',
    '--wp--style--block-gap': '1.5rem',
    '--wp--style--elements-button-border-radius': '6px'
  };
  const canonicalThemeKeys = [
    '--color-text',
    '--color-background',
    '--typography-body-size',
    '--spacing-block-gap'
  ];

  test('identical theme tokens produce identical CSS vars across shells', () => {
    const adminVars = extractCssVars(buildAdminShell(theme, sharedCssVars));
    const siteVars = extractCssVars(buildSiteShell(theme, sharedCssVars));
    const previewVars = extractCssVars(buildPreviewShell(theme, sharedCssVars));
    const publishVars = extractCssVars(buildPublishShell(theme, sharedCssVars));

    const adminCanonical = select(normalizeThemeScope(adminVars), canonicalThemeKeys);
    const siteCanonical = select(normalizeThemeScope(siteVars), canonicalThemeKeys);
    const previewCanonical = select(normalizeThemeScope(previewVars), canonicalThemeKeys);
    const publishCanonical = select(normalizeThemeScope(publishVars), canonicalThemeKeys);

    assert.deepEqual(adminCanonical, siteCanonical);
    assert.deepEqual(siteCanonical, previewCanonical);
    assert.deepEqual(previewCanonical, publishCanonical);
  });

  test("admin chrome tokens don't leak into content shells", () => {
    const adminVars = Object.keys(extractCssVars(buildAdminShell(theme, sharedCssVars)));
    const siteVars = Object.keys(extractCssVars(buildSiteShell(theme, sharedCssVars)));
    const previewVars = Object.keys(extractCssVars(buildPreviewShell(theme, sharedCssVars)));
    const publishVars = Object.keys(extractCssVars(buildPublishShell(theme, sharedCssVars)));

    assert.equal(adminVars.some((name) => name.startsWith('--ep-admin-')), true);
    assert.equal(adminVars.some((name) => name.startsWith('--ep-site-')), false);

    assert.equal(siteVars.some((name) => name.startsWith('--ep-admin-')), false);
    assert.equal(siteVars.some((name) => name.startsWith('--ep-site-')), true);
    assert.equal(previewVars.some((name) => name.startsWith('--ep-admin-')), false);
    assert.equal(previewVars.some((name) => name.startsWith('--ep-site-')), false);
    assert.equal(publishVars.some((name) => name.startsWith('--ep-admin-')), false);
    assert.equal(publishVars.some((name) => name.startsWith('--ep-site-')), true);
  });

  test('site tokens drive all three content targets', () => {
    const siteVars = normalizeThemeScope(extractCssVars(buildSiteShell(theme, sharedCssVars)));
    const previewVars = normalizeThemeScope(extractCssVars(buildPreviewShell(theme, sharedCssVars)));
    const publishVars = normalizeThemeScope(extractCssVars(buildPublishShell(theme, sharedCssVars)));

    const siteTokens = select(siteVars, canonicalThemeKeys);
    const previewTokens = select(previewVars, canonicalThemeKeys);
    const publishTokens = select(publishVars, canonicalThemeKeys);

    assert.deepEqual(siteTokens, previewTokens);
    assert.deepEqual(previewTokens, publishTokens);
    assert.equal(publishTokens['--color-text'], '#1d2327');
  });

  test('block-level style refs resolve consistently across content shells', () => {
    const siteVars = extractCssVars(buildSiteShell(theme, sharedCssVars));
    const previewVars = extractCssVars(buildPreviewShell(theme, sharedCssVars));
    const publishVars = extractCssVars(buildPublishShell(theme, sharedCssVars));

    const blockStyleRefKeys = [
      '--wp--style--color--link',
      '--wp--style--block-gap',
      '--wp--style--elements-button-border-radius'
    ];

    assert.deepEqual(select(siteVars, blockStyleRefKeys), select(previewVars, blockStyleRefKeys));
    assert.deepEqual(select(previewVars, blockStyleRefKeys), select(publishVars, blockStyleRefKeys));
  });
});
