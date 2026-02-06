export function normalizePublishProvenanceInput(input = {}) {
  const sourceRevisionId =
    typeof input?.sourceRevisionId === 'string' && input.sourceRevisionId.trim()
      ? input.sourceRevisionId.trim()
      : null;

  if (input?.sourceRevisionSet !== undefined && input.sourceRevisionSet !== null && !Array.isArray(input.sourceRevisionSet)) {
    throw new Error('sourceRevisionSet must be an array of revision ids');
  }

  const sourceRevisionSet = [];
  for (const entry of input?.sourceRevisionSet || []) {
    if (typeof entry !== 'string' || !entry.trim()) {
      throw new Error('sourceRevisionSet must contain non-empty strings');
    }
    const normalized = entry.trim();
    if (!sourceRevisionSet.includes(normalized)) {
      sourceRevisionSet.push(normalized);
    }
  }

  if (sourceRevisionId && !sourceRevisionSet.includes(sourceRevisionId)) {
    sourceRevisionSet.unshift(sourceRevisionId);
  }

  const canonicalSourceRevisionId = sourceRevisionId || sourceRevisionSet[0] || null;
  return {
    sourceRevisionId: canonicalSourceRevisionId,
    sourceRevisionSet: sourceRevisionSet.length ? sourceRevisionSet : null
  };
}
