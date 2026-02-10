import { NavigationEditor } from '@features/navigation';

export function MenusScene({ palette, docs, navigation, actions }) {
  return <NavigationEditor palette={palette} docs={docs} navigation={navigation} actions={actions} />;
}
