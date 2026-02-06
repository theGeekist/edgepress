import { Component, useEffect, useMemo, useRef, useState } from 'react';
import { SlotFillProvider, Popover } from '@wordpress/components';
import {
  BlockCanvas,
  BlockEditorKeyboardShortcuts,
  BlockEditorProvider,
  BlockTools,
  ObserveTyping,
  WritingFlow
} from '@wordpress/block-editor';
import { createBlock, parse, serialize } from '@wordpress/blocks';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const EDITOR_SETTINGS = {};
const DEFAULT_PALETTE = {
  accent: '#2271b1',
  border: '#d5dbe8',
  surface: '#ffffff',
  surfaceMuted: '#f7fafc',
  text: '#0f172a',
  textMuted: '#475569',
  onAccent: '#ffffff'
};

function BlockEditorCanvas({ blocks, setBlocks }) {
  return (
    <SlotFillProvider>
      <BlockEditorProvider
        value={blocks}
        onInput={(next) => setBlocks(next)}
        onChange={(next) => setBlocks(next)}
        settings={EDITOR_SETTINGS}
      >
        <div className="editor-styles-wrapper" style={{ minHeight: 680, width: '100%', pointerEvents: 'auto' }}>
          <BlockEditorKeyboardShortcuts />
          <BlockTools>
            <WritingFlow>
              <ObserveTyping>
                <BlockCanvas height="680px" />
              </ObserveTyping>
            </WritingFlow>
          </BlockTools>
        </div>
        <Popover.Slot />
      </BlockEditorProvider>
    </SlotFillProvider>
  );
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

export function EditorCanvas({ blocks, setBlocks, palette }) {
  const [mode, setMode] = useState('visual');
  const [visualFailed, setVisualFailed] = useState(false);
  const canUseVisual = !visualFailed;
  const p = palette || DEFAULT_PALETTE;

  function appendParagraphBlock() {
    setBlocks([...(Array.isArray(blocks) ? blocks : []), createBlock('core/paragraph')]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.modeRow}>
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
        {/* Spacer */}
        <View style={{ flex: 1 }} />

        <Pressable
          onPress={appendParagraphBlock}
          style={({ pressed }) => [
            styles.modeBtn,
            { backgroundColor: pressed ? p.surfaceMuted : 'transparent', borderColor: p.accent }
          ]}
        >
          <Text style={{ color: p.accent, fontWeight: '600' }}>+ Paragraph</Text>
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
            <View style={[styles.paperSheet, { backgroundColor: p.surface, shadowColor: p.text }]}>
              <BlockEditorCanvas blocks={blocks} setBlocks={setBlocks} />
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
    paddingVertical: 20
  },
  paperSheet: {
    width: '100%',
    minHeight: 680,
    padding: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)'
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
