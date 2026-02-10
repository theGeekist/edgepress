function normalizeNodePath(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry || '')).filter(Boolean);
}

function normalizeLossiness(value) {
  if (value === 'partial' || value === 'fallback') return value;
  return 'none';
}

function normalizeStatus(value) {
  if (value === 'fallback' || value === 'unsupported' || value === 'partial') {
    return value;
  }
  return 'transformed';
}

export function createDiagnosticsReport() {
  return {
    items: [],
    counts: {
      transformed: 0,
      partial: 0,
      fallback: 0,
      unsupported: 0
    }
  };
}

export function addDiagnostic(report, input) {
  const next = report || createDiagnosticsReport();
  const status = normalizeStatus(input?.status);
  const item = {
    nodePath: normalizeNodePath(input?.nodePath),
    originWpBlockName: String(input?.originWpBlockName || '').trim(),
    transformId: input?.transformId ? String(input.transformId) : null,
    lossiness: normalizeLossiness(input?.lossiness),
    status,
    code: input?.code ? String(input.code) : '',
    message: input?.message ? String(input.message) : ''
  };
  next.items.push(item);
  next.counts[status] += 1;
  return next;
}

export function sortDiagnostics(report) {
  const next = report || createDiagnosticsReport();
  next.items.sort((a, b) => {
    const aPath = a.nodePath.join('/');
    const bPath = b.nodePath.join('/');
    if (aPath !== bPath) return aPath.localeCompare(bPath);
    return String(a.transformId || '').localeCompare(String(b.transformId || ''));
  });
  return next;
}
