import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CANONICAL_SCHEMA_VERSION,
  normalizeCanonicalNode,
  encodeCanonicalNodes,
  decodeCanonicalNodes,
  createImportTransformRegistry,
  createRendererRegistry,
  resolveImportTransform,
  applyImportTransform,
  resolveRenderer,
  applyRenderer,
  createDiagnosticsReport,
  addDiagnostic,
  sortDiagnostics
} from '../../../apps/admin-web/src/features/editor/parity/index.js';

test('canonical codec normalizes deterministically with stable defaults', () => {
  const node = normalizeCanonicalNode({
    blockKind: 'ep/paragraph',
    props: { b: 2, a: 1 },
    mystery: { z: 1, a: 2 },
    children: [{ blockKind: 'ep/text', props: { value: 'x' } }]
  });

  assert.equal(node.schemaVersion, CANONICAL_SCHEMA_VERSION);
  assert.equal(node.blockKind, 'ep/paragraph');
  assert.deepEqual(Object.keys(node.props), ['a', 'b']);
  assert.equal(node.lossiness, 'none');
  assert.equal(node.children.length, 1);
  assert.equal(node.children[0].id, 'epn_0');
  assert.deepEqual(Object.keys(node.origin.unknownFields), ['mystery']);

  const encoded = encodeCanonicalNodes([node]);
  const decoded = decodeCanonicalNodes(encoded);
  assert.deepEqual(decoded[0], node);
});

test('import resolver is deterministic by priority then lexical id tie-break', () => {
  const registry = createImportTransformRegistry([
    {
      id: 'z.transform',
      priority: 10,
      wpBlockNames: ['core/paragraph'],
      canHandle: () => true,
      toCanonical: () => ({ blockKind: 'ep/paragraph' })
    },
    {
      id: 'a.transform',
      priority: 10,
      wpBlockNames: ['core/paragraph'],
      canHandle: () => true,
      toCanonical: () => ({ blockKind: 'ep/paragraph' })
    }
  ]);

  const winner = resolveImportTransform(registry, { wpBlockName: 'core/paragraph', node: {} });
  assert.equal(winner.id, 'a.transform');
});

test('import apply falls back when no transform matches', () => {
  const registry = createImportTransformRegistry();
  const result = applyImportTransform(
    registry,
    { wpBlockName: 'core/unknown', node: { attrs: {} } },
    {
      createFallbackNode: ({ wpBlockName }) => ({
        blockKind: 'ep/unknown',
        lossiness: 'fallback',
        origin: { wpBlockName }
      })
    }
  );

  assert.equal(result.transformId, null);
  assert.equal(result.lossiness, 'fallback');
  assert.equal(result.canonicalNode.blockKind, 'ep/unknown');
});

test('renderer resolver supports explicit target fallback chain', () => {
  const registry = createRendererRegistry([
    {
      id: 'paragraph.preview',
      priority: 5,
      blockKinds: ['ep/paragraph'],
      targets: ['preview'],
      canHandle: () => true,
      render: () => '<p>preview</p>'
    }
  ]);

  const resolved = resolveRenderer(registry, {
    blockKind: 'ep/paragraph',
    target: 'editor',
    node: {}
  });

  assert.equal(resolved.renderer.id, 'paragraph.preview');
  assert.equal(resolved.targetUsed, 'preview');

  const rendered = applyRenderer(registry, {
    blockKind: 'ep/paragraph',
    target: 'editor',
    node: {}
  });
  assert.equal(rendered.rendererId, 'paragraph.preview');
  assert.equal(rendered.targetUsed, 'preview');
  assert.equal(rendered.output, '<p>preview</p>');
});

test('diagnostics report tracks counts and supports deterministic sorting', () => {
  const report = createDiagnosticsReport();
  addDiagnostic(report, {
    nodePath: ['root', '2'],
    originWpBlockName: 'core/image',
    transformId: null,
    lossiness: 'fallback',
    status: 'fallback'
  });
  addDiagnostic(report, {
    nodePath: ['root', '1'],
    originWpBlockName: 'core/paragraph',
    transformId: 'paragraph.transform',
    lossiness: 'none',
    status: 'transformed'
  });

  assert.equal(report.counts.fallback, 1);
  assert.equal(report.counts.transformed, 1);

  sortDiagnostics(report);
  assert.deepEqual(report.items.map((item) => item.nodePath.join('/')), ['root/1', 'root/2']);
});
