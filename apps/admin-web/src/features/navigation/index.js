import { NavigationEditor } from './NavigationEditor.jsx';

export { NavigationEditor };
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
