import { NavigationEditor, navigationEditorPropTypes } from './NavigationEditor.jsx';

export { NavigationEditor, navigationEditorPropTypes };
export { useNavigationActions } from './hooks/useNavigationActions.js';

export const navigationFeature = {
  id: 'navigation',
  routes: [
    {
      id: 'menus',
      section: 'appearance',
      component: NavigationEditor,
    },
  ],
};
