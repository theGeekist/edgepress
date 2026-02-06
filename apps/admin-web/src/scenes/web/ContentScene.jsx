import { Pressable, Text, View } from 'react-native';

import { ThemedTextInput } from '@components/ui/ThemedTextInput.jsx';
import { ContentListTable, PublishPanel, ContentSettingsPanel } from '@features/content';
import { EditorCanvas } from '@features/editor';
import { layoutStyles } from '@components/styles.js';

export function ContentScene({
  palette,
  contentView,
  onOpenContentList,
  docs,
  editor,
  loop,
  previewLink,
  saveState,
  actions,
  isMobile
}) {
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

  if (!isEditorView) {
    return (
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
    );
  }

  return (
    <View style={{ flex: 1, flexDirection: isMobile ? 'column' : 'row', gap: 20 }}>
      <View style={layoutStyles.contentEditorPane}>
        <View style={layoutStyles.filterRow}>
          <ThemedTextInput
            palette={palette}
            value={docs.title}
            onChangeText={docs.setTitle}
            placeholder="Add title"
            editable={hasSelection}
            style={[layoutStyles.titleInput, { backgroundColor: 'transparent', paddingLeft: 0, borderWidth: 0 }]}
          />
        </View>
        <View style={layoutStyles.filterRow}>
          <Text style={[layoutStyles.sectionHint, { color: palette.textMuted }]}>{saveHint}</Text>
          <Text style={[layoutStyles.sectionHint, { color: palette.textMuted }]}>|</Text>
          <ActionHint palette={palette} label="Back to list" onPress={onOpenContentList} />
        </View>

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
