export { EditorCanvas } from './components/Canvas.jsx';
export { useEditorState } from './hooks/useEditorState.js';
export { registerFoundationalBlocks } from './registerBlocks.js';
export { createAdminShell } from './shell.js';
export { createCanonicalSdkStore, configureApiFetch } from './gutenberg-integration.js';
export * from './parity/index.js';

export const editorFeature = {
  id: 'editor',
  routes: [
    {
      id: 'content-editor',
      section: 'content',
    },
  ],
};
