import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { SlotFillProvider, Popover } from '@wordpress/components';
import {
  BlockInspector,
  store as blockEditorStore
} from '@wordpress/block-editor';
import { createBlock, parse, serialize } from '@wordpress/blocks';
import { useDispatch, useSelect } from '@wordpress/data';
import { EditorProvider, store as editorStore } from '@wordpress/editor';
import { store as coreStore } from '@wordpress/core-data';
import { initializeEditor } from '@wordpress/edit-post';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { toCssVars, toWpEditorSettings } from '@features/theme';
import {
  applyHostBootstrap,
  buildHostBootstrapContract,
  toWpNumericId
} from '../gutenberg-host.js';
import './canvas.web.css';
import '@wp-styles/edit-post';
import '@wp-styles/editor';
import '@wp-styles/block-editor';
import '@wp-styles/components';
import '@wp-styles/interface';

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

const DEFAULT_PALETTE = {
  accent: '#2271b1',
  border: '#d5dbe8',
  surface: '#ffffff',
  surfaceMuted: '#f7fafc',
  text: '#0f172a',
  textMuted: '#475569',
  onAccent: '#ffffff'
};

function EditorStateBridge({ setBlocks, onTitleChange }) {
  const content = useSelect((select) => select(editorStore).getEditedPostAttribute('content'), []);
  const title = useSelect((select) => select(editorStore).getEditedPostAttribute('title'), []);
  const lastSerializedRef = useRef(null);
  const lastTitleRef = useRef(null);

  useEffect(() => {
    const serialized = String(content || '');
    if (lastSerializedRef.current === serialized) return;
    lastSerializedRef.current = serialized;
    try {
      const parsedBlocks = parse(serialized);
      setBlocks(Array.isArray(parsedBlocks) ? parsedBlocks : []);
    } catch {
      setBlocks([]);
    }
  }, [content, setBlocks]);

  useEffect(() => {
    const nextTitle = String(title || '');
    if (lastTitleRef.current === nextTitle) return;
    lastTitleRef.current = nextTitle;
    onTitleChange?.(nextTitle);
  }, [title, onTitleChange]);

  return null;
}

function EditorReadyGate({ expectedPostType, expectedPostId, children }) {
  const currentPostType = useSelect((select) => select(editorStore).getCurrentPostType(), []);
  const currentPostId = useSelect((select) => select(editorStore).getCurrentPostId(), []);
  if (currentPostType !== expectedPostType || String(currentPostId || '') !== String(expectedPostId || '')) {
    return null;
  }
  return children;
}

export function EditorWorkspaceProvider({
  blocks,
  setBlocks,
  palette,
  theme,
  siteTheme,
  title,
  onTitleChange,
  postId,
  postType,
  children
}) {
  const { addEntities } = useDispatch(coreStore);
  const { receiveEntityRecords, editEntityRecord } = useDispatch(coreStore);
  const [entitiesReady, setEntitiesReady] = useState(false);
  const [recordsReady, setRecordsReady] = useState(false);
  const p = palette || DEFAULT_PALETTE;
  const adminThemeVars = useMemo(() => toCssVars(theme || {}, { prefix: '--ep-admin' }), [theme]);
  const contentThemeVars = useMemo(() => toCssVars(siteTheme || theme || {}, { prefix: '--ep-site' }), [siteTheme, theme]);
  const wpVars = useMemo(() => toWpThemeVars(p, adminThemeVars, contentThemeVars), [p, adminThemeVars, contentThemeVars]);
  const editorSettings = useMemo(
    () => toWpEditorSettings(siteTheme || theme || {}, { allowedBlockTypes: SUPPORTED_BLOCK_TYPES }),
    [siteTheme, theme]
  );
  const initialContentRef = useRef({ key: null, value: '' });
  const editorIdentityKey = `${String(postType || 'post')}:${String(postId || 'editor-local')}`;
  if (initialContentRef.current.key !== editorIdentityKey) {
    initialContentRef.current = {
      key: editorIdentityKey,
      value: String(serialize(Array.isArray(blocks) ? blocks : []))
    };
  }
  const initialSerializedContent = initialContentRef.current.value;
  const hostContract = useMemo(
    () => buildHostBootstrapContract({
      postId,
      postType,
      title,
      serializedContent: initialSerializedContent
    }),
    [postId, postType, title, initialSerializedContent]
  );
  const post = useMemo(() => ({
    id: hostContract.postId,
    type: hostContract.postType,
    title: { raw: String(title || '') },
    content: { raw: initialSerializedContent },
    status: 'draft'
  }), [hostContract.postId, hostContract.postType, title, initialSerializedContent]);

  useLayoutEffect(() => {
    addEntities(hostContract.entities);
    setEntitiesReady(true);
  }, [addEntities, hostContract.postId, hostContract.postType, hostContract.entities]);

  useLayoutEffect(() => {
    if (!entitiesReady) return;
    applyHostBootstrap({
      coreDispatch: { receiveEntityRecords, editEntityRecord },
      contract: hostContract
    });
    setRecordsReady(true);
  }, [
    entitiesReady,
    receiveEntityRecords,
    editEntityRecord,
    hostContract.postId,
    hostContract.postType
  ]);

  if (!entitiesReady || !recordsReady) {
    return null;
  }

  return (
    <SlotFillProvider>
      <EditorProvider post={post} settings={editorSettings}>
        <EditorReadyGate expectedPostType={hostContract.postType} expectedPostId={hostContract.postId}>
          <EditorStateBridge setBlocks={setBlocks} onTitleChange={onTitleChange} />
          {children}
          <div id="ep-editor-popovers" style={wpVars}>
            <Popover.Slot />
          </div>
        </EditorReadyGate>
      </EditorProvider>
    </SlotFillProvider>
  );
}

function WpEditorHost({ postType, postId, title, content, settings }) {
  const wpPostId = useMemo(() => toWpNumericId(postId || 'editor-local'), [postId]);
  const hostId = useMemo(
    () => `ep-wp-editor-${String(postType || 'post')}-${String(wpPostId)}`,
    [postType, wpPostId]
  );
  const rootRef = useRef(null);
  const initialEditsRef = useRef({
    title: String(title || ''),
    content: String(content || '')
  });

  useEffect(() => {
    const host = document.getElementById(hostId);
    if (!host) {
      return undefined;
    }
    host.replaceChildren();
    rootRef.current = initializeEditor(
      hostId,
      postType,
      wpPostId,
      settings,
      initialEditsRef.current
    );

    return () => {
      const rootToUnmount = rootRef.current;
      rootRef.current = null;
      // Defer teardown to avoid React warning about synchronous unmount during render.
      setTimeout(() => {
        try {
          rootToUnmount?.unmount?.();
        } catch {
          // Ignore teardown issues from Gutenberg internals.
        }
      }, 0);
    };
  }, [hostId, postType, wpPostId]);

  const firstBlockClientId = useSelect((select) => {
    const blocks = select(blockEditorStore).getBlocks();
    return blocks?.[0]?.clientId || null;
  }, []);
  const selectedBlockClientId = useSelect(
    (select) => select(blockEditorStore).getSelectedBlockClientId(),
    []
  );
  const { selectBlock } = useDispatch(blockEditorStore);

  useEffect(() => {
    if (!firstBlockClientId) return;
    if (selectedBlockClientId) return;
    const handle = window.requestAnimationFrame(() => {
      selectBlock(firstBlockClientId);
    });
    return () => window.cancelAnimationFrame(handle);
  }, [firstBlockClientId, selectedBlockClientId, selectBlock]);

  return <div id={hostId} className="ep-editor-wp-host" style={{ minHeight: 680, width: '100%' }} />;
}

function toWpThemeVars(palette, adminThemeVars = {}, contentThemeVars = {}) {
  const p = palette || DEFAULT_PALETTE;
  // Canvas uses light theme colors to simulate a typical light-themed site.
  // Admin theme (sidebar, header, inspector) uses the palette mode.
  const canvasBg = contentThemeVars['--ep-site-color-surface'] || contentThemeVars['--ep-site-color-background'] || DEFAULT_PALETTE.surfaceMuted;
  const canvasText = contentThemeVars['--ep-site-color-text'] || DEFAULT_PALETTE.text;
  const canvasMuted = contentThemeVars['--ep-site-color-textMuted'] || DEFAULT_PALETTE.textMuted;
  const canvasBorder = contentThemeVars['--ep-site-color-border'] || DEFAULT_PALETTE.border;

  return {
    ...adminThemeVars,
    ...contentThemeVars,
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
    '--wp-components-color-border': p.border,
    '--ep-site-canvas-bg': canvasBg,
    '--ep-site-canvas-text': canvasText,
    '--ep-site-canvas-muted': canvasMuted,
    '--ep-site-canvas-border': canvasBorder,
    '--ep-site-title-size': contentThemeVars['--ep-site-typography-display-size'] || 'clamp(3.2rem, 6vw, 5.2rem)',
    '--ep-site-body-size': contentThemeVars['--ep-site-typography-body-size'] || 'clamp(1.1rem, 2.2vw, 1.9rem)'
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

export function EditorCanvas({ blocks, setBlocks, palette, theme, title, onTitleChange, postId, postType }) {
  const [visualFailed, setVisualFailed] = useState(false);
  const p = palette || DEFAULT_PALETTE;
  const themeVars = useMemo(() => toCssVars(theme || {}, { prefix: '--ep' }), [theme]);

  return (
    <View style={styles.container}>
      <View style={[styles.canvasContainer, { backgroundColor: p.surfaceMuted }]}>
        <CanvasErrorBoundary
          onError={() => {
            setVisualFailed(true);
          }}
          fallback={
            <FallbackEditor blocks={blocks} setBlocks={setBlocks} palette={p} />
          }
        >
          <View style={[styles.paperSheet, { backgroundColor: p.surfaceMuted, shadowColor: p.text, borderColor: p.border }]}>
            <div className="ep-editor-canvas-root" style={toWpThemeVars(p, themeVars)}>
              <WpEditorHost
                postType={postType === 'page' ? 'page' : 'post'}
                postId={postId || 'editor-local'}
                title={title}
                content={String(serialize(Array.isArray(blocks) ? blocks : []))}
                settings={toWpEditorSettings(theme || {}, { allowedBlockTypes: SUPPORTED_BLOCK_TYPES })}
              />
            </div>
          </View>
        </CanvasErrorBoundary>
      </View>

      {visualFailed ? (
        <Text style={{ color: p.textMuted, marginTop: 6 }}>
          Gutenberg visual editor failed to initialize. Source fallback is shown.
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
    flex: 1
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
    borderRadius: 0,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 4,
    elevation: 0,
    borderWidth: 0
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
