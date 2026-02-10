import test from 'node:test';
import assert from 'node:assert/strict';

import { toWpEditorSettings, defaultDarkTheme } from '../../../apps/admin-web/src/features/theme/index.js';

test('toWpEditorSettings maps placeholders and allowed blocks', () => {
  const settings = toWpEditorSettings(defaultDarkTheme, {
    allowedBlockTypes: ['core/paragraph', 'core/image']
  });

  assert.equal(settings.titlePlaceholder, 'Add title');
  assert.equal(settings.bodyPlaceholder, 'Type / to choose a block');
  assert.deepEqual(settings.allowedBlockTypes, ['core/paragraph', 'core/image']);
  assert.ok(Array.isArray(settings.colors));
  assert.ok(Array.isArray(settings.styles));
});

test('toWpEditorSettings prefers WP origin presets when present', () => {
  const settings = toWpEditorSettings({
    name: 'Origin Theme',
    tokens: {
      palette: [{ slug: 'token', name: 'Token', value: '#111111' }],
      typography: {
        'family.body': 'Inter, sans-serif',
        'size.base': '16px'
      },
      spacing: { md: '1rem' }
    },
    origin: {
      wp: {
        presets: {
          color: {
            palette: [{ slug: 'wp-primary', name: 'WP Primary', color: '#123456' }],
            gradients: [{ slug: 'g', gradient: 'linear-gradient(#000,#fff)' }]
          },
          typography: {
            fontFamilies: [{ slug: 'wp-body', name: 'WP Body', fontFamily: 'Georgia, serif' }],
            fontSizes: [{ slug: 'wp-m', name: 'WP M', size: '18px' }]
          },
          spacing: {
            spacingSizes: [{ slug: '40', name: '40', size: '2rem' }]
          }
        }
      }
    }
  });

  assert.equal(settings.colors[0].slug, 'wp-primary');
  assert.equal(settings.fontSizes[0].slug, 'wp-m');
  assert.equal(settings.__experimentalFeatures.typography.fontFamilies[0].slug, 'wp-body');
  assert.equal(settings.__experimentalFeatures.spacing.spacingSizes[0].slug, '40');
  assert.equal(settings.gradients[0].slug, 'g');
});

test('toWpEditorSettings emits editor root CSS from theme tokens', () => {
  const settings = toWpEditorSettings({
    tokens: {
      color: { text: '#f0f0f0', background: '#101820', textMuted: '#8899aa' },
      typography: {
        'family.body': 'Inter, sans-serif',
        'size.display': '72px',
        'size.lg': '28px',
        lineHeight: '1.6'
      },
      layout: { contentSize: '900px', wideSize: '1300px' }
    },
    surfaces: { surfaceMuted: '#0f141a' }
  });

  const css = settings.styles[0].css;
  assert.ok(css.includes('font-size:72px'));
  assert.ok(css.includes('font-size:28px'));
  assert.ok(css.includes('max-width:900px'));
  assert.ok(css.includes('max-width:1300px'));
  assert.ok(css.includes('color:#8899aa'));
});
