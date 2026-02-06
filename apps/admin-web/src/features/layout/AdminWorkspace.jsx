import { Pressable, Text, View } from 'react-native';

import { ThemedTextInput } from '../../components/ui/ThemedTextInput.jsx';
import { EditorCanvas } from '../editor/EditorCanvas.jsx';
import { AdminSidebarNav } from './AdminSidebarNav.jsx';
import { ContentListTable } from './ContentListTable.jsx';
import { PublishPanel } from './PublishPanel.jsx';
import { ContentSettingsPanel } from './ContentSettingsPanel.jsx';
import { ActionButton } from '../../components/ui/ActionButton.jsx';
import { FilterTabs } from '../../components/ui/FilterTabs.jsx';
import { SettingsPage } from '../../components/layout/SettingsPage.jsx';
import { MetaBox } from '../../components/ui/MetaBox.jsx';
import { layoutStyles } from './styles.js';

export function AdminWorkspace({
  palette,
  appSection,
  contentView,
  onSectionChange,
  onOpenContentList,
  docs,
  editor,
  loop,
  previewLink,
  saveState,
  settings,
  actions,
  isMobile,
  isSidebarOpen
}) {
  const isContentSection = appSection === 'content';
  const isEditorView = contentView === 'editor';
  const hasSelection = Boolean(docs.selectedId);
  const selectedDoc = docs.getSelectedDoc();
  const selectedMeta = selectedDoc?.ui || {
    type: 'page',
    status: 'draft',
    slug: '',
    excerpt: '',
    publishDate: '',
    featuredImageUrl: ''
  };
  const isTitleDirty = Boolean(selectedDoc) && docs.title !== (selectedDoc.title || '');
  const saveHint = saveState === 'saving'
    ? 'Saving...'
    : isTitleDirty
      ? 'Unsaved changes'
      : 'Saved';

  return (
    <View style={[layoutStyles.workspace, { backgroundColor: 'transparent' }]}>
      <AdminSidebarNav
        palette={palette}
        activeSection={appSection}
        onChangeSection={onSectionChange}
        isMobile={isMobile}
        isOpen={isSidebarOpen}
      />

      <View style={isMobile ? layoutStyles.contentWorkspaceMobile : [layoutStyles.contentWorkspace, { backgroundColor: palette.page }]}>
        {isContentSection ? (
          isEditorView ? (
            <View style={{ flex: 1, flexDirection: isMobile ? 'column' : 'row', gap: 20 }}>
              <View style={layoutStyles.contentEditorPane}>
                <View style={layoutStyles.filterRow}>
                  <ThemedTextInput
                    palette={palette}
                    value={docs.title}
                    onChangeText={docs.setTitle}
                    placeholder="Add title"
                    editable={hasSelection}
                    style={[layoutStyles.titleInput, { backgroundColor: 'transparent', paddingLeft: 0, borderWidth: 0 }]} // WP Title style
                  />
                </View>
                <View style={layoutStyles.filterRow}>
                  <Text style={[layoutStyles.sectionHint, { color: palette.textMuted }]}>{saveHint}</Text>
                  <Text style={[layoutStyles.sectionHint, { color: palette.textMuted }]}>|</Text>
                  <ActionHint palette={palette} label="Back to list" onPress={onOpenContentList} />
                </View>

                {/* Main Editor Canvas - White Card background usually */}
                <View style={[layoutStyles.canvasWrap, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                  <EditorCanvas
                    key={docs.selectedId || 'editor-canvas'}
                    blocks={editor.blocks}
                    setBlocks={editor.setBlocks}
                    palette={palette}
                  />
                </View>
              </View>

              <View style={[layoutStyles.publishRail, { borderLeftColor: palette.border, width: isMobile ? '100%' : 280, borderLeftWidth: isMobile ? 0 : 1, paddingLeft: isMobile ? 0 : 12 }]}>
                <PublishPanel
                  palette={palette}
                  hasSelection={hasSelection}
                  loop={loop}
                  previewLink={previewLink}
                  actions={actions}
                />
                <ContentSettingsPanel
                  palette={palette}
                  hasSelection={hasSelection}
                  meta={selectedMeta}
                  onUpdateMeta={(patch) => docs.updateMeta(docs.selectedId, patch)}
                />
              </View>
            </View>
          ) : (
            <ContentListTable
              palette={palette}
              docs={docs.docs}
              selectedRowIds={docs.selectedRowIds}
              contentSearch={docs.contentSearch}
              onSearch={docs.setContentSearch}
              contentTypeFilter={docs.contentTypeFilter}
              onTypeFilter={docs.setContentTypeFilter}
              contentStatusFilter={docs.contentStatusFilter}
              onStatusFilter={docs.setContentStatusFilter}
              onToggleRow={docs.toggleRowSelection}
              onBulkApply={actions.onBulkApply}
              onClearSelected={docs.clearSelectedRows}
              onEdit={actions.onEditContent}
              onRowTrash={actions.onTrashContent}
              onRowDelete={actions.onDeleteContent}
              onNewPage={() => actions.onCreate('page')}
              onNewPost={() => actions.onCreate('post')}
              sortBy={docs.sortBy}
              sortDir={docs.sortDir}
              onSort={docs.setSortBy}
              paginationState={docs.pagination}
              onPageChange={docs.setPage}
            />
          )
        ) : appSection === 'settings' ? (
          <SettingsPage
            title="Settings"
            palette={palette}
            actions={<ActionButton label="Save Changes" tone="primary" palette={palette} onPress={() => { }} />}
          >
            <MetaBox title="General Settings" palette={palette}>
              <View style={{ gap: 12 }}>
                <Text style={{ color: palette.text }}>Site Title</Text>
                <ThemedTextInput palette={palette} placeholder="My Awesome Site" />
                <Text style={{ color: palette.text }}>Tagline</Text>
                <ThemedTextInput palette={palette} placeholder="Just another Geekist site" />
              </View>
            </MetaBox>

            <MetaBox title="Permalink Structure" palette={palette}>
              <Text style={{ color: palette.textMuted, fontSize: 13, marginBottom: 12 }}>
                Choose how your post URLs should look.
              </Text>
              <FilterTabs
                palette={palette}
                currentFilter={settings?.permalinkStructure || 'name'}
                onFilterChange={(next) => actions.onUpdateSettings({ permalinkStructure: next })}
                filters={[
                  { label: 'Plain', value: 'plain' },
                  { label: 'Day and name', value: 'day' },
                  { label: 'Post name', value: 'name' }
                ]}
              />
            </MetaBox>
          </SettingsPage>
        ) : (
          <View style={[layoutStyles.card, layoutStyles.sectionPlaceholder, { borderColor: palette.border, backgroundColor: palette.surfaceMuted }]}>
            <Text style={[layoutStyles.loopTitle, { color: palette.text }]}>Section not enabled yet</Text>
            <Text style={[layoutStyles.loopText, { color: palette.textMuted }]}>
              {appSection === 'dashboard' ? 'Dashboard will aggregate publishing and content metrics.' : null}
              {appSection === 'media' ? 'Media library and featured image browser will land in the next Phase 10 slice.' : null}
              {appSection === 'appearance' ? 'Appearance controls will follow after preview skin and theming contracts.' : null}
            </Text>
          </View>
        )}
      </View>

    </View>
  );
}

function ActionHint({ palette, label, onPress }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress}>
      <Text style={{ color: palette.accent, textDecorationLine: 'underline' }}>
        {label}
      </Text>
    </Pressable>
  );
}
