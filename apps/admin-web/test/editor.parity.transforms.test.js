import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  createImportTransformRegistry,
  createRendererRegistry,
  corePackImportTransforms,
  corePackRenderers,
  importWpBlocksToCanonical,
  renderCanonicalNodes
} from '../src/features/editor/parity/index.js';

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
  assert.deepEqual(nodes[0].props.style.typography.textAlign, { ref: 'typography.textAlign.left' });
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
      { name: 'core/separator', attributes: { tagName: 'div', opacity: 'css', style: { color: { background: '#ff0000' } } }, innerBlocks: [] },
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
  assert.deepEqual(nodes[0].props.style.spacing.height, { value: '72px' });
  assert.deepEqual(nodes[2].props.style.typography.textAlign, { ref: 'typography.textAlign.right' });
  assert.deepEqual(nodes[3].props.style.color.background, { value: '#ff0000' });

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
  assert.deepEqual(nodes[0].props.style.spacing.height, { ref: 'spacing.preset.50' });
});

test('image caption sanitization preserves safe markup and removes unsafe attributes', () => {
  const importRegistry = createImportTransformRegistry(corePackImportTransforms);
  const rendererRegistry = createRendererRegistry(corePackRenderers);

  const { nodes, diagnostics } = importWpBlocksToCanonical({
    blocks: [
      {
        name: 'core/image',
        attributes: {
          id: 'med_2',
          caption: '<em onclick="x()">Cap</em><script>alert(1)</script>'
        },
        innerBlocks: []
      }
    ],
    importRegistry
  });

  assert.equal(nodes[0].lossiness, 'partial');
  assert.equal(nodes[0].props.caption, '<em>Cap</em>');
  assert.equal(diagnostics.counts.partial >= 1, true);

  const rendered = renderCanonicalNodes({
    nodes,
    rendererRegistry,
    target: 'publish',
    context: {
      resolveMediaById() {
        return { id: 'med_2', url: 'https://cdn.example/image.png', alt: 'a' };
      }
    }
  });

  assert.ok(rendered.output.includes('<figcaption><em>Cap</em></figcaption>'));
  assert.equal(rendered.output.includes('onclick='), false);
  assert.equal(rendered.output.includes('<script'), false);
});

test('embed mapping enforces provider policy and emits diagnostics for unsupported providers', () => {
  const importRegistry = createImportTransformRegistry(corePackImportTransforms);

  const { nodes, diagnostics } = importWpBlocksToCanonical({
    blocks: [
      {
        name: 'core/embed',
        attributes: {
          url: 'https://example.org/custom/123',
          caption: 'Custom provider'
        },
        innerBlocks: []
      }
    ],
    importRegistry
  });

  assert.equal(nodes[0].blockKind, 'ep/embed');
  assert.equal(nodes[0].lossiness, 'partial');
  assert.equal(nodes[0].props.url, '');
  assert.equal(diagnostics.counts.partial >= 1, true);
  assert.equal(
    diagnostics.items.some((item) => item.code === 'EMBED_PROVIDER_UNSUPPORTED'),
    true
  );
});

describe('Navigation Block Parity', () => {
  test('import transform maps core/navigation to ep/navigation without loss', () => {
    const importRegistry = createImportTransformRegistry(corePackImportTransforms);

    const wpAttrs = {
      menuId: 'menu_primary',
      layout: { orientation: 'vertical' },
      showSubmenuIndicators: true,
      style: { color: { text: '#111111' } }
    };

    const { nodes, diagnostics } = importWpBlocksToCanonical({
      blocks: [
        {
          name: 'core/navigation',
          attributes: wpAttrs,
          innerHTML: '<nav></nav>',
          innerBlocks: [
            {
              name: 'core/navigation-link',
              attributes: {
                menuItemId: 'home',
                label: 'Home',
                kind: 'post-type',
                route: '/home'
              },
              innerBlocks: []
            },
            {
              name: 'core/navigation-link',
              attributes: {
                menuItemId: 'about',
                label: 'About',
                kind: 'post-type',
                route: '/about'
              },
              innerBlocks: [
                {
                  name: 'core/navigation-link',
                  attributes: {
                    menuItemId: 'team',
                    label: 'Team',
                    kind: 'post-type',
                    route: '/about/team'
                  },
                  innerBlocks: []
                }
              ]
            }
          ]
        }
      ],
      importRegistry
    });

    assert.equal(nodes.length, 1);
    assert.equal(nodes[0].blockKind, 'ep/navigation');
    assert.equal(nodes[0].props.menuId, 'menu_primary');
    assert.equal(nodes[0].props.orientation, 'vertical');
    assert.equal(nodes[0].props.showSubmenuIndicators, true);
    assert.equal(nodes[0].props.fallbackItems.length, 3);
    assert.deepEqual(nodes[0].props.fallbackItems[0], {
      id: 'home',
      label: 'Home',
      kind: 'internal',
      route: '/home',
      documentId: '',
      externalUrl: '',
      order: 0,
      parentId: null,
      target: '_self',
      rel: ''
    });
    assert.deepEqual(nodes[0].props.fallbackItems[2], {
      id: 'team',
      label: 'Team',
      kind: 'internal',
      route: '/about/team',
      documentId: '',
      externalUrl: '',
      order: 0,
      parentId: 'about',
      target: '_self',
      rel: ''
    });
    assert.equal(nodes[0].origin.wpBlockName, 'core/navigation');
    assert.equal(nodes[0].origin.attrs.menuId, 'menu_primary');
    assert.deepEqual(nodes[0].origin.attrs.layout, { orientation: 'vertical' });
    assert.equal(nodes[0].lossiness, 'none');
    assert.equal(diagnostics.counts.transformed, 1);
  });

  test('editor renderer outputs Gutenberg core/navigation block with nested links', () => {
    const rendererRegistry = createRendererRegistry(corePackRenderers);
    const fallbackItems = [
      {
        id: 'home',
        label: 'Home',
        kind: 'internal',
        route: '/home',
        order: 0
      },
      {
        id: 'docs',
        label: 'Docs',
        kind: 'internal',
        route: '/docs',
        order: 1,
        children: [
          {
            id: 'api',
            label: 'API',
            kind: 'external',
            externalUrl: 'https://api.example.com',
            target: '_blank',
            rel: 'noopener',
            order: 0
          }
        ]
      }
    ];

    const rendered = renderCanonicalNodes({
      nodes: [
        {
          blockKind: 'ep/navigation',
          props: {
            menuId: 'menu_primary',
            fallbackItems,
            orientation: 'vertical',
            showSubmenuIndicators: false,
            style: { spacing: { blockGap: '0.5rem' } }
          },
          children: []
        }
      ],
      rendererRegistry,
      target: 'editor'
    });

    assert.ok(Array.isArray(rendered.output));
    assert.equal(rendered.output.length, 1);
    assert.equal(rendered.output[0].name, 'core/navigation');
    assert.equal(rendered.output[0].attributes.menuId, 'menu_primary');
    assert.equal(rendered.output[0].attributes.ref, 'menu_primary');
    assert.equal(rendered.output[0].attributes.layout.orientation, 'vertical');
    assert.equal(rendered.output[0].attributes.showSubmenuIcon, false);
    assert.equal(rendered.output[0].attributes.fallbackItems.length, 3);
    assert.equal(rendered.output[0].innerBlocks.length, 2);
    assert.equal(rendered.output[0].innerBlocks[1].name, 'core/navigation-link');
    assert.equal(rendered.output[0].innerBlocks[1].innerBlocks[0].name, 'core/navigation-link');
    assert.equal(rendered.output[0].innerBlocks[1].innerBlocks[0].attributes.kind, 'custom');
    assert.equal(rendered.output[0].innerBlocks[1].innerBlocks[0].attributes.url, 'https://api.example.com');
  });

  test('preview renderer resolves menu snapshot from context and falls back to block items', () => {
    const rendererRegistry = createRendererRegistry(corePackRenderers);
    const node = {
      blockKind: 'ep/navigation',
      props: {
        menuId: 'menu_primary',
        fallbackItems: [
          {
            id: 'fallback_1',
            label: 'Fallback only',
            kind: 'internal',
            route: '/fallback',
            order: 0
          }
        ],
        orientation: 'vertical',
        showSubmenuIndicators: true
      },
      children: []
    };

    const fromMenuSnapshot = renderCanonicalNodes({
      nodes: [node],
      rendererRegistry,
      target: 'preview',
      context: {
        menus: [
          {
            id: 'menu_primary',
            items: [
              {
                id: 'home',
                label: 'Home',
                kind: 'internal',
                route: '/home',
                order: 0
              },
              {
                id: 'docs',
                label: 'Docs',
                kind: 'internal',
                documentId: 'doc_123',
                order: 1,
                children: [
                  {
                    id: 'api',
                    label: 'API',
                    kind: 'external',
                    externalUrl: 'https://api.example.com',
                    target: '_blank',
                    rel: 'noopener',
                    order: 0
                  }
                ]
              }
            ]
          }
        ]
      }
    });

    assert.ok(fromMenuSnapshot.output.includes('class="wp-block-navigation ep-navigation is-vertical"'));
    assert.ok(fromMenuSnapshot.output.includes('href="/home"'));
    assert.ok(fromMenuSnapshot.output.includes('href="/documents/doc_123"'));
    assert.ok(fromMenuSnapshot.output.includes('href="https://api.example.com" target="_blank" rel="noopener"'));
    assert.ok(fromMenuSnapshot.output.includes('wp-block-navigation__submenu-container'));
    assert.ok(fromMenuSnapshot.output.includes('wp-block-navigation__submenu-icon'));
    assert.equal(fromMenuSnapshot.output.includes('Fallback only'), false);

    const fallbackRender = renderCanonicalNodes({
      nodes: [node],
      rendererRegistry,
      target: 'preview',
      context: { menus: [] }
    });

    assert.ok(fallbackRender.output.includes('Fallback only'));
    assert.ok(fallbackRender.output.includes('href="/fallback"'));
  });

  test('publish renderer matches preview output for same navigation context', () => {
    const rendererRegistry = createRendererRegistry(corePackRenderers);
    const nodes = [
      {
        blockKind: 'ep/navigation',
        props: {
          menuId: 'menu_secondary',
          fallbackItems: [
            {
              id: 'fallback_1',
              label: 'Fallback link',
              kind: 'internal',
              route: '/fallback',
              order: 0
            }
          ],
          orientation: 'horizontal',
          showSubmenuIndicators: true
        },
        children: []
      }
    ];

    const context = {
      sourceRevisionSet: {
        menus: [
          {
            key: 'menu_secondary',
            items: [
              {
                id: 'products',
                label: 'Products',
                kind: 'internal',
                route: '/products',
                order: 0,
                children: [
                  {
                    id: 'pricing',
                    label: 'Pricing',
                    kind: 'internal',
                    route: '/pricing',
                    order: 0
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    const preview = renderCanonicalNodes({ nodes, rendererRegistry, target: 'preview', context });
    const publish = renderCanonicalNodes({ nodes, rendererRegistry, target: 'publish', context });

    assert.equal(publish.output, preview.output);
    assert.ok(publish.output.includes('class="wp-block-navigation ep-navigation is-horizontal"'));
    assert.ok(publish.output.includes('Products'));
    assert.ok(publish.output.includes('Pricing'));
    assert.ok(publish.output.includes('wp-block-navigation__submenu-container'));
    assert.ok(publish.output.includes('wp-block-navigation__submenu-icon'));
    assert.equal(publish.output.includes('Fallback link'), false);
  });
});

describe('Navigation Block Parity Edge Cases', () => {
  test('should normalize invalid navigation import attributes', () => {
    const importRegistry = createImportTransformRegistry(corePackImportTransforms);

    const { nodes, diagnostics } = importWpBlocksToCanonical({
      blocks: [
        {
          name: 'core/navigation',
          attributes: {
            menuId: 'menu_edge',
            orientation: 'diagonal',
            showSubmenuIcon: 0,
            fallbackItems: [
              {
                id: '',
                label: '',
                kind: 'unsupported-kind',
                route: '/should-not-break',
                order: 'NaN'
              }
            ]
          },
          innerBlocks: []
        }
      ],
      importRegistry
    });

    assert.equal(nodes.length, 1);
    assert.equal(nodes[0].blockKind, 'ep/navigation');
    assert.equal(nodes[0].props.orientation, 'horizontal');
    assert.equal(nodes[0].props.showSubmenuIndicators, false);
    assert.deepEqual(nodes[0].props.fallbackItems[0], {
      id: 'nav_item_1',
      label: 'Item 1',
      kind: 'internal',
      route: '/should-not-break',
      documentId: '',
      externalUrl: '',
      order: 0,
      parentId: null,
      target: '_self',
      rel: ''
    });
    assert.equal(nodes[0].lossiness, 'none');
    assert.equal(diagnostics.counts.transformed, 1);
  });

  test('should return stable editor model when navigation props are malformed', () => {
    const rendererRegistry = createRendererRegistry(corePackRenderers);

    const rendered = renderCanonicalNodes({
      nodes: [
        {
          blockKind: 'ep/navigation',
          props: {
            menuId: '',
            fallbackItems: 'not-an-array',
            orientation: 'sideways'
          },
          children: []
        }
      ],
      rendererRegistry,
      target: 'editor'
    });

    assert.equal(rendered.output.length, 1);
    assert.equal(rendered.output[0].name, 'core/navigation');
    assert.equal(rendered.output[0].attributes.layout.orientation, 'horizontal');
    assert.deepEqual(rendered.output[0].attributes.fallbackItems, []);
    assert.deepEqual(rendered.output[0].innerBlocks, []);
  });

  test('should escape unsafe values in preview navigation output', () => {
    const rendererRegistry = createRendererRegistry(corePackRenderers);

    const rendered = renderCanonicalNodes({
      nodes: [
        {
          blockKind: 'ep/navigation',
          props: {
            fallbackItems: [
              {
                id: 'unsafe',
                label: 'Docs <script>alert(1)</script>',
                kind: 'external',
                externalUrl: '',
                target: '_blank" onclick="alert(1)',
                rel: 'noopener" data-test="bad'
              }
            ]
          },
          children: []
        }
      ],
      rendererRegistry,
      target: 'preview'
    });

    assert.ok(rendered.output.includes('href="#"'));
    assert.ok(rendered.output.includes('Docs &lt;script&gt;alert(1)&lt;/script&gt;'));
    assert.ok(rendered.output.includes('target="_blank&quot; onclick=&quot;alert(1)"'));
    assert.ok(rendered.output.includes('rel="noopener&quot; data-test=&quot;bad"'));
    assert.equal(rendered.output.includes('<script>'), false);
    assert.equal(rendered.output.includes('onclick="alert(1)"'), false);
  });

  test('should use fallback items in publish output when menu snapshot is invalid', () => {
    const rendererRegistry = createRendererRegistry(corePackRenderers);

    const rendered = renderCanonicalNodes({
      nodes: [
        {
          blockKind: 'ep/navigation',
          props: {
            menuId: 'menu_invalid_snapshot',
            fallbackItems: [
              {
                id: 'parent',
                label: 'Parent',
                kind: 'internal',
                route: '/parent',
                order: 0
              },
              {
                id: 'child',
                label: 'Child',
                kind: 'internal',
                route: '/child',
                order: 0,
                parentId: 'parent'
              }
            ],
            orientation: 'vertical',
            showSubmenuIndicators: false
          },
          children: []
        }
      ],
      rendererRegistry,
      target: 'publish',
      context: {
        sourceRevisionSet: {
          menus: [
            {
              key: 'menu_invalid_snapshot',
              items: null
            }
          ]
        }
      }
    });

    assert.ok(rendered.output.includes('class="wp-block-navigation ep-navigation is-vertical"'));
    assert.ok(rendered.output.includes('href="/parent"'));
    assert.ok(rendered.output.includes('href="/child"'));
    assert.ok(rendered.output.includes('wp-block-navigation__submenu-container'));
    assert.equal(rendered.output.includes('wp-block-navigation__submenu-icon'), false);
  });
});
