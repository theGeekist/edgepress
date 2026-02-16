import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeEpTheme,
  makeTokenRef,
  isTokenRef,
  encodeEpTheme,
  decodeEpTheme,
  fromWpThemeJson,
  mergeEpThemes,
  toCssVars,
  toUiPalette,
  toWpThemeJson,
  applyCssVarsToDocument,
  defaultLightTheme
} from '../../../apps/admin-web/src/features/theme/index.js';

test('normalizeEpTheme is deterministic and schema-versioned', () => {
  const normalized = normalizeEpTheme({
    name: 'X',
    mode: 'light',
    tokens: {
      color: { b: '#000', a: '#fff' },
      palette: [{ slug: 'z', color: '#000' }, { slug: 'a', color: '#fff' }]
    },
    surfaces: { topbar: '#111', page: '#eee' }
  });

  assert.equal(normalized.schemaVersion, 1);
  assert.deepEqual(Object.keys(normalized.tokens.color), ['a', 'b']);
  assert.deepEqual(normalized.tokens.palette.map((entry) => entry.slug), ['a', 'z']);
  assert.deepEqual(normalized.styleProps.color.a, { ref: 'color.a' });
  assert.equal(isTokenRef(normalized.styleProps.color.a), true);

  const encoded = encodeEpTheme(normalized);
  const decoded = decodeEpTheme(encoded);
  assert.deepEqual(decoded, normalized);
});

test('makeTokenRef returns canonical semantic refs', () => {
  assert.deepEqual(makeTokenRef('color.text.primary'), { ref: 'color.text.primary' });
  assert.equal(makeTokenRef(''), null);
});

test('fromWpThemeJson maps basic settings/styles into epTheme', () => {
  const wpTheme = {
    version: 2,
    title: 'WP Theme',
    settings: {
      color: {
        palette: [
          { slug: 'primary', name: 'Primary', color: '#123456' }
        ],
        custom: {
          customDuotone: true
        }
      },
      typography: {
        fontSizes: [{ slug: 'm', size: '16px' }],
        fontFamilies: [{ slug: 'body', fontFamily: 'Inter, sans-serif' }]
      },
      spacing: {
        spacingSizes: [{ slug: '40', size: '1rem' }],
        spacingScale: { steps: 6 },
        custom: { units: ['px', 'rem'] }
      }
    },
    styles: {
      color: {
        background: '#f6f7f7',
        text: '#1e1e1e'
      },
      elements: {
        link: {
          color: {
            text: '#2271b1'
          }
        }
      }
    }
  };

  const ep = fromWpThemeJson(wpTheme, { mode: 'light' });
  assert.equal(ep.name, 'WP Theme');
  assert.equal(ep.tokens.color.background, '#f6f7f7');
  assert.equal(ep.tokens.color.text, '#1e1e1e');
  assert.equal(ep.tokens.color.accent, '#2271b1');
  assert.equal(ep.tokens.palette[0].slug, 'primary');
  assert.equal(ep.tokens.typography['size.m'], '16px');
  assert.equal(ep.tokens.typography['family.body'], 'Inter, sans-serif');
  assert.equal(ep.tokens.spacing['40'], '1rem');
  assert.equal(ep.tokens.spacing['scale.steps'], '6');
  assert.equal(ep.metadata.source, 'wp-theme-json');
  assert.equal(ep.origin.wp.presets.color.palette[0].slug, 'primary');
  assert.equal(ep.origin.wp.custom.settings.spacing.units[1], 'rem');
});

test('theme runtime merges overlays and emits css vars + ui palette', () => {
  const merged = mergeEpThemes(defaultLightTheme, {
    tokens: {
      color: { accent: '#ff5500' },
      palette: [{ slug: 'brand', name: 'Brand', value: '#ff5500' }],
      spacing: { md: '14px' }
    },
    surfaces: {
      topbar: '#222'
    }
  });

  const vars = toCssVars(merged);
  assert.equal(vars['--ep-color-accent'], '#ff5500');
  assert.equal(vars['--ep-palette-brand'], '#ff5500');
  assert.equal(vars['--ep-space-md'], '14px');
  assert.equal(vars['--ep-surface-topbar'], '#222');

  const palette = toUiPalette(merged);
  assert.equal(palette.accent, '#ff5500');
  assert.equal(palette.topbar, '#222');
  assert.equal(typeof palette.page, 'string');
});

test('mergeEpThemes keeps base mode/name unless overlay explicitly sets them', () => {
  const merged = mergeEpThemes(
    { name: 'Dark Base', mode: 'dark', tokens: { color: { accent: '#111' } } },
    { tokens: { color: { accent: '#222' } } }
  );
  assert.equal(merged.mode, 'dark');
  assert.equal(merged.name, 'Dark Base');
  assert.equal(merged.tokens.color.accent, '#222');
});

test('toCssVars ignores non-theme ref namespaces', () => {
  const vars = toCssVars({
    tokens: {
      color: { accent: '#2271b1' }
    },
    styleProps: {
      color: {
        accent: { ref: 'color.accent' },
        wpCompat: { ref: 'spacing.preset.50' }
      }
    }
  });
  assert.equal(vars['--ep-color-accent'], '#2271b1');
  assert.equal(vars['--ep-color-wpCompat'], undefined);
});

test('toWpThemeJson emits typography and spacing presets from EP tokens', () => {
  const out = toWpThemeJson({
    name: 'EP Export',
    tokens: {
      color: { background: '#101010', text: '#f5f5f5' },
      typography: {
        'family.body': 'Inter, sans-serif',
        'size.base': '16px'
      },
      spacing: {
        md: '1rem'
      },
      palette: [{ slug: 'primary', value: '#2271b1', name: 'Primary' }]
    }
  });

  assert.equal(out.title, 'EP Export');
  assert.equal(out.settings.typography.fontFamilies[0].slug, 'body');
  assert.equal(out.settings.typography.fontSizes[0].slug, 'base');
  assert.equal(out.settings.spacing.spacingSizes[0].slug, 'md');
  assert.equal(out.styles.color.background, '#101010');
  assert.equal(out.styles.color.text, '#f5f5f5');
});

test('applyCssVarsToDocument is a no-op for invalid targets and sets vars when valid', () => {
  assert.doesNotThrow(() => applyCssVarsToDocument({ '--ep-x': '1' }, null));

  const calls = [];
  const target = {
    style: {
      setProperty(key, value) {
        calls.push([key, value]);
      }
    }
  };
  applyCssVarsToDocument({ '--ep-color-accent': '#2271b1' }, target);
  assert.deepEqual(calls, [['--ep-color-accent', '#2271b1']]);
});
