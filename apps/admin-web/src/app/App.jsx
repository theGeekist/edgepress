import { useState, useEffect } from 'react';
import { registerFoundationalBlocks } from '../features/editor/registerBlocks.js';
import { useAdminAppController } from './useAdminAppController.js';
import { AdminLoginView } from '../features/layout/AdminLoginView.jsx';
import { AdminTopbar } from '../features/layout/AdminTopbar.jsx';
import { AdminFeedback } from '../features/layout/AdminFeedback.jsx';
import { AdminWorkspace } from '../features/layout/AdminWorkspace.jsx';
import { layoutStyles } from '../features/layout/styles.js';
import { View, useWindowDimensions } from 'react-native';

registerFoundationalBlocks();

export function App() {
  const controller = useAdminAppController();
  const { palette, mode, appSection, contentView, saveState, settings, auth, docs, editor, loop, status, error, previewLink, actions } = controller;

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

  return (
    <View style={[layoutStyles.page, { backgroundColor: palette.page }]}>
      <AdminTopbar
        palette={palette}
        mode={mode}
        username={auth.user.username}
        onToggleTheme={actions.toggleTheme}
        onLogout={actions.onLogout}
        onToggleMenu={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <AdminFeedback palette={palette} status={status} error={error} previewLink={previewLink} />

      <AdminWorkspace
        palette={palette}
        appSection={appSection}
        contentView={contentView}
        onSectionChange={actions.onChangeSection}
        onOpenContentList={actions.onOpenContentList}
        docs={docs}
        editor={editor}
        loop={loop}
        previewLink={previewLink}
        saveState={saveState}
        settings={settings}
        actions={actions}
        isMobile={isMobile}
        isSidebarOpen={isSidebarOpen}
      />
    </View>
  );
}
