import { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';

import { ContentListTable, ContentSettingsPanel, PublishPanel } from '@features/content';
import { DevToolsPanel, EditorCanvas, useDevToolsState } from '@features/editor';
import { toCssVars } from '@features/theme';
import { layoutStyles } from '@components/styles.js';
import { useContentSceneController } from './useSceneController.js';

export function ContentScene({
  palette,
  theme,
  siteTheme,
  contentView,
  docs,
  media,
  editor,
  loop,
  previewLink,
  isAuthenticated,
  actions
}) {
  useContentSceneController({
    isAuthenticated,
    onHydrateContent: actions.onHydrateContent,
    onSetError: actions.onSceneError
  });

  const isEditorView = contentView === 'editor';
  const selectedDocType = docs?.getSelectedDocType?.();
  let selectedType = 'post';
  if (selectedDocType === 'post' || selectedDocType === 'page') {
    selectedType = selectedDocType;
  } else if (editor?.postType === 'page') {
    selectedType = 'page';
  }

  const themeTokens = useMemo(
    () => ({
      ...toCssVars(theme || {}, { prefix: '--ep-admin' }),
      ...toCssVars(siteTheme || theme || {}, { prefix: '--ep-site' })
    }),
    [theme, siteTheme]
  );

  const devTools = useDevToolsState({
    blocks: editor?.blocks || [],
    themeTokens
  });
  const hasLoadedEditorMediaRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !isEditorView || !media?.refresh || hasLoadedEditorMediaRef.current) {
      return;
    }
    hasLoadedEditorMediaRef.current = true;
    media.refresh().catch((error) => {
      actions.onSceneError?.(error instanceof Error ? error.message : String(error));
    });
  }, [actions, isAuthenticated, isEditorView, media]);

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

  const selectedDoc = docs.getSelectedDoc?.();
  const hasSelection = Boolean(docs.selectedId && selectedDoc);
  const selectedMeta = selectedDoc?.ui || {
    slug: '',
    excerpt: '',
    type: selectedType,
    categories: [],
    tags: [],
    taxonomyMode: 'hierarchical',
    featuredImageId: ''
  };

  return (
    <View style={{ flex: 1, minHeight: 760, flexDirection: 'row', gap: 20 }}>
      <View style={layoutStyles.contentEditorPane}>
        <View style={{ flex: 1 }}>
          <EditorCanvas
            blocks={editor.blocks}
            setBlocks={editor.setBlocks}
            palette={palette}
            theme={theme}
            siteTheme={siteTheme}
            title={docs.title}
            onTitleChange={docs.setTitle}
            postId={docs.selectedId}
            postType={selectedType}
          />
        </View>
        {devTools.isAvailable ? (
          <DevToolsPanel
            isOpen={devTools.isOpen}
            onToggle={devTools.toggleOpen}
            activeTab={devTools.activeTab}
            onSelectTab={devTools.selectTab}
            tabs={devTools.tabs}
            blocks={devTools.blocks}
            canonicalNodes={devTools.canonicalNodes}
            selectedBlockIndex={devTools.selectedBlockIndex}
            onSelectBlock={devTools.selectBlock}
            expandedNodes={devTools.expandedNodes}
            onToggleExpand={devTools.toggleNodeExpanded}
            diagnostics={devTools.diagnostics}
            tracerData={devTools.tracerData}
            tracerStep={devTools.tracerStep}
            onTracerStepChange={devTools.selectTracerStep}
            onTracerPrev={devTools.prevTracerStep}
            onTracerNext={devTools.nextTracerStep}
            themeTokens={devTools.themeTokens}
            palette={palette}
          />
        ) : null}
      </View>

      <View style={[layoutStyles.publishRail, { borderLeftColor: palette.border }]}> 
        <ContentSettingsPanel
          palette={palette}
          hasSelection={hasSelection}
          meta={selectedMeta}
          mediaItems={media?.items || []}
          onUpdateMeta={(patch) => docs.updateMeta?.(docs.selectedId, patch)}
          onRefreshMedia={() => media?.refresh?.()}
          onUploadMedia={(files) => media?.uploadFiles?.(files)}
          isUploadingMedia={media?.isUploading}
        />
        <PublishPanel
          palette={palette}
          hasSelection={hasSelection}
          loop={loop}
          previewLink={previewLink}
          actions={{
            onPublish: actions.onPublish,
            onSave: actions.onSave,
            onPreview: () => actions.onPreview?.(siteTheme || theme)
          }}
        />
      </View>
    </View>
  );
}
