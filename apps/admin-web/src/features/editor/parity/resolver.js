function includesOrAll(values, needle) {
  if (!Array.isArray(values) || values.length === 0) {
    return true;
  }
  return values.includes(needle);
}

function normalizeTarget(value) {
  const target = String(value || '').trim();
  if (target === 'editor' || target === 'preview' || target === 'publish') {
    return target;
  }
  return 'publish';
}

export function getRendererFallbackTargets(target) {
  const normalized = normalizeTarget(target);
  if (normalized === 'editor') return ['editor', 'preview', 'publish'];
  if (normalized === 'preview') return ['preview', 'publish'];
  return ['publish'];
}

export function resolveImportTransform(registry, { wpBlockName, node, context = {} }) {
  const normalizedWpBlockName = String(wpBlockName || '').trim();
  const candidates = registry
    .getAll()
    .filter((entry) => includesOrAll(entry.wpBlockNames, normalizedWpBlockName))
    .filter((entry) => {
      try {
        return Boolean(entry.canHandle({ wpBlockName: normalizedWpBlockName, node, context }));
      } catch {
        return false;
      }
    });
  return candidates[0] || null;
}

export function resolveRenderer(registry, { blockKind, target, node, context = {} }) {
  const normalizedBlockKind = String(blockKind || '').trim();
  const candidates = registry.getAll().filter((entry) => includesOrAll(entry.blockKinds, normalizedBlockKind));

  for (const candidateTarget of getRendererFallbackTargets(target)) {
    const winner = candidates
      .filter((entry) => includesOrAll(entry.targets, candidateTarget))
      .find((entry) => {
        try {
          return Boolean(entry.canHandle({ target: candidateTarget, node, context }));
        } catch {
          return false;
        }
      });
    if (winner) {
      return { renderer: winner, targetUsed: candidateTarget };
    }
  }

  return { renderer: null, targetUsed: null };
}

export function applyImportTransform(registry, input, { createFallbackNode } = {}) {
  const winner = resolveImportTransform(registry, input);
  if (!winner) {
    if (typeof createFallbackNode !== 'function') {
      return { canonicalNode: null, transformId: null, lossiness: 'fallback' };
    }
    return {
      canonicalNode: createFallbackNode(input),
      transformId: null,
      lossiness: 'fallback'
    };
  }
  const canonicalNode = winner.toCanonical(input);
  return {
    canonicalNode,
    transformId: winner.id,
    lossiness: canonicalNode?.lossiness || 'none'
  };
}

export function applyRenderer(registry, input) {
  const { renderer, targetUsed } = resolveRenderer(registry, input);
  if (!renderer) {
    return { output: null, rendererId: null, targetUsed: null };
  }
  return {
    output: renderer.render({ ...input, target: targetUsed }),
    rendererId: renderer.id,
    targetUsed
  };
}
