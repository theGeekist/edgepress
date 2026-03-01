import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { palettePropTypes } from '@components/prop-types';
import { useEditorBlocks } from './useDevToolsState.js';

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
  path,
  isExpanded,
  isSelected,
  onToggleExpand,
  onSelect,
  expandedNodes,
  selectedPath,
  palette
}) {
  const hasChildren = Array.isArray(wpBlock?.innerBlocks) && wpBlock.innerBlocks.length > 0;
  const nodeId = canonicalNode?.id || `block-${path}`;
  const topLevelIndex = Number.parseInt(String(path).split('.')[0] || '0', 10);

  return (
    <View style={styles.nodeContainer}>
      <Pressable
        style={[
          styles.nodeRow,
          { paddingLeft: 12 + depth * 16 },
          isSelected && { backgroundColor: palette.accent + '20' }
        ]}
        onPress={() => onSelect(path, topLevelIndex)}
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
          {wpBlock.innerBlocks.map((child, childIndex) => {
            const childPath = `${path}.${childIndex}`;
            const childNode = canonicalNode?.children?.[childIndex];
            const childNodeId = childNode?.id || `block-${childPath}`;
            return (
              <BlockNode
                key={child.clientId || childNodeId}
                wpBlock={child}
                canonicalNode={childNode}
                depth={depth + 1}
                path={childPath}
                isExpanded={expandedNodes.has(childNodeId)}
                isSelected={selectedPath === childPath}
                onToggleExpand={onToggleExpand}
                onSelect={onSelect}
                expandedNodes={expandedNodes}
                selectedPath={selectedPath}
                palette={palette}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

BlockNode.propTypes = {
  wpBlock: PropTypes.object,
  canonicalNode: PropTypes.object,
  depth: PropTypes.number.isRequired,
  path: PropTypes.string.isRequired,
  isExpanded: PropTypes.bool,
  isSelected: PropTypes.bool,
  onToggleExpand: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  expandedNodes: PropTypes.instanceOf(Set).isRequired,
  selectedPath: PropTypes.string,
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

export function BlockTreeInspector(props) {
  const {
    canonicalNodes = [],
    selectedBlockIndex,
    expandedNodes,
    onToggleExpand,
    onSelectBlock,
    palette
  } = props;

  const [selectedPath, setSelectedPath] = useState(null);
  const blocks = useEditorBlocks(props);
  const selectedCanonical = useMemo(() => {
    if (typeof selectedPath === 'string' && selectedPath.length > 0) {
      const segments = selectedPath
        .split('.')
        .map((part) => Number.parseInt(part, 10))
        .filter((part) => Number.isFinite(part));
      let cursor = canonicalNodes;
      let node = null;
      for (const segment of segments) {
        if (!Array.isArray(cursor) || segment < 0 || segment >= cursor.length) return null;
        node = cursor[segment] || null;
        cursor = node?.children;
      }
      return node;
    }
    return typeof selectedBlockIndex === 'number' ? canonicalNodes[selectedBlockIndex] : null;
  }, [canonicalNodes, selectedBlockIndex, selectedPath]);

  const blockCount = blocks.length;

  if (blockCount === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={{ color: palette.textMuted }}>No blocks to inspect</Text>
      </View>
    );
  }

  const countLabel = `${blockCount} block${blockCount === 1 ? '' : 's'} to inspect`;

  return (
    <View style={styles.container}>
      <View style={styles.treeContainer}>
        <View style={[styles.inspectorHeader, { borderBottomColor: palette.border }]}>
          <Text style={[styles.countText, { color: palette.textMuted }]}>
            {countLabel}
          </Text>
        </View>
        <ScrollView style={styles.treeScroll}>
          {blocks.map((block, index) => {
            const path = String(index);
            const nodeId = canonicalNodes[index]?.id || `block-${path}`;
            return (
              <BlockNode
                key={block.clientId || nodeId}
                wpBlock={block}
                canonicalNode={canonicalNodes[index]}
                depth={0}
                path={path}
                isExpanded={expandedNodes.has(nodeId)}
                isSelected={selectedPath === path}
                onToggleExpand={onToggleExpand}
                onSelect={(nextPath, topLevelIndex) => {
                  setSelectedPath(nextPath);
                  onSelectBlock(topLevelIndex);
                }}
                expandedNodes={expandedNodes}
                selectedPath={selectedPath}
                palette={palette}
              />
            );
          })}
        </ScrollView>
      </View>
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
    minWidth: 300,
    flexDirection: 'column'
  },
  inspectorHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  treeScroll: {
    flex: 1
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
