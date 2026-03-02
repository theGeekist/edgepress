import { useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { RegistryProvider, useRegistry } from '@wordpress/data';
import {
  BlockEditorKeyboardShortcuts,
  BlockEditorProvider,
  BlockInspector,
  BlockList,
  BlockTools,
  DefaultBlockAppender,
  ObserveTyping,
  WritingFlow
} from '@wordpress/block-editor';
import { SlotFillProvider, Popover } from '@wordpress/components';
import { serialize } from '@wordpress/blocks';
import { StyleSheet, TextInput, View } from 'react-native';
import { toWpEditorSettings } from '@features/theme';
import { palettePropTypes } from '@components/prop-types';
import { DEFAULT_PALETTE } from '../constants.js';
import { createEditorRegistry } from '../state/createEditorRegistry.js';
import { storeHotSwapPlugin } from '../state/storeHotSwapPlugin.js';
import { useEditorBootstrap } from '../hooks/useEditorBootstrap.js';

const SUPPORTED_BLOCK_TYPES = [
  'core/paragraph',
  'core/heading',
  'core/image',
  'core/navigation',
  'core/embed',
  'core/group',
  'core/columns',
  'core/column',
  'core/quote',
  'core/separator',
  'core/spacer'
];

function EditorSurfaceInner({
  blocks,
  setBlocks,
  title,
  onTitleChange,
  postId,
  postType,
  theme,
  siteTheme,
  adminVars,
  contentVars,
  className
}) {
  const registry = useRegistry();
  const rootRef = useRef(null);

  const content = useMemo(() => {
    try {
      return serialize(Array.isArray(blocks) ? blocks : []);
    } catch {
      return '';
    }
  }, [blocks]);

  useEditorBootstrap({
    postType,
    postId,
    title,
    content
  });

  const editorSettings = useMemo(
    () => toWpEditorSettings(siteTheme || theme || {}, { allowedBlockTypes: SUPPORTED_BLOCK_TYPES }),
    [siteTheme, theme]
  );
  const siteTextColor = contentVars?.['--ep-site-canvas-text']
    || contentVars?.['--ep-site-color-text']
    || DEFAULT_PALETTE.text;
  const siteMutedColor = contentVars?.['--ep-site-canvas-muted']
    || contentVars?.['--ep-site-color-textMuted']
    || DEFAULT_PALETTE.textMuted;

  return (
    <div
      ref={rootRef}
      className={className}
      style={{ ...adminVars, ...contentVars }}
      onFocusCapture={() => {
        storeHotSwapPlugin.setEditor(registry.select, registry.dispatch);
      }}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget;
        if (rootRef.current?.contains(nextTarget)) {
          return;
        }
        storeHotSwapPlugin.resetEditor();
      }}
    >
      <SlotFillProvider>
        <BlockEditorProvider
          useSubRegistry={false}
          value={Array.isArray(blocks) ? blocks : []}
          onInput={setBlocks}
          onChange={setBlocks}
          settings={editorSettings}
        >
          <View style={styles.root}>
            <View style={styles.titleWrap}>
              <TextInput
                value={title || ''}
                onChangeText={onTitleChange}
                placeholder="Add title"
                placeholderTextColor={siteMutedColor}
                style={[
                  styles.titleInput,
                  { color: siteTextColor }
                ]}
              />
            </View>
            <div className="editor-styles-wrapper">
              <BlockEditorKeyboardShortcuts />
              <BlockTools>
                <WritingFlow>
                  <ObserveTyping>
                    <BlockList renderAppender={DefaultBlockAppender} />
                  </ObserveTyping>
                </WritingFlow>
              </BlockTools>
            </div>
          </View>
          <div id="ep-editor-popovers" style={adminVars}>
            <Popover.Slot />
          </div>
        </BlockEditorProvider>
      </SlotFillProvider>
    </div>
  );
}

EditorSurfaceInner.propTypes = {
  blocks: PropTypes.array.isRequired,
  setBlocks: PropTypes.func.isRequired,
  title: PropTypes.string,
  onTitleChange: PropTypes.func,
  postId: PropTypes.string,
  postType: PropTypes.string,
  theme: PropTypes.object,
  siteTheme: PropTypes.object,
  adminVars: PropTypes.object,
  contentVars: PropTypes.object,
  className: PropTypes.string
};

export function EditorSurface(props) {
  const {
    postId,
    postType,
    persistenceKey,
    palette,
    ...rest
  } = props;

  const editorIdentity = `${String(postType || 'post')}:${String(postId || 'editor-local')}`;

  const registry = useMemo(
    () => createEditorRegistry({
      persistenceKey: persistenceKey || `edgepress.editor.preferences.${editorIdentity}`
    }),
    [editorIdentity, persistenceKey]
  );

  return (
    <RegistryProvider value={registry}>
      <EditorSurfaceInner
        {...rest}
        postId={postId}
        postType={postType}
        className="ep-editor-canvas-root ep-editor-surface"
        palette={palette || DEFAULT_PALETTE}
      />
    </RegistryProvider>
  );
}

EditorSurface.propTypes = {
  blocks: PropTypes.array.isRequired,
  setBlocks: PropTypes.func.isRequired,
  title: PropTypes.string,
  onTitleChange: PropTypes.func,
  postId: PropTypes.string,
  postType: PropTypes.string,
  theme: PropTypes.object,
  siteTheme: PropTypes.object,
  adminVars: PropTypes.object,
  contentVars: PropTypes.object,
  persistenceKey: PropTypes.string,
  palette: PropTypes.shape(palettePropTypes)
};

export function EditorSurfaceInspector({ styleVars = {} }) {
  return (
    <div className="ep-editor-inspector-panel" style={styleVars} aria-label="Block settings">
      <BlockInspector />
    </div>
  );
}

EditorSurfaceInspector.propTypes = {
  styleVars: PropTypes.object
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 680
  },
  titleWrap: {
    paddingHorizontal: 32,
    paddingTop: 16
  },
  titleInput: {
    width: '100%'
  }
});
