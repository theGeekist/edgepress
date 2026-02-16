import { MediaListTable, MediaEditorView } from '@features/media';

export function MediaScene({ palette, media, mediaView, actions }) {
  const selectedItem = media.getSelectedItem();
  const currentIndex = selectedItem ? media.items.findIndex((item) => item.id === selectedItem.id) : -1;
  const totalItems = media.items.length;

  if (mediaView === 'editor' && selectedItem) {
    return (
      <MediaEditorView
        palette={palette}
        media={media}
        item={selectedItem}
        currentIndex={currentIndex}
        totalItems={totalItems}
        onBackToList={actions.onOpenMediaList}
        onSelectPrev={() => {
          if (currentIndex <= 0) return;
          actions.onEditMedia(media.items[currentIndex - 1]);
        }}
        onSelectNext={() => {
          if (currentIndex < 0 || currentIndex >= totalItems - 1) return;
          actions.onEditMedia(media.items[currentIndex + 1]);
        }}
        onSaveSelected={actions.onSaveSelectedMedia}
      />
    );
  }

  return (
    <MediaListTable
      palette={palette}
      media={media}
      onUploadFiles={actions.onUploadMedia}
      onEditMedia={actions.onEditMedia}
      onDeleteMedia={actions.onDeleteMedia}
      onBulkDeleteMedia={actions.onBulkDeleteMedia}
    />
  );
}
