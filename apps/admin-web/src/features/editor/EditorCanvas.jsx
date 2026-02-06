import { BlockCanvas, BlockEditorProvider } from '@wordpress/block-editor';

export function EditorCanvas({ blocks, setBlocks }) {
  return (
    <BlockEditorProvider value={blocks} onInput={(next) => setBlocks(next)} onChange={(next) => setBlocks(next)}>
      <BlockCanvas height="560px" />
    </BlockEditorProvider>
  );
}
