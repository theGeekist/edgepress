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
  const renderScene = () => {
    if (appSection === 'dashboard') {
      return <PlaceholderScene palette={palette} appSection={appSection} />;
    }
    if (appSection === 'content') {
      return (
        <ContentScene
          palette={palette}
          theme={theme}
          siteTheme={settings?.siteTheme || theme}
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
      );
    }
    if (appSection === 'settings') {
      return <SettingsScene palette={palette} settings={settings} actions={actions} />;
    }
    if (appSection === 'media') {
      return <MediaScene palette={palette} media={media} mediaView={mediaView} actions={actions} />;
    }
    if (appSection === 'menus') {
      return (
        <MenusScene
          palette={palette}
          docs={docs}
          navigation={navigation}
          actions={actions}
        />
      );
    }
    if (appSection === 'appearance' || appSection === 'themes' || appSection === 'widgets') {
      return (
        <AppearanceScene
          palette={palette}
          actions={actions}
          appearanceSubsection={appSection}
        />
      );
    }
    return <PlaceholderScene palette={palette} appSection={appSection} />;
  };

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
        {renderScene()}
      </View>

    </View>
  );
}
