import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';

import {
  audit,
  report,
  auditBlocks,
  auditTransforms,
  generateReport
} from './parity-audit.js';
import {
  createImportTransformRegistry,
  corePackImportTransforms,
  corePackManifest
} from '../apps/admin-web/src/features/editor/parity/index.js';

async function withTempDir(run) {
  const dir = await mkdtemp(path.join(tmpdir(), 'parity-audit-'));
  try {
    return await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('auditBlocks detects navigation blocks and canonical navigation nodes', () => {
  const importRegistry = createImportTransformRegistry(corePackImportTransforms);
  const blocks = [
    {
      name: 'core/navigation',
      attributes: { menuId: 'menu_primary' },
      innerBlocks: []
    },
    {
      name: 'core/group',
      attributes: { menuId: 'legacy_menu', layout: { orientation: 'vertical' } },
      innerBlocks: []
    }
  ];

  const output = auditBlocks({ blocks, importRegistry });
  assert.equal(output.totalBlocks, 2);
  assert.equal(output.navigation.wpMatches.length, 2);
  assert.equal(output.navigation.wpByAttributes.length, 1);
  assert.equal(output.navigation.canonicalMatches.length, 1);
});

test('auditTransforms reports missing block mappings and coverage', () => {
  const importRegistry = createImportTransformRegistry(corePackImportTransforms);
  const blocks = [
    { name: 'core/paragraph', attributes: { content: 'ok' }, innerBlocks: [] },
    { name: 'core/unsupported', attributes: {}, innerBlocks: [] }
  ];

  const output = auditTransforms({
    blocks,
    importRegistry,
    supportedWpBlockNames: corePackManifest.supportedWpBlockNames
  });

  assert.equal(output.totalUniqueBlockTypes, 2);
  assert.equal(output.mappedUniqueBlockTypes, 1);
  assert.equal(output.missingMappings.length, 1);
  assert.equal(output.missingMappings[0].wpBlockName, 'core/unsupported');
  assert.equal(output.mappingCoveragePercent, 50);
});

test('report command returns formatted sections and non-zero on gaps', async () => {
  await withTempDir(async (dir) => {
    const exportPath = path.join(dir, 'sample-export.json');
    await writeFile(exportPath, JSON.stringify({
      blocks: [
        { name: 'core/paragraph', attributes: { content: 'hello' }, innerBlocks: [] },
        { name: 'core/unsupported', attributes: {}, innerBlocks: [] }
      ]
    }, null, 2));

    const output = await report([exportPath], { output: 'silent' });
    assert.equal(output.exitCode, 1);
    assert.ok(output.text.includes('Summary'));
    assert.ok(output.text.includes('Block Coverage'));
    assert.ok(output.text.includes('Missing Mappings'));
    assert.ok(output.text.includes('Recommendations'));
    assert.ok(output.text.includes('core/unsupported'));
  });
});

test('audit supports documents[].blocks export shape', async () => {
  await withTempDir(async (dir) => {
    const exportPath = path.join(dir, 'multi-doc-export.json');
    await writeFile(exportPath, JSON.stringify({
      documents: [
        {
          blocks: [
            { name: 'core/paragraph', attributes: { content: 'first' }, innerBlocks: [] }
          ]
        },
        {
          blocks: [
            { name: 'core/image', attributes: { id: 1 }, innerBlocks: [] }
          ]
        }
      ]
    }, null, 2));

    const output = await audit([exportPath], { output: 'silent' });
    assert.equal(output.result.blockAudit.totalBlocks, 2);
    assert.equal(output.exitCode, 0);
  });
});

test('generateReport includes None when missing mappings are empty', () => {
  const rendered = generateReport({
    blockAudit: {
      totalBlocks: 1,
      navigation: { canonicalMatches: [] },
      lossiness: { partial: 0, fallback: 0 },
      blockTypeCounts: { 'core/paragraph': 1 }
    },
    transformAudit: {
      totalUniqueBlockTypes: 1,
      mappingCoveragePercent: 100,
      mappedUniqueBlockTypes: 1,
      missingUniqueBlockTypes: 0,
      missingMappings: [],
      supportedWithoutTransform: []
    }
  });

  assert.ok(rendered.includes('Missing Mappings'));
  assert.ok(rendered.includes('None.'));
});
