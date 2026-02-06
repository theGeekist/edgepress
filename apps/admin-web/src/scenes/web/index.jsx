import { View } from 'react-native';
import { Sidebar } from '../../components/ui/Sidebar.jsx';
import { layoutStyles } from '../../components/styles.js';
import { ContentScene } from './ContentScene.jsx';
import { SettingsScene } from './SettingsScene.jsx';
import { AppearanceScene } from './AppearanceScene.jsx';
import { PlaceholderScene } from './PlaceholderScene.jsx';

const SIDEBAR_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'content', label: 'Content' },
  { id: 'media', label: 'Media' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'settings', label: 'Settings' }
];

export function AdminScene({
  palette,
  appSection,
  contentView,
  onSectionChange,
  onOpenContentList,
  docs,
  editor,
  loop,
  navigation,
  previewLink,
  saveState,
  settings,
  actions,
  isMobile,
  isSidebarOpen
}) {
  return (
    <View style={[layoutStyles.workspace, { backgroundColor: 'transparent' }]}>
      <Sidebar
        palette={palette}
        items={SIDEBAR_ITEMS}
        activeItemId={appSection}
        onSelectItem={onSectionChange}
        isMobile={isMobile}
        isOpen={isSidebarOpen}
      />

      <View style={isMobile ? layoutStyles.contentWorkspaceMobile : [layoutStyles.contentWorkspace, { backgroundColor: palette.page }]}>
        {appSection === 'content' ? (
          <ContentScene
            palette={palette}
            contentView={contentView}
            onOpenContentList={onOpenContentList}
            docs={docs}
            editor={editor}
            loop={loop}
            previewLink={previewLink}
            saveState={saveState}
            actions={actions}
            isMobile={isMobile}
          />
        ) : null}
        {appSection === 'settings' ? (
          <SettingsScene palette={palette} settings={settings} actions={actions} />
        ) : null}
        {appSection === 'appearance' ? (
          <AppearanceScene palette={palette} docs={docs} navigation={navigation} actions={actions} />
        ) : null}
        {appSection !== 'content' && appSection !== 'settings' && appSection !== 'appearance' ? (
          <PlaceholderScene palette={palette} appSection={appSection} />
        ) : null}
      </View>

    </View>
  );
}
