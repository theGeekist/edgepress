export function createUnknownCanonicalNode({ wpBlockName, node, reason = 'UNSUPPORTED_BLOCK' }) {
  const attributes = node?.attributes && typeof node.attributes === 'object' ? node.attributes : {};
  const hasRawSlice = typeof node?.originalContent === 'string' && node.originalContent.length > 0;
  return {
    blockKind: 'ep/unknown',
    props: {
      reason,
      rawSourceSlice: hasRawSlice ? node.originalContent : '',
      innerHTML: typeof node?.innerHTML === 'string' ? node.innerHTML : '',
      innerContent: Array.isArray(node?.innerContent) ? node.innerContent : [],
      rawInnerBlocks: Array.isArray(node?.innerBlocks) ? node.innerBlocks : []
    },
    origin: {
      wpBlockName: String(wpBlockName || ''),
      attrs: attributes
    },
    lossiness: 'fallback',
    children: []
  };
}
