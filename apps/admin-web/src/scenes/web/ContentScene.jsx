import { View } from 'react-native';

import { ContentListTable } from '@features/content';
import { EditorCanvas } from '@features/editor';
import { layoutStyles } from '@components/styles.js';

export function ContentScene({
  palette,
  theme,
  contentView,
  docs,
  editor,
  actions
}) {
  const isEditorView = contentView === 'editor';
  const selectedType = editor?.postType === 'page' ? 'page' : 'post';

  if (!isEditorView) {
    return (
      <View style={layoutStyles.contentListWrap}>
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
          hideHeader={false}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, minHeight: 760 }}>
      <EditorCanvas
        blocks={editor.blocks}
        setBlocks={editor.setBlocks}
        palette={palette}
        theme={theme}
        title={docs.title}
        onTitleChange={docs.setTitle}
        postId={docs.selectedId}
        postType={selectedType}
      />
    </View>
  );
}
