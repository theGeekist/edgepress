import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { palettePropTypes } from '@components/prop-types';

const LOSSINESS_COLORS = {
  none: '#22c55e',
  partial: '#eab308',
  fallback: '#f97316',
  unknown: '#ef4444'
};

function LossinessBadge({ lossiness }) {
  const color = LOSSINESS_COLORS[lossiness] || LOSSINESS_COLORS.unknown;
  return (
    <View style={[styles.badge, { backgroundColor: color }]} />
  );
}

LossinessBadge.propTypes = {
  lossiness: PropTypes.string
};

function BlockNode({
  wpBlock,
  canonicalNode,
  depth,
  index,
  isExpanded,
  isSelected,
  onToggleExpand,
  onSelect,
  palette
}) {
  const hasChildren = Array.isArray(wpBlock?.innerBlocks) && wpBlock.innerBlocks.length > 0;
  const nodeId = canonicalNode?.id || `block-${index}`;

  return (
    <View style={styles.nodeContainer}>
      <Pressable
        style={[
          styles.nodeRow,
          { paddingLeft: 12 + depth * 16 },
          isSelected && { backgroundColor: palette.accent + '20' }
        ]}
        onPress={() => onSelect(index)}
      >
        {hasChildren ? (
          <Pressable onPress={() => onToggleExpand(nodeId)} style={styles.expandButton}>
            <Text style={{ color: palette.textMuted, fontSize: 10 }}>
              {isExpanded ? '▼' : '▶'}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.expandPlaceholder} />
        )}

        <Text style={[styles.wpBlockName, { color: palette.textMuted }]}>
          {wpBlock?.name || 'unknown'}
        </Text>

        <Text style={[styles.arrow, { color: palette.border }]}>→</Text>

        <Text style={[styles.epBlockKind, { color: palette.text }]}>
          {canonicalNode?.blockKind || 'ep/unknown'}
        </Text>

        <LossinessBadge lossiness={canonicalNode?.lossiness} />
      </Pressable>

      {hasChildren && isExpanded && (
        <View style={styles.childrenContainer}>
          {wpBlock.innerBlocks.map((child, childIndex) => (
            <BlockNode
              key={child.clientId || `${nodeId}-${childIndex}`}
              wpBlock={child}
              canonicalNode={canonicalNode?.children?.[childIndex]}
              depth={depth + 1}
              index={`${index}.${childIndex}`}
              isExpanded={false}
              isSelected={false}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              palette={palette}
            />
          ))}
        </View>
      )}
    </View>
  );
}

BlockNode.propTypes = {
  wpBlock: PropTypes.object,
  canonicalNode: PropTypes.object,
  depth: PropTypes.number.isRequired,
  index: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  isExpanded: PropTypes.bool,
  isSelected: PropTypes.bool,
  onToggleExpand: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  palette: PropTypes.shape(palettePropTypes).isRequired
};

function DetailsPanel({ canonicalNode, palette }) {
  if (!canonicalNode) {
    return (
      <View style={[styles.detailsPanel, { borderColor: palette.border }]}>
        <Text style={{ color: palette.textMuted }}>Select a block to view details</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.detailsPanel, { borderColor: palette.border }]}>
      <Text style={[styles.detailsTitle, { color: palette.text }]}>
        {canonicalNode.blockKind}
      </Text>

      <View style={styles.detailsSection}>
        <Text style={[styles.detailsLabel, { color: palette.textMuted }]}>ID</Text>
        <Text style={[styles.detailsValue, { color: palette.text }]}>{canonicalNode.id}</Text>
      </View>

      <View style={styles.detailsSection}>
        <Text style={[styles.detailsLabel, { color: palette.textMuted }]}>Lossiness</Text>
        <View style={styles.lossinessRow}>
          <LossinessBadge lossiness={canonicalNode.lossiness} />
          <Text style={[styles.detailsValue, { color: palette.text }]}>
            {canonicalNode.lossiness || 'none'}
          </Text>
        </View>
      </View>

      <View style={styles.detailsSection}>
        <Text style={[styles.detailsLabel, { color: palette.textMuted }]}>Props</Text>
        <Text style={[styles.codeBlock, { backgroundColor: palette.surfaceMuted, color: palette.text }]}>
          {JSON.stringify(canonicalNode.props, null, 2)}
        </Text>
      </View>

      {canonicalNode.origin && (
        <View style={styles.detailsSection}>
          <Text style={[styles.detailsLabel, { color: palette.textMuted }]}>Origin</Text>
          <Text style={[styles.codeBlock, { backgroundColor: palette.surfaceMuted, color: palette.text }]}>
            {JSON.stringify(canonicalNode.origin, null, 2)}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

DetailsPanel.propTypes = {
  canonicalNode: PropTypes.object,
  palette: PropTypes.shape(palettePropTypes).isRequired
};

export function BlockTreeInspector({
  blocks,
  canonicalNodes,
  selectedBlockIndex,
  expandedNodes,
  onToggleExpand,
  onSelectBlock,
  palette
}) {
  const selectedCanonical = typeof selectedBlockIndex === 'number'
    ? canonicalNodes[selectedBlockIndex]
    : null;

  if (!blocks || blocks.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={{ color: palette.textMuted }}>No blocks to inspect</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.treeContainer}>
        {blocks.map((block, index) => (
          <BlockNode
            key={block.clientId || index}
            wpBlock={block}
            canonicalNode={canonicalNodes[index]}
            depth={0}
            index={index}
            isExpanded={expandedNodes.has(canonicalNodes[index]?.id)}
            isSelected={selectedBlockIndex === index}
            onToggleExpand={onToggleExpand}
            onSelect={onSelectBlock}
            palette={palette}
          />
        ))}
      </ScrollView>
      <DetailsPanel canonicalNode={selectedCanonical} palette={palette} />
    </View>
  );
}

BlockTreeInspector.propTypes = {
  blocks: PropTypes.array,
  canonicalNodes: PropTypes.array,
  selectedBlockIndex: PropTypes.number,
  expandedNodes: PropTypes.instanceOf(Set),
  onToggleExpand: PropTypes.func.isRequired,
  onSelectBlock: PropTypes.func.isRequired,
  palette: PropTypes.shape(palettePropTypes).isRequired
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row'
  },
  treeContainer: {
    flex: 1,
    minWidth: 300
  },
  nodeContainer: {
    flexDirection: 'column'
  },
  nodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 12,
    gap: 6
  },
  expandButton: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  expandPlaceholder: {
    width: 16
  },
  wpBlockName: {
    fontSize: 12,
    fontFamily: 'monospace'
  },
  arrow: {
    fontSize: 10
  },
  epBlockKind: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'monospace'
  },
  badge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6
  },
  childrenContainer: {
    marginLeft: 0
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  detailsPanel: {
    width: 280,
    borderLeftWidth: 1,
    padding: 12
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12
  },
  detailsSection: {
    marginBottom: 12
  },
  detailsLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4
  },
  detailsValue: {
    fontSize: 12
  },
  lossinessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  codeBlock: {
    fontSize: 11,
    fontFamily: 'monospace',
    padding: 8,
    borderRadius: 4,
    overflow: 'hidden'
  }
});
