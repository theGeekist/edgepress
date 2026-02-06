import { NavigationEditor } from '../../features/navigation';

export function AppearanceScene({ palette, docs, navigation, actions }) {
  return <NavigationEditor palette={palette} docs={docs} navigation={navigation} actions={actions} />;
}
