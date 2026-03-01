export {
  EditorCanvas,
  BlockInspectorPanel
} from './components/Canvas.jsx';
export { EditorSurface } from './components/EditorSurface.jsx';
export { useEditorState } from './hooks/useEditorState.js';
export { configureEditorBootstrap, useEditorBootstrap } from './hooks/useEditorBootstrap.js';
export { registerFoundationalBlocks } from './registerBlocks.js';
export { createEditorRegistry } from './state/createEditorRegistry.js';
export { createAdminShell } from './shell.js';
export { createCanonicalSdkStore, configureApiFetch } from './gutenberg-integration.js';
export * from './parity/index.js';
export * from './devtools/index.js';

export const editorFeature = {
  id: 'editor',
  routes: [
    {
      id: 'content-editor',
      section: 'content',
    },
  ],
};
