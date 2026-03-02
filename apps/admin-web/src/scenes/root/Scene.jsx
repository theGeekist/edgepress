import { View } from 'react-native';
import { Sidebar } from '@components/ui/Sidebar.jsx';
import { layoutStyles } from '@components/styles.js';
import { ContentScene } from '../content/Scene.jsx';
import { MediaScene } from '../media/Scene.jsx';
import { SettingsScene } from '../settings/Scene.jsx';
import { AppearanceScene } from '../appearance/Scene.jsx';
import { MenusScene } from '../menus/Scene.jsx';
import { DashboardScene } from '../dashboard/Scene.jsx';

export function RootScene({
  palette,
  theme,
  appSection,
  contentView,
  mediaView,
  onSectionChange,
  docs,
  media,
  editor,
  loop,
  previewLink,
  isAuthenticated,
  navigation,
  settings,
  actions,
  isMobile,
  isSidebarOpen
}) {
  const renderScene = () => {
    if (appSection === 'dashboard') {
      return <DashboardScene palette={palette} appSection={appSection} />;
    }
    if (appSection === 'content') {
      return (
        <ContentScene
          palette={palette}
          theme={theme}
          siteTheme={settings?.siteTheme ?? theme}
          contentView={contentView}
          docs={docs}
          media={media}
          editor={editor}
          loop={loop}
          previewLink={previewLink}
          isAuthenticated={Boolean(isAuthenticated)}
          actions={actions}
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
          isAuthenticated={Boolean(isAuthenticated)}
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
    return <DashboardScene palette={palette} appSection={appSection} />;
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
