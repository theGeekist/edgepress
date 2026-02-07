import { Component, useEffect, useMemo, useRef, useState } from 'react';
import { SlotFillProvider, Popover } from '@wordpress/components';
import {
  BlockEditorKeyboardShortcuts,
  BlockEditorProvider,
  BlockInspector,
  Inserter,
  BlockList,
  BlockTools,
  ObserveTyping,
  WritingFlow
} from '@wordpress/block-editor';
import { createBlock, parse, serialize } from '@wordpress/blocks';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { toCssVars } from '@features/theme';
import './canvas.web.css';

const SUPPORTED_BLOCK_TYPES = [
  'core/paragraph',
  'core/heading',
  'core/image',
  'core/embed',
  'core/group',
  'core/columns',
  'core/column',
  'core/quote',
  'core/separator',
  'core/spacer'
];

const EDITOR_SETTINGS = {
  hasFixedToolbar: true,
  allowedBlockTypes: SUPPORTED_BLOCK_TYPES
};
const DEFAULT_PALETTE = {
  accent: '#2271b1',
  border: '#d5dbe8',
  surface: '#ffffff',
  surfaceMuted: '#f7fafc',
  text: '#0f172a',
  textMuted: '#475569',
  onAccent: '#ffffff'
};

export function EditorWorkspaceProvider({ blocks, setBlocks, children }) {
  return (
    <SlotFillProvider>
      <BlockEditorProvider
        value={blocks}
        onInput={(next) => setBlocks(next)}
        onChange={(next) => setBlocks(next)}
        settings={EDITOR_SETTINGS}
      >
        {children}
        <div id="ep-editor-popovers">
          <Popover.Slot />
        </div>
      </BlockEditorProvider>
    </SlotFillProvider>
  );
}

function BlockEditorCanvas({ title, onTitleChange }) {
  return (
    <>
      <BlockEditorKeyboardShortcuts />
      <BlockTools>
        <WritingFlow>
          <ObserveTyping>
            <div className="editor-styles-wrapper" style={{ minHeight: 680, width: '100%', pointerEvents: 'auto' }}>
              <div className="ep-editor-title-wrap">
                <input
                  className="ep-editor-title-input"
                  type="text"
                  value={title || ''}
                  placeholder="Add title"
                  onChange={(event) => onTitleChange?.(event.target.value)}
                />
              </div>
              <BlockList />
            </div>
          </ObserveTyping>
        </WritingFlow>
      </BlockTools>
    </>
  );
}

function toWpThemeVars(palette, themeVars = {}) {
  const p = palette || DEFAULT_PALETTE;
  return {
    ...themeVars,
    '--wp-admin-theme-color': p.accent,
    '--wp-admin-theme-color-darker-10': p.accent,
    '--wp-admin-theme-color-darker-20': p.accent,
    '--wp-components-color-accent': p.accent,
    '--wp-components-color-foreground': p.text,
    '--wp-components-color-background': p.surface,
    '--wp-components-color-gray-900': p.text,
    '--wp-components-color-gray-700': p.textMuted,
    '--wp-components-color-gray-300': p.border,
    '--wp-components-color-gray-100': p.surfaceMuted,
    '--wp-components-color-border': p.border
  };
}

function toFallbackText(blocks) {
  try {
    return serialize(Array.isArray(blocks) ? blocks : []);
  } catch {
    return '';
  }
}

function parseFallbackText(text) {
  try {
    return parse(text);
  } catch {
    return [];
  }
}

function FallbackEditor({ blocks, setBlocks, palette }) {
  const initial = useMemo(() => toFallbackText(blocks), [blocks]);
  const [raw, setRaw] = useState(initial);
  const isLocalUpdateRef = useRef(false);
  const localUpdateTimerRef = useRef(null);

  useEffect(() => {
    if (isLocalUpdateRef.current) {
      return;
    }
    setRaw(toFallbackText(blocks));
  }, [blocks]);

  useEffect(() => () => {
    if (localUpdateTimerRef.current) {
      clearTimeout(localUpdateTimerRef.current);
    }
  }, []);

  return (
    <View style={[styles.fallbackWrap, { borderColor: palette?.border || '#d5dbe8' }]}>
      <Text style={{ color: palette?.textMuted || '#475569', marginBottom: 8 }}>
        Rich block canvas unavailable. Editing source HTML fallback.
      </Text>
      <TextInput
        multiline
        value={raw}
        onChangeText={(next) => {
          isLocalUpdateRef.current = true;
          if (localUpdateTimerRef.current) {
            clearTimeout(localUpdateTimerRef.current);
          }
          localUpdateTimerRef.current = setTimeout(() => {
            isLocalUpdateRef.current = false;
            localUpdateTimerRef.current = null;
          }, 150);
          setRaw(next);
          setBlocks(parseFallbackText(next));
        }}
        style={[
          styles.fallbackInput,
          {
            borderColor: palette?.border || '#d5dbe8',
            color: palette?.text || '#0f172a',
            backgroundColor: palette?.surfaceMuted || '#f7fafc'
          }
        ]}
      />
    </View>
  );
}

class CanvasErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('Editor canvas crashed; falling back to source mode', error);
    if (typeof this.props.onError === 'function') {
      this.props.onError(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function EditorCanvas({ blocks, setBlocks, palette, theme, title, onTitleChange }) {
  const [mode, setMode] = useState('visual');
  const [visualFailed, setVisualFailed] = useState(false);
  const canUseVisual = !visualFailed;
  const p = palette || DEFAULT_PALETTE;
  const themeVars = useMemo(() => toCssVars(theme || {}, { prefix: '--ep' }), [theme]);
  useEffect(() => {
    if (mode !== 'visual') return;
    if (!Array.isArray(blocks) || blocks.length > 0) return;
    setBlocks([createBlock('core/paragraph')]);
  }, [mode, blocks, setBlocks]);

  return (
    <View style={styles.container}>
      <View style={styles.modeRow}>
        <Inserter
          renderToggle={({ onToggle }) => (
            <Pressable
              onPress={onToggle}
              style={({ pressed }) => [
                styles.modeBtn,
                {
                  backgroundColor: pressed ? p.surfaceMuted : 'transparent',
                  borderColor: p.accent
                }
              ]}
            >
              <Text style={{ color: p.accent, fontWeight: '700' }}>+</Text>
            </Pressable>
          )}
        />
        <Pressable
          onPress={() => setMode('source')}
          style={({ pressed }) => [
            styles.modeBtn,
            {
              backgroundColor: mode === 'source' ? p.accent : 'transparent',
              borderColor: p.border,
              opacity: pressed ? 0.8 : 1
            }
          ]}
        >
          <Text style={{ color: mode === 'source' ? p.onAccent : p.text, fontWeight: '500' }}>
            Source
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canUseVisual }}
          aria-disabled={!canUseVisual}
          onPress={() => {
            if (!canUseVisual) return;
            setMode('visual');
          }}
          style={({ pressed }) => [
            styles.modeBtn,
            {
              backgroundColor: mode === 'visual' ? p.accent : 'transparent',
              borderColor: p.border,
              opacity: canUseVisual ? (pressed ? 0.8 : 1) : 0.5
            }
          ]}
        >
          <Text style={{ color: mode === 'visual' ? p.onAccent : p.text, fontWeight: '500' }}>
            Visual
          </Text>
        </Pressable>
      </View>

      {/* Document Canvas Container */}
      <View style={[styles.canvasContainer, { backgroundColor: p.surfaceMuted }]}>
        {mode === 'source' ? (
          <FallbackEditor blocks={blocks} setBlocks={setBlocks} palette={p} />
        ) : (
          <CanvasErrorBoundary
            onError={() => {
              setVisualFailed(true);
              setMode('source');
            }}
            fallback={
              <FallbackEditor blocks={blocks} setBlocks={setBlocks} palette={p} />
            }
          >
            <View style={[styles.paperSheet, { backgroundColor: p.surface, shadowColor: p.text, borderColor: p.border }]}>
              <div className="ep-editor-canvas-root" style={toWpThemeVars(p, themeVars)}>
                <BlockEditorCanvas title={title} onTitleChange={onTitleChange} />
              </div>
            </View>
          </CanvasErrorBoundary>
        )}
      </View>

      {!canUseVisual ? (
        <Text style={{ color: p.textMuted, marginTop: 6 }}>
          Visual mode unavailable in this session; continue in Source mode.
        </Text>
      ) : null}
    </View>
  );
}

export function BlockInspectorPanel({ palette }) {
  const p = palette || DEFAULT_PALETTE;
  return (
    <div className="ep-editor-inspector-panel" style={toWpThemeVars(p)} aria-label="Block settings">
      <BlockInspector />
    </div>
  );
}

const BORDER_RADIUS = 4;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 12
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: 4
  },
  modeBtn: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center'
  },
  canvasContainer: {
    flex: 1,
    alignItems: 'stretch',
    paddingVertical: 0
  },
  paperSheet: {
    width: '100%',
    minHeight: 680,
    padding: 0,
    borderRadius: BORDER_RADIUS,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 20,
    borderWidth: 1
  },
  fallbackWrap: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS,
    padding: 20,
    minHeight: 680
  },
  fallbackInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS,
    minHeight: 500,
    padding: 16,
    textAlignVertical: 'top',
    fontSize: 14,
    fontFamily: 'monospace'
  }
});
