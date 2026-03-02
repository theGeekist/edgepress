import { View, Text, Pressable, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { palettePropTypes } from '@components/prop-types';
import { BlockTreeInspector } from './BlockTreeInspector.jsx';
import { DiagnosticsInspector } from './DiagnosticsInspector.jsx';
import { TransformTracer } from './TransformTracer.jsx';
import { ThemeTokenInspector } from './ThemeTokenInspector.jsx';
import { useEditorBlocks } from './useDevToolsState.js';

const TAB_LABELS = {
  blocks: 'Blocks',
  diagnostics: 'Diagnostics',
  tracer: 'Tracer',
  tokens: 'Tokens'
};

function TabButton({ tabId, isActive, onPress, palette }) {
  return (
    <Pressable
      onPress={() => onPress(tabId)}
      style={[
        styles.tabButton,
        isActive && styles.tabButtonActive,
        {
          borderColor: isActive ? palette.accent : 'transparent',
          backgroundColor: isActive ? palette.surface : 'transparent'
        }
      ]}
    >
      <Text
        style={[
          styles.tabLabel,
          { color: isActive ? palette.accent : palette.textMuted }
        ]}
      >
        {TAB_LABELS[tabId] || tabId}
      </Text>
    </Pressable>
  );
}

TabButton.propTypes = {
  tabId: PropTypes.string.isRequired,
  isActive: PropTypes.bool,
  onPress: PropTypes.func.isRequired,
  palette: PropTypes.shape(palettePropTypes).isRequired
};

export function DevToolsPanel(props) {
  const {
    isOpen,
    onToggle,
    activeTab,
    onSelectTab,
    tabs,
    canonicalNodes,
    selectedBlockIndex,
    onSelectBlock,
    expandedNodes,
    onToggleExpand,
    diagnostics,
    tracerData,
    tracerStep,
    onTracerStepChange,
    onTracerPrev,
    onTracerNext,
    themeTokens,
    palette
  } = props;

  const blocks = useEditorBlocks(props);

  if (!isOpen) {
    return (
      <Pressable
        onPress={onToggle}
        style={[styles.toggleButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
      >
        <Text style={[styles.toggleText, { color: palette.textMuted }]}>
          DevTools (Ctrl+Shift+D)
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.container, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <View style={[styles.header, { borderColor: palette.border }]}>
        <View style={styles.tabsRow}>
          {tabs.map(tabId => (
            <TabButton
              key={tabId}
              tabId={tabId}
              isActive={activeTab === tabId}
              onPress={onSelectTab}
              palette={palette}
            />
          ))}
        </View>
        <Pressable onPress={onToggle} style={styles.closeButton}>
          <Text style={{ color: palette.textMuted, fontSize: 16 }}>×</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        {activeTab === 'blocks' && (
          <BlockTreeInspector
            blocks={blocks}
            canonicalNodes={canonicalNodes}
            selectedBlockIndex={selectedBlockIndex}
            expandedNodes={expandedNodes}
            onToggleExpand={onToggleExpand}
            onSelectBlock={onSelectBlock}
            palette={palette}
          />
        )}

        {activeTab === 'diagnostics' && (
          <DiagnosticsInspector
            diagnostics={diagnostics}
            palette={palette}
          />
        )}

        {activeTab === 'tracer' && (
          <TransformTracer
            tracerData={tracerData}
            tracerStep={tracerStep}
            onStepChange={onTracerStepChange}
            onPrev={onTracerPrev}
            onNext={onTracerNext}
            palette={palette}
          />
        )}

        {activeTab === 'tokens' && (
          <ThemeTokenInspector
            themeTokens={themeTokens}
            palette={palette}
          />
        )}
      </View>
    </View>
  );
}

DevToolsPanel.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  activeTab: PropTypes.string.isRequired,
  onSelectTab: PropTypes.func.isRequired,
  tabs: PropTypes.arrayOf(PropTypes.string).isRequired,
  blocks: PropTypes.array,
  canonicalNodes: PropTypes.array,
  selectedBlockIndex: PropTypes.number,
  onSelectBlock: PropTypes.func.isRequired,
  expandedNodes: PropTypes.instanceOf(Set),
  onToggleExpand: PropTypes.func.isRequired,
  diagnostics: PropTypes.object,
  tracerData: PropTypes.object,
  tracerStep: PropTypes.number.isRequired,
  onTracerStepChange: PropTypes.func.isRequired,
  onTracerPrev: PropTypes.func.isRequired,
  onTracerNext: PropTypes.func.isRequired,
  themeTokens: PropTypes.object,
  palette: PropTypes.shape(palettePropTypes).isRequired
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    height: 320,
    flexDirection: 'column'
  },
  toggleButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    zIndex: 100
  },
  toggleText: {
    fontSize: 11
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingHorizontal: 4
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 0
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 2
  },
  tabButtonActive: {
    borderBottomWidth: 2
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500'
  },
  closeButton: {
    padding: 8,
    marginRight: 4
  },
  content: {
    flex: 1
  }
});
