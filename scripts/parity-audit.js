import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizeBlocksInput } from '../packages/domain/src/blocks.js';
import {
  createImportTransformRegistry,
  corePackImportTransforms,
  corePackManifest,
  importWpBlocksToCanonical,
  resolveImportTransform
} from '../apps/admin-web/src/features/editor/parity/index.js';

const EXIT_OK = 0;
const EXIT_AUDIT_ISSUES = 1;
const EXIT_USAGE_ERROR = 2;

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function walkWpBlocks(blocks, visitor, pathPrefix = []) {
  const nodes = Array.isArray(blocks) ? blocks : [];
  for (let index = 0; index < nodes.length; index += 1) {
    const block = nodes[index];
    const nodePath = [...pathPrefix, index];
    visitor(block, nodePath);
    if (Array.isArray(block?.innerBlocks) && block.innerBlocks.length > 0) {
      walkWpBlocks(block.innerBlocks, visitor, nodePath);
    }
  }
}

function walkCanonicalNodes(nodes, visitor, pathPrefix = []) {
  const list = Array.isArray(nodes) ? nodes : [];
  for (let index = 0; index < list.length; index += 1) {
    const node = list[index];
    const key = String(node?.id || index);
    const nodePath = [...pathPrefix, key];
    visitor(node, nodePath);
    if (Array.isArray(node?.children) && node.children.length > 0) {
      walkCanonicalNodes(node.children, visitor, nodePath);
    }
  }
}

function looksLikeNavigationAttributes(attributes) {
  const attrs = isPlainObject(attributes) ? attributes : {};
  return (
    typeof attrs.menuId === 'string'
    || typeof attrs.ref === 'string'
    || typeof attrs.showSubmenuIndicators === 'boolean'
    || typeof attrs.showSubmenuIcon === 'boolean'
    || (isPlainObject(attrs.layout) && typeof attrs.layout.orientation === 'string')
  );
}

function summarizeIssues(diagnostics, status) {
  const items = new Map();
  const list = Array.isArray(diagnostics?.items) ? diagnostics.items : [];

  for (const item of list) {
    if (item?.status !== status) continue;
    const key = item.code ? `code:${item.code}` : `message:${item.message || 'unspecified'}`;
    const previous = items.get(key) || {
      status,
      code: item.code || '',
      message: item.message || '',
      count: 0
    };
    previous.count += 1;
    items.set(key, previous);
  }

  return Array.from(items.values()).sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
}

function toPercent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 10000) / 100;
}

function parseJsonFile(text, filePath) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON in '${filePath}': ${error.message}`);
  }
}

function extractBlocksFromExport(payload, filePath) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.blocks)) return payload.blocks;
  if (Array.isArray(payload?.document?.blocks)) return payload.document.blocks;

  if (Array.isArray(payload?.documents)) {
    const merged = [];
    for (const [index, entry] of payload.documents.entries()) {
      if (!Array.isArray(entry?.blocks)) {
        throw new Error(`Document ${index} in '${filePath}' is missing blocks[]`);
      }
      merged.push(...entry.blocks);
    }
    return merged;
  }

  throw new Error(
    `Unsupported export shape in '${filePath}'. Expected blocks[] at root, document.blocks, or documents[].blocks.`
  );
}

async function loadBlocksFromFiles(filePaths) {
  const collected = [];
  for (const filePath of filePaths) {
    const raw = await readFile(filePath, 'utf8');
    const payload = parseJsonFile(raw, filePath);
    const blocks = extractBlocksFromExport(payload, filePath);
    const normalized = normalizeBlocksInput(blocks);
    collected.push(...normalized);
  }
  return collected;
}

export function auditBlocks({ blocks, importRegistry }) {
  const blockTypeCounts = {};
  const navigationWpMatches = [];
  const wpNavigationByAttributes = [];

  walkWpBlocks(blocks, (block, pathParts) => {
    const name = String(block?.name || '');
    blockTypeCounts[name] = (blockTypeCounts[name] || 0) + 1;

    const byName = name === 'core/navigation';
    const byAttributes = looksLikeNavigationAttributes(block?.attributes);
    if (byName || byAttributes) {
      const match = {
        path: pathParts.join('.'),
        name,
        matchedBy: byName ? 'name' : 'attributes'
      };
      navigationWpMatches.push(match);
      if (!byName && byAttributes) {
        wpNavigationByAttributes.push(match);
      }
    }
  });

  const transformed = importWpBlocksToCanonical({ blocks, importRegistry });
  const canonicalNavigation = [];
  walkCanonicalNodes(transformed.nodes, (node, pathParts) => {
    if (node?.blockKind !== 'ep/navigation') return;
    canonicalNavigation.push({
      id: String(node.id || ''),
      path: pathParts.join('/'),
      menuId: String(node?.props?.menuId || ''),
      lossiness: String(node?.lossiness || 'none')
    });
  });

  const diagnostics = transformed.diagnostics;
  const totalBlocks = Object.values(blockTypeCounts).reduce((sum, count) => sum + count, 0);

  return {
    totalBlocks,
    uniqueBlockTypes: Object.keys(blockTypeCounts).sort(),
    blockTypeCounts,
    navigation: {
      wpMatches: navigationWpMatches,
      wpByAttributes: wpNavigationByAttributes,
      canonicalMatches: canonicalNavigation
    },
    lossiness: {
      transformed: diagnostics.counts.transformed,
      partial: diagnostics.counts.partial,
      fallback: diagnostics.counts.fallback,
      unsupported: diagnostics.counts.unsupported,
      partialIssues: summarizeIssues(diagnostics, 'partial'),
      fallbackIssues: summarizeIssues(diagnostics, 'fallback')
    },
    diagnostics
  };
}

export function auditTransforms({ blocks, importRegistry, supportedWpBlockNames = [] }) {
  const uniqueSeen = new Set();
  const mappedUnique = new Set();
  const missingUnique = new Set();
  const perBlock = [];

  walkWpBlocks(blocks, (block, pathParts) => {
    const wpBlockName = String(block?.name || '').trim();
    if (!wpBlockName) return;

    uniqueSeen.add(wpBlockName);
    const winner = resolveImportTransform(importRegistry, { wpBlockName, node: block, context: {} });
    const entry = {
      path: pathParts.join('.'),
      wpBlockName,
      transformId: winner?.id || null,
      mapped: Boolean(winner)
    };
    perBlock.push(entry);

    if (winner) {
      mappedUnique.add(wpBlockName);
    } else {
      missingUnique.add(wpBlockName);
    }
  });

  const registryDeclared = new Set();
  for (const entry of importRegistry.getAll()) {
    for (const wpBlockName of entry.wpBlockNames) {
      registryDeclared.add(String(wpBlockName));
    }
  }

  const supportedSet = new Set(supportedWpBlockNames.map((name) => String(name)));
  const supportedWithoutTransform = Array.from(supportedSet)
    .filter((name) => !registryDeclared.has(name))
    .sort();

  const missingMappings = Array.from(missingUnique)
    .sort()
    .map((wpBlockName) => {
      const occurrences = perBlock.filter((entry) => entry.wpBlockName === wpBlockName);
      return {
        wpBlockName,
        occurrences: occurrences.length,
        examplePath: occurrences[0]?.path || ''
      };
    });

  const totalUnique = uniqueSeen.size;
  const mappedUniqueCount = mappedUnique.size;

  return {
    totalUniqueBlockTypes: totalUnique,
    mappedUniqueBlockTypes: mappedUniqueCount,
    missingUniqueBlockTypes: missingMappings.length,
    mappingCoveragePercent: toPercent(mappedUniqueCount, totalUnique),
    supportedDeclaredCount: supportedSet.size,
    registryDeclaredCount: registryDeclared.size,
    supportedWithoutTransform,
    missingMappings,
    perBlock
  };
}

function buildRecommendations(result) {
  const recommendations = [];
  const missing = result.transformAudit.missingMappings;
  if (missing.length > 0) {
    const top = missing
      .slice()
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 5)
      .map((entry) => `${entry.wpBlockName} (${entry.occurrences})`)
      .join(', ');
    recommendations.push(`Add import transforms for unmapped blocks first: ${top}.`);
  }

  if (result.blockAudit.lossiness.partial > 0) {
    recommendations.push('Document each partial lossiness diagnostic code with reason and expected tradeoff.');
  }

  if (result.blockAudit.lossiness.fallback > 0) {
    recommendations.push('Review fallback nodes to confirm origin payload preserves recoverable data for future transforms.');
  }

  if ((result.blockAudit.navigation?.wpByAttributes || []).length > 0) {
    recommendations.push('Normalize navigation exports so navigation intent is explicit with core/navigation block names.');
  }

  if (result.transformAudit.supportedWithoutTransform.length > 0) {
    recommendations.push('Align corePackManifest.supportedWpBlockNames with actual transform coverage to avoid stale declarations.');
  }

  if (recommendations.length === 0) {
    recommendations.push('No immediate parity gaps detected in provided sample exports.');
  }

  return recommendations;
}

export function generateReport(result) {
  const lines = [];
  lines.push('Parity Audit Report');
  lines.push('===================');
  lines.push('');
  lines.push('Summary');
  lines.push('-------');
  lines.push(`Total blocks scanned: ${result.blockAudit.totalBlocks}`);
  lines.push(`Unique block types: ${result.transformAudit.totalUniqueBlockTypes}`);
  lines.push(`Mapping coverage: ${result.transformAudit.mappingCoveragePercent.toFixed(2)}%`);
  lines.push(`Canonical navigation nodes: ${result.blockAudit.navigation.canonicalMatches.length}`);
  lines.push('');
  lines.push('Block Coverage');
  lines.push('--------------');
  lines.push(`Mapped block types: ${result.transformAudit.mappedUniqueBlockTypes}`);
  lines.push(`Missing block types: ${result.transformAudit.missingUniqueBlockTypes}`);
  lines.push(`Partial diagnostics: ${result.blockAudit.lossiness.partial}`);
  lines.push(`Fallback diagnostics: ${result.blockAudit.lossiness.fallback}`);
  lines.push('');
  lines.push('Missing Mappings');
  lines.push('----------------');

  if (result.transformAudit.missingMappings.length === 0) {
    lines.push('None.');
  } else {
    for (const item of result.transformAudit.missingMappings) {
      lines.push(`- ${item.wpBlockName}: ${item.occurrences} occurrence(s), example path ${item.examplePath}`);
    }
  }

  lines.push('');
  lines.push('Recommendations');
  lines.push('---------------');
  for (const recommendation of buildRecommendations(result)) {
    lines.push(`- ${recommendation}`);
  }

  return lines.join('\n');
}

function printReportTables(result) {
  console.table(
    Object.entries(result.blockAudit.blockTypeCounts)
      .map(([wpBlockName, count]) => ({ wpBlockName, count }))
      .sort((a, b) => b.count - a.count || a.wpBlockName.localeCompare(b.wpBlockName))
  );

  if (result.transformAudit.missingMappings.length > 0) {
    console.table(result.transformAudit.missingMappings);
  }

  const partialIssues = result.blockAudit.lossiness.partialIssues;
  if (partialIssues.length > 0) {
    console.table(partialIssues.map((issue) => ({
      status: issue.status,
      code: issue.code || '(none)',
      message: issue.message || '(none)',
      count: issue.count
    })));
  }
}

export async function audit(filePaths, options = {}) {
  const files = Array.isArray(filePaths) ? filePaths : [];
  if (files.length === 0) {
    throw new Error('No export files provided.');
  }

  const blocks = await loadBlocksFromFiles(files);
  const importRegistry = createImportTransformRegistry(corePackImportTransforms);
  const blockAudit = auditBlocks({ blocks, importRegistry });
  const transformAudit = auditTransforms({
    blocks,
    importRegistry,
    supportedWpBlockNames: corePackManifest.supportedWpBlockNames
  });

  const result = {
    files,
    generatedAt: new Date().toISOString(),
    blockAudit,
    transformAudit
  };

  if (options.output !== 'silent') {
    console.log(JSON.stringify(result, null, 2));
  }

  const hasIssues = transformAudit.missingMappings.length > 0 || blockAudit.lossiness.fallback > 0;
  return {
    result,
    exitCode: hasIssues ? EXIT_AUDIT_ISSUES : EXIT_OK
  };
}

export async function report(filePaths, options = {}) {
  const audited = await audit(filePaths, { output: 'silent' });
  const text = generateReport(audited.result);

  if (options.output !== 'silent') {
    console.log(text);
    console.log('');
    printReportTables(audited.result);
  }

  return {
    text,
    result: audited.result,
    exitCode: audited.exitCode
  };
}

function usage() {
  return [
    'Usage:',
    '  bun scripts/parity-audit.js audit <export.json> [more-exports.json...]',
    '  bun scripts/parity-audit.js report <export.json> [more-exports.json...]',
    '',
    'Commands:',
    '  audit   Emit structured JSON diagnostics for provided export files.',
    '  report  Emit formatted report + tables for provided export files.',
    '',
    'Notes:',
    '  - Input must contain blocks[] at root, document.blocks, or documents[].blocks.',
    '  - Exit code 1 means audit findings include missing mappings or fallback cases.',
    '  - Exit code 2 indicates usage or input errors.'
  ].join('\n');
}

function parseCliArgs(argv) {
  const args = Array.isArray(argv) ? argv : [];
  const command = args[0] || '';
  const fileArgs = args.slice(1).filter(Boolean);
  return { command, fileArgs };
}

async function runCli(argv) {
  const { command, fileArgs } = parseCliArgs(argv);

  if (!command || command === '--help' || command === '-h' || command === 'help') {
    console.log(usage());
    return EXIT_OK;
  }

  if (!['audit', 'report'].includes(command)) {
    console.error(`Unknown command '${command}'.`);
    console.error('');
    console.error(usage());
    return EXIT_USAGE_ERROR;
  }

  if (fileArgs.length === 0) {
    console.error('No export files supplied.');
    console.error('');
    console.error(usage());
    return EXIT_USAGE_ERROR;
  }

  try {
    if (command === 'audit') {
      const output = await audit(fileArgs);
      return output.exitCode;
    }

    const output = await report(fileArgs);
    return output.exitCode;
  } catch (error) {
    console.error(`parity-audit failed: ${error.message}`);
    return EXIT_USAGE_ERROR;
  }
}

const thisFilePath = fileURLToPath(import.meta.url);
const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (entryPath && entryPath === thisFilePath) {
  runCli(process.argv.slice(2)).then((code) => {
    process.exit(code);
  });
}

if (typeof module !== 'undefined') {
  module.exports = { audit, report };
}
