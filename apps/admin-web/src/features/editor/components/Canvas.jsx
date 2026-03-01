import { Component, useEffect, useMemo, useRef, useState } from 'react';
import { parse, serialize } from '@wordpress/blocks';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import PropTypes from 'prop-types';
import { palettePropTypes } from '@components/prop-types';
import { toCssVars } from '@features/theme';
import { EditorSurface, EditorSurfaceInspector } from './EditorSurface.jsx';
import './canvas.web.css';
import '@wp-styles/block-editor';
import '@wp-styles/components';
import '@wp-styles/interface';

const DEFAULT_PALETTE = {
  accent: '#2271b1',
  border: '#d5dbe8',
  surface: '#ffffff',
  surfaceMuted: '#f7fafc',
  text: '#0f172a',
  textMuted: '#475569',
  onAccent: '#ffffff'
};

function toWpAdminVars(palette, adminThemeVars = {}) {
  const p = palette || DEFAULT_PALETTE;
  return {
    ...adminThemeVars,
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

function toWpSiteVars(contentThemeVars = {}) {
  const canvasBg = contentThemeVars['--ep-site-color-surface']
    || contentThemeVars['--ep-site-color-background']
    || DEFAULT_PALETTE.surfaceMuted;
  const canvasText = contentThemeVars['--ep-site-color-text'] || DEFAULT_PALETTE.text;
  const canvasMuted = contentThemeVars['--ep-site-color-textMuted'] || DEFAULT_PALETTE.textMuted;
  const canvasBorder = contentThemeVars['--ep-site-color-border'] || DEFAULT_PALETTE.border;

  return {
    ...contentThemeVars,
    '--ep-site-canvas-bg': canvasBg,
    '--ep-site-canvas-text': canvasText,
    '--ep-site-canvas-muted': canvasMuted,
    '--ep-site-canvas-border': canvasBorder,
    '--ep-site-title-size': contentThemeVars['--ep-site-typography-display-size'] || 'clamp(2.25rem, 4vw, 3.5rem)',
    '--ep-site-body-size': contentThemeVars['--ep-site-typography-body-size'] || '1.125rem'
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

export function EditorCanvas({
  blocks,
  setBlocks,
  palette,
  theme,
  siteTheme,
  title,
  onTitleChange,
  postId,
  postType
}) {
  const [visualFailed, setVisualFailed] = useState(false);
  const p = palette || DEFAULT_PALETTE;

  const adminThemeVars = useMemo(() => toCssVars(theme || {}, { prefix: '--ep-admin' }), [theme]);
  const contentThemeVars = useMemo(() => toCssVars(siteTheme || theme || {}, { prefix: '--ep-site' }), [siteTheme, theme]);
  const adminVars = useMemo(() => toWpAdminVars(p, adminThemeVars), [p, adminThemeVars]);
  const contentVars = useMemo(() => toWpSiteVars(contentThemeVars), [contentThemeVars]);

  return (
    <View style={styles.container}>
      <View style={[styles.canvasContainer, { backgroundColor: p.surfaceMuted }]}> 
        <CanvasErrorBoundary
          onError={() => setVisualFailed(true)}
          fallback={<FallbackEditor blocks={blocks} setBlocks={setBlocks} palette={p} />}
        >
          <View style={[styles.paperSheet, { backgroundColor: p.surfaceMuted, borderColor: p.border }]}> 
            <EditorSurface
              blocks={blocks}
              setBlocks={setBlocks}
              title={title}
              onTitleChange={onTitleChange}
              postId={postId || 'editor-local'}
              postType={postType === 'page' ? 'page' : 'post'}
              theme={theme}
              siteTheme={siteTheme}
              adminVars={adminVars}
              contentVars={contentVars}
              palette={p}
            />
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
  return <EditorSurfaceInspector palette={p} styleVars={toWpAdminVars(p)} />;
}

const BORDER_RADIUS = 4;

FallbackEditor.propTypes = {
  blocks: PropTypes.array.isRequired,
  setBlocks: PropTypes.func.isRequired,
  palette: PropTypes.shape(palettePropTypes)
};

CanvasErrorBoundary.propTypes = {
  onError: PropTypes.func,
  fallback: PropTypes.node,
  children: PropTypes.node.isRequired
};

EditorCanvas.propTypes = {
  blocks: PropTypes.array.isRequired,
  setBlocks: PropTypes.func.isRequired,
  palette: PropTypes.shape(palettePropTypes),
  theme: PropTypes.object,
  siteTheme: PropTypes.object,
  title: PropTypes.string,
  onTitleChange: PropTypes.func,
  postId: PropTypes.string,
  postType: PropTypes.string
};

BlockInspectorPanel.propTypes = {
  palette: PropTypes.shape(palettePropTypes).isRequired
};

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
