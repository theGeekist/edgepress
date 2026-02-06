import { NavigationEditor } from './NavigationEditor.jsx';

export { NavigationEditor };

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
