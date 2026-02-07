import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createImportTransformRegistry,
  createRendererRegistry,
  corePackImportTransforms,
  corePackRenderers,
  importWpBlocksToCanonical,
  renderCanonicalNodes
} from '../../../apps/admin-web/src/features/editor/parity/index.js';

test('core paragraph transform imports and renders publish output', () => {
  const importRegistry = createImportTransformRegistry(corePackImportTransforms);
  const rendererRegistry = createRendererRegistry(corePackRenderers);

  const { nodes, diagnostics } = importWpBlocksToCanonical({
    blocks: [
      {
        name: 'core/paragraph',
        attributes: { content: 'Hello <em>world</em>', dropCap: true, direction: 'rtl', style: { typography: { textAlign: 'left' } } },
        innerBlocks: []
      }
    ],
    importRegistry
  });

  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].blockKind, 'ep/paragraph');
  assert.equal(nodes[0].props.content, 'Hello <em>world</em>');
  assert.equal(nodes[0].props.dropCap, true);
  assert.equal(nodes[0].props.direction, 'rtl');
  assert.equal(nodes[0].props.textAlign, 'left');
  assert.equal(diagnostics.counts.transformed, 1);

  const rendered = renderCanonicalNodes({ nodes, rendererRegistry, target: 'publish' });
  assert.equal(rendered.output, '<p class="has-drop-cap has-text-align-left" dir="rtl">Hello <em>world</em></p>');
});

test('core image transform resolves url via media resolver for publish target', () => {
  const importRegistry = createImportTransformRegistry(corePackImportTransforms);
  const rendererRegistry = createRendererRegistry(corePackRenderers);

  const { nodes } = importWpBlocksToCanonical({
    blocks: [
      {
        name: 'core/image',
        attributes: { id: 42, alt: 'hero alt', caption: 'hero caption', href: 'https://example.com', linkTarget: '_blank', rel: 'noopener', sizeSlug: 'large', metadata: { bindings: { caption: { source: 'core/post-meta' } } } },
        innerBlocks: []
      }
    ],
    importRegistry
  });

  const rendered = renderCanonicalNodes({
    nodes,
    rendererRegistry,
    target: 'publish',
    context: {
      resolveMediaById(id) {
        if (id === '42') {
          return {
            id: '42',
            url: 'https://cdn.example/hero.jpg',
            alt: 'hero alt from media'
          };
        }
        return null;
      }
    }
  });

  assert.ok(rendered.output.includes('https://cdn.example/hero.jpg'));
  assert.ok(rendered.output.includes('hero alt from media'));
  assert.ok(rendered.output.includes('<figcaption>hero caption</figcaption>'));
  assert.ok(rendered.output.includes('href="https://example.com"'));
  assert.ok(rendered.output.includes('target="_blank"'));
  assert.ok(rendered.output.includes('class="ep-image size-large"'));
});

test('unsupported wp block imports as ep/unknown fallback with diagnostics', () => {
  const importRegistry = createImportTransformRegistry(corePackImportTransforms);

  const { nodes, diagnostics } = importWpBlocksToCanonical({
    blocks: [
      {
        name: 'core/unsupported-block',
        attributes: { foo: 'bar' },
        innerHTML: '<div>raw</div>',
        innerContent: ['<div>raw</div>'],
        innerBlocks: []
      }
    ],
    importRegistry
  });

  assert.equal(nodes[0].blockKind, 'ep/unknown');
  assert.equal(nodes[0].lossiness, 'fallback');
  assert.equal(nodes[0].origin.wpBlockName, 'core/unsupported-block');
  assert.equal(diagnostics.counts.fallback, 1);
});

test('editor target renderer returns view model objects', () => {
  const importRegistry = createImportTransformRegistry(corePackImportTransforms);
  const rendererRegistry = createRendererRegistry(corePackRenderers);

  const { nodes } = importWpBlocksToCanonical({
    blocks: [
      {
        name: 'core/paragraph',
        attributes: { content: 'Editor text' },
        innerBlocks: []
      },
      {
        name: 'core/image',
        attributes: { id: 'med_1', caption: 'cap' },
        innerBlocks: []
      }
    ],
    importRegistry
  });

  const rendered = renderCanonicalNodes({
    nodes,
    rendererRegistry,
    target: 'editor',
    context: {
      resolveMediaById(id) {
        if (id === 'med_1') {
          return { id: 'med_1', url: 'https://cdn.example/1.png', alt: 'media alt' };
        }
        return null;
      }
    }
  });

  assert.ok(Array.isArray(rendered.output));
  assert.equal(rendered.output[0].kind, 'paragraph');
  assert.equal(rendered.output[1].kind, 'image');
  assert.equal(rendered.output[1].url, 'https://cdn.example/1.png');
});

test('layout wp blocks map to EP flex containers and render nested output', () => {
  const importRegistry = createImportTransformRegistry(corePackImportTransforms);
  const rendererRegistry = createRendererRegistry(corePackRenderers);

  const { nodes } = importWpBlocksToCanonical({
    blocks: [
      {
        name: 'core/columns',
        attributes: { verticalAlignment: 'center', isStackedOnMobile: false },
        innerBlocks: [
          {
            name: 'core/column',
            attributes: { width: '50%', verticalAlignment: 'top' },
            innerBlocks: [
              {
                name: 'core/paragraph',
                attributes: { content: 'Inside column' },
                innerBlocks: []
              }
            ]
          }
        ]
      }
    ],
    importRegistry
  });

  assert.equal(nodes[0].blockKind, 'ep/layout-container');
  assert.equal(nodes[0].props.layoutType, 'columns');
  assert.equal(nodes[0].children[0].blockKind, 'ep/layout-item');

  const rendered = renderCanonicalNodes({ nodes, rendererRegistry, target: 'publish' });
  assert.ok(rendered.output.includes('ep-layout--columns'));
  assert.ok(rendered.output.includes('is-not-stacked-on-mobile'));
  assert.ok(rendered.output.includes('ep-layout-item'));
  assert.ok(rendered.output.includes('flex-basis:50%'));
  assert.ok(rendered.output.includes('<p>Inside column</p>'));
});

test('layout renderer returns structured editor models', () => {
  const importRegistry = createImportTransformRegistry(corePackImportTransforms);
  const rendererRegistry = createRendererRegistry(corePackRenderers);

  const { nodes } = importWpBlocksToCanonical({
    blocks: [
      {
        name: 'core/group',
        attributes: { tagName: 'section', style: { layout: { type: 'flex', orientation: 'vertical' } } },
        innerBlocks: []
      }
    ],
    importRegistry
  });

  const rendered = renderCanonicalNodes({ nodes, rendererRegistry, target: 'editor' });
  assert.equal(rendered.output[0].kind, 'layout-container');
  assert.equal(rendered.output[0].layoutType, 'column');
  assert.equal(rendered.output[0].tagName, 'section');
});

test('content mappings cover spacer/heading/quote/separator/embed', () => {
  const importRegistry = createImportTransformRegistry(corePackImportTransforms);
  const rendererRegistry = createRendererRegistry(corePackRenderers);

  const { nodes } = importWpBlocksToCanonical({
    blocks: [
      { name: 'core/spacer', attributes: { height: '72px', width: '20px' }, innerBlocks: [] },
      { name: 'core/heading', attributes: { content: 'Title <strong>Bold</strong>', level: 3 }, innerBlocks: [] },
      {
        name: 'core/quote',
        attributes: { value: '<p>Legacy <em>value</em></p>', citation: 'Author <a href="#">Link</a>', textAlign: 'right' },
        innerBlocks: []
      },
      { name: 'core/separator', attributes: { tagName: 'div', opacity: 'css', backgroundColor: '#ff0000' }, innerBlocks: [] },
      { name: 'core/embed', attributes: { url: 'https://www.youtube.com/watch?v=abc', type: 'video', providerNameSlug: 'youtube', caption: 'Watch <em>this</em>' }, innerBlocks: [] }
    ],
    importRegistry
  });

  assert.equal(nodes[0].blockKind, 'ep/spacer');
  assert.equal(nodes[1].blockKind, 'ep/heading');
  assert.equal(nodes[2].blockKind, 'ep/quote');
  assert.equal(nodes[3].blockKind, 'ep/separator');
  assert.equal(nodes[4].blockKind, 'ep/embed');

  const publish = renderCanonicalNodes({ nodes, rendererRegistry, target: 'publish' });
  assert.ok(publish.output.includes('class="ep-spacer"'));
  assert.ok(publish.output.includes('<h3>Title <strong>Bold</strong></h3>'));
  assert.ok(publish.output.includes('has-text-align-right'));
  assert.ok(publish.output.includes('<p>Legacy <em>value</em></p>'));
  assert.ok(publish.output.includes('<cite>Author <a href="#">Link</a></cite>'));
  assert.ok(publish.output.includes('class="ep-separator'));
  assert.ok(publish.output.includes('has-css-opacity'));
  assert.ok(publish.output.includes('wp-block-embed__wrapper'));
  assert.ok(publish.output.includes('<figcaption>Watch <em>this</em></figcaption>'));
  assert.ok(publish.output.includes('is-provider-youtube'));

  const editor = renderCanonicalNodes({ nodes, rendererRegistry, target: 'editor' });
  assert.equal(editor.output[0].kind, 'spacer');
  assert.equal(editor.output[1].kind, 'heading');
  assert.equal(editor.output[2].kind, 'quote');
  assert.equal(editor.output[3].kind, 'separator');
  assert.equal(editor.output[4].kind, 'embed');
});

test('spacer follows WP selfStretch and spacing preset behavior', () => {
  const importRegistry = createImportTransformRegistry(corePackImportTransforms);
  const rendererRegistry = createRendererRegistry(corePackRenderers);

  const { nodes } = importWpBlocksToCanonical({
    blocks: [
      { name: 'core/spacer', attributes: { height: 'var:preset|spacing|50', width: 'var:preset|spacing|40' }, innerBlocks: [] },
      { name: 'core/spacer', attributes: { height: '100px', style: { layout: { selfStretch: 'fill' } } }, innerBlocks: [] }
    ],
    importRegistry
  });

  const publish = renderCanonicalNodes({ nodes, rendererRegistry, target: 'publish' });
  assert.ok(publish.output.includes('height:var(--wp--preset--spacing--50);width:var(--wp--preset--spacing--40)'));
  assert.ok(publish.output.includes('<div class="ep-spacer" aria-hidden="true"></div>'));
});
