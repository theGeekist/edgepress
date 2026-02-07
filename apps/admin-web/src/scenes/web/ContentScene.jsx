import { useState } from 'react';
import { Text, View, Pressable } from 'react-native';

import { ContentListTable, PublishPanel, ContentSettingsPanel } from '@features/content';
import { BlockInspectorPanel, EditorCanvas, EditorWorkspaceProvider } from '@features/editor';
import { layoutStyles } from '@components/styles.js';
import { AdminPage, PageHeader, PageToolbar, PageRail, Card } from '@components/ui/AdminLayout.jsx';
import { DropdownButton } from '@components/ui/DropdownButton.jsx';

export function ContentScene({
  palette,
  theme,
  contentView,
  onOpenContentList,
  docs,
  editor,
  loop,
  previewLink,
  saveState,
  actions,
  isMobile,
}) {
  const [rightRailTab, setRightRailTab] = useState('post');
  const isEditorView = contentView === 'editor';
  const hasSelection = Boolean(docs.selectedId);
  const selectedDoc = docs.getSelectedDoc();
  const selectedMeta = selectedDoc?.ui || {
    type: 'page',
    status: 'draft',
    slug: '',
    excerpt: '',
    publishDate: '',
    featuredImageId: ''
  };
  const isTitleDirty = Boolean(selectedDoc) && docs.title !== (selectedDoc.title || '');
  const saveHint = saveState === 'saving'
    ? 'Saving...'
    : isTitleDirty
      ? 'Unsaved changes'
      : 'Saved';

  const contentTypeLabel = 'Content';

  // List view - unified toolbar with title, original filters, search, and new button
  if (!isEditorView) {
    return (
      <AdminPage palette={palette} compact>
        <PageToolbar
          palette={palette}
          compact
          left={
            <Text style={[styles.pageTitle, { color: palette.text }]}>{contentTypeLabel}</Text>
          }
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <DropdownButton
                label="+ New"
                palette={palette}
                items={[
                  { label: 'Page', onPress: () => actions.onCreate('page') },
                  { label: 'Post', onPress: () => actions.onCreate('post') }
                ]}
              />
            </View>
          }
        />
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
          hideHeader
        />
      </AdminPage>
    );
  }

  // Editor view - use AdminPage with rail
  const rightRailTabs = [
    { id: 'post', label: selectedMeta.type === 'post' ? 'Post' : 'Page' },
    { id: 'block', label: 'Block' },
  ];

  return (
    <EditorWorkspaceProvider
      key={docs.selectedId || 'editor-workspace'}
      blocks={editor.blocks}
      setBlocks={editor.setBlocks}
    >
      <AdminPage
        palette={palette}
        compact
        header={
          <PageHeader
            palette={palette}
            title={docs.title || 'Untitled'}
            breadcrumb="Editing"
            actions={
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: palette.textMuted }}>{saveHint}</Text>
                <BackButton palette={palette} onPress={onOpenContentList} />
              </View>
            }
          />
        }
        rightRail={
          <PageRail
            palette={palette}
            tabs={rightRailTabs}
            activeTab={rightRailTab}
            onTabChange={setRightRailTab}
          >
            {rightRailTab === 'block' ? (
              <BlockInspectorPanel palette={palette} />
            ) : (
              <>
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
              </>
            )}
          </PageRail>
        }
      >
        <Card palette={palette} noPadding>
          <EditorCanvas
            blocks={editor.blocks}
            setBlocks={editor.setBlocks}
            palette={palette}
            theme={theme}
            title={docs.title}
            onTitleChange={docs.setTitle}
          />
        </Card>
      </AdminPage>
    </EditorWorkspaceProvider>
  );
}

function BackButton({ palette, onPress }) {
  return (
    <Pressable onPress={onPress}>
      <Text style={{ color: palette.accent, fontSize: 12, textDecorationLine: 'underline' }}>
        ← Back
      </Text>
    </Pressable>
  );
}

const styles = {
  pageTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
};
