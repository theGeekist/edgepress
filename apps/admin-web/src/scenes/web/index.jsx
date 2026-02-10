import { View } from 'react-native';
import { Sidebar } from '@components/ui/Sidebar.jsx';
import { layoutStyles } from '@components/styles.js';
import { ContentScene } from './ContentScene.jsx';
import { MediaScene } from './MediaScene.jsx';
import { SettingsScene } from './SettingsScene.jsx';
import { AppearanceScene } from './AppearanceScene.jsx';
import { MenusScene } from './MenusScene.jsx';
import { PlaceholderScene } from './PlaceholderScene.jsx';

export function AdminScene({
  palette,
  theme,
  appSection,
  contentView,
  mediaView,
  onSectionChange,
  onOpenContentList,
  docs,
  media,
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
        activeItemId={appSection}
        onSelectItem={onSectionChange}
        isMobile={isMobile}
        isOpen={isSidebarOpen}
      />

      <View style={isMobile ? layoutStyles.contentWorkspaceMobile : [layoutStyles.contentWorkspace, { backgroundColor: palette.page }]}>
        {appSection === 'dashboard' ? (
          <PlaceholderScene palette={palette} appSection={appSection} />
        ) : appSection === 'content' ? (
          <ContentScene
            palette={palette}
            theme={theme}
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
        ) : appSection === 'settings' ? (
          <SettingsScene palette={palette} settings={settings} actions={actions} />
        ) : appSection === 'media' ? (
          <MediaScene palette={palette} media={media} mediaView={mediaView} actions={actions} />
        ) : appSection === 'menus' ? (
          <MenusScene
            palette={palette}
            docs={docs}
            navigation={navigation}
            actions={actions}
          />
        ) : appSection === 'appearance' || appSection === 'themes' || appSection === 'widgets' ? (
          <AppearanceScene
            palette={palette}
            actions={actions}
            appearanceSubsection={appSection}
          />
        ) : (
          <PlaceholderScene palette={palette} appSection={appSection} />
        )}
      </View>

    </View>
  );
}
