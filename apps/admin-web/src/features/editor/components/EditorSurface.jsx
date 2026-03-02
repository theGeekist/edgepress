import { useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { RegistryProvider } from '@wordpress/data';
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
import { createBlock, serialize } from '@wordpress/blocks';
import { toWpEditorSettings } from '@features/theme';
import { palettePropTypes } from '@components/prop-types';
import { DEFAULT_PALETTE } from '../constants.js';
import { createEditorRegistry } from '../state/createEditorRegistry.js';
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
  siteTheme,
  adminVars,
  contentVars,
  className
}) {
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

  useEffect(() => {
    const doc = globalThis?.document;
    const win = globalThis?.window;
    if (!Array.isArray(blocks) || blocks.length > 0 || !doc || !win) {
      return undefined;
    }

    const root = doc.querySelector('.ep-editor-canvas-root');
    if (!root) return undefined;

    const placeCaretAtEnd = (element) => {
      if (!element) return;
      const selection = win.getSelection?.();
      if (!selection) return;
      const range = doc.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    };

    const focusFirstEditable = () => {
      const editable = root.querySelector('.block-editor-rich-text__editable[contenteditable="true"]');
      if (!editable || editable.nodeType !== 1 || typeof editable.focus !== 'function') return;
      editable.focus();
      placeCaretAtEnd(editable);
    };

    const onKeyDown = (event) => {
      const target = event.target;
      if (!target || target.nodeType !== 1) return;
      if (!target.matches('.block-editor-default-block-appender__content[role="button"]')) return;
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;

      const isPrintable = event.key.length === 1;
      const isEnter = event.key === 'Enter';
      if (!isPrintable && !isEnter) return;

      event.preventDefault();
      const initialText = isPrintable ? event.key : '';
      const nextBlock = createBlock('core/paragraph', initialText ? { content: initialText } : {});
      setBlocks([nextBlock]);
      globalThis.requestAnimationFrame?.(focusFirstEditable);
    };

    root.addEventListener('keydown', onKeyDown, true);
    return () => {
      root.removeEventListener('keydown', onKeyDown, true);
    };
  }, [blocks, setBlocks]);

  const editorSettings = useMemo(
    () => toWpEditorSettings(siteTheme || {}, { allowedBlockTypes: SUPPORTED_BLOCK_TYPES }),
    [siteTheme]
  );
  const siteTextColor = contentVars?.['--ep-site-canvas-text']
    || contentVars?.['--ep-site-color-text']
    || DEFAULT_PALETTE.text;
  const siteMutedColor = contentVars?.['--ep-site-canvas-muted']
    || contentVars?.['--ep-site-color-textMuted']
    || DEFAULT_PALETTE.textMuted;

  return (
    <div
      className={className}
      style={{ ...adminVars, ...contentVars }}
    >
      <SlotFillProvider>
        <BlockEditorProvider
          useSubRegistry={false}
          value={Array.isArray(blocks) ? blocks : []}
          onInput={setBlocks}
          onChange={setBlocks}
          settings={editorSettings}
        >
          <div className="ep-editor-surface-layout">
            <div className="ep-editor-title-wrap">
              <input
                type="text"
                value={title || ''}
                onChange={(event) => onTitleChange?.(event.target.value)}
                placeholder="Add title"
                className="editor-post-title__input ep-editor-title-input"
                style={{
                  color: siteTextColor,
                  '--ep-title-placeholder': siteMutedColor
                }}
              />
            </div>
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
          </div>
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
