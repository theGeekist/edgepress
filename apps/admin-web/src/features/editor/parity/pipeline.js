import { normalizeCanonicalNode } from './canonical.js';
import { addDiagnostic, createDiagnosticsReport, sortDiagnostics } from './diagnostics.js';
import { applyImportTransform, applyRenderer } from './resolver.js';
import { createUnknownCanonicalNode } from './fallback.js';

function normalizeWpNode(node) {
  return {
    name: String(node?.name || ''),
    attributes: node?.attributes && typeof node.attributes === 'object' ? node.attributes : {},
    innerBlocks: Array.isArray(node?.innerBlocks) ? node.innerBlocks : [],
    innerHTML: typeof node?.innerHTML === 'string' ? node.innerHTML : '',
    innerContent: Array.isArray(node?.innerContent) ? node.innerContent : []
  };
}

function importOne({ node, importRegistry, context, path, report }) {
  const wpNode = normalizeWpNode(node);
  const result = applyImportTransform(
    importRegistry,
    { wpBlockName: wpNode.name, node: wpNode, context },
    { createFallbackNode: ({ wpBlockName, node: original }) => createUnknownCanonicalNode({ wpBlockName, node: original }) }
  );

  const importedChildren = wpNode.innerBlocks.map((child, index) => importOne({
    node: child,
    importRegistry,
    context,
    path: [...path, index],
    report
  }));

  const normalized = normalizeCanonicalNode({
    ...(result.canonicalNode || createUnknownCanonicalNode({ wpBlockName: wpNode.name, node: wpNode })),
    children: importedChildren
  }, path);

  addDiagnostic(report, {
    nodePath: [normalized.id],
    originWpBlockName: wpNode.name,
    transformId: result.transformId,
    lossiness: normalized.lossiness,
    status: normalized.lossiness === 'fallback' ? 'fallback' : normalized.lossiness === 'partial' ? 'partial' : 'transformed'
  });

  return normalized;
}

export function importWpBlocksToCanonical({ blocks, importRegistry, context = {} }) {
  const report = createDiagnosticsReport();
  const roots = Array.isArray(blocks) ? blocks : [];
  const nodes = roots.map((node, index) => importOne({
    node,
    importRegistry,
    context,
    path: [index],
    report
  }));

  return {
    nodes,
    diagnostics: sortDiagnostics(report)
  };
}

function renderOne({ node, rendererRegistry, target, context, report, path }) {
  const renderedChildren = (Array.isArray(node.children) ? node.children : []).map((child, index) => renderOne({
    node: child,
    rendererRegistry,
    target,
    context,
    report,
    path: [...path, child.id || String(index)]
  }));

  const rendered = applyRenderer(rendererRegistry, {
    blockKind: node.blockKind,
    target,
    node,
    context: {
      ...context,
      renderedChildren
    }
  });

  addDiagnostic(report, {
    nodePath: path,
    originWpBlockName: String(node?.origin?.wpBlockName || ''),
    transformId: rendered.rendererId,
    lossiness: node.lossiness || 'none',
    status: rendered.rendererId ? 'transformed' : 'unsupported',
    code: rendered.rendererId ? 'RENDERED' : 'RENDERER_MISSING'
  });

  if (target === 'editor') {
    return rendered.output || {
      kind: 'unknown',
      blockKind: node.blockKind,
      children: renderedChildren
    };
  }

  if (!rendered.output) {
    return '';
  }
  return typeof rendered.output === 'string' ? rendered.output : String(rendered.output || '');
}

export function renderCanonicalNodes({ nodes, rendererRegistry, target = 'publish', context = {} }) {
  const report = createDiagnosticsReport();
  const roots = Array.isArray(nodes) ? nodes : [];
  const outputs = roots.map((node, index) => renderOne({
    node,
    rendererRegistry,
    target,
    context,
    report,
    path: [node?.id || `epn_${index}`]
  }));

  const output = target === 'editor'
    ? outputs
    : outputs.join('');

  return {
    output,
    diagnostics: sortDiagnostics(report)
  };
}
