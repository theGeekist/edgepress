import { useState, useEffect } from 'react';
import { registerFoundationalBlocks } from '@features/editor';
import { AdminLoginView } from '@features/auth';
import { useAdminAppController } from '@hooks/useAdminAppController.js';
import { TopBar } from '@components/ui/TopBar.jsx';
import { Feedback } from '@components/ui/Feedback.jsx';
import { AdminScene } from './scenes/web';
import { layoutStyles } from '@components/styles.js';
import { View, useWindowDimensions } from 'react-native';

registerFoundationalBlocks();

export function App() {
  const controller = useAdminAppController();
  const { palette, mode, appSection, contentView, mediaView, saveState, settings, auth, docs, media, editor, loop, navigation, status, error, previewLink, actions } = controller;

  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);

  // Auto-close on mobile when entering, ensure open on desktop resize
  useEffect(() => {
    if (!isMobile) {
      setIsSidebarOpen(true);
    } else {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  if (!auth.user) {
    return (
      <AdminLoginView
        palette={palette}
        auth={auth}
        status={status}
        error={error}
        onLogin={actions.onLogin}
      />
    );
  }

  const feedbackItems = [
    status ? { key: 'status', text: status, tone: 'muted' } : null,
    previewLink?.url
      ? {
        key: 'preview',
        text: 'Open preview in new tab',
        tone: 'link',
        onPress: () => {
          if (typeof window !== 'undefined') {
            window.open(previewLink.url, '_blank', 'noopener,noreferrer');
          }
        }
      }
      : null,
    error ? { key: 'error', text: error, tone: 'error' } : null
  ].filter(Boolean);

  return (
    // <GestureHandlerRootView style={{ flex: 1 }}>
    <View style={[layoutStyles.page, { backgroundColor: palette.page }]}>
      <TopBar
        palette={palette}
        title="GCMS Admin"
        metaText={`Howdy, ${auth.user.username}`}
        onPressLeft={() => setIsSidebarOpen(!isSidebarOpen)}
        actions={[
          { key: 'theme', label: mode === 'dark' ? '☀' : '☾', onPress: actions.toggleTheme },
          { key: 'logout', label: 'Log Out', onPress: actions.onLogout }
        ]}
      />

      <Feedback palette={palette} items={feedbackItems} />

      <AdminScene
        palette={palette}
        appSection={appSection}
        contentView={contentView}
        mediaView={mediaView}
        onSectionChange={actions.onChangeSection}
        onOpenContentList={actions.onOpenContentList}
        docs={docs}
        media={media}
        editor={editor}
        loop={loop}
        navigation={navigation}
        previewLink={previewLink}
        saveState={saveState}
        settings={settings}
        actions={actions}
        isMobile={isMobile}
        isSidebarOpen={isSidebarOpen}
      />
    </View>
    // </GestureHandlerRootView>
  );
}
