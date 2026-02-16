import { NavigationEditor } from '@features/navigation';
import { useMenusSceneController } from './useSceneController.js';

export function MenusScene({ palette, docs, navigation, isAuthenticated, actions }) {
  useMenusSceneController({
    isAuthenticated,
    onLoadNavigationMenu: actions.onLoadNavigationMenu,
    onSetError: actions.onSceneError
  });

  return <NavigationEditor palette={palette} docs={docs} navigation={navigation} actions={actions} />;
}
