const HOST_ENTITY_CONFIGS = [
  {
    kind: 'root',
    name: 'postType',
    baseURL: '/wp/v2/types',
    key: 'slug'
  },
  {
    kind: 'postType',
    name: 'post',
    baseURL: '/wp/v2/posts',
    key: 'id'
  },
  {
    kind: 'postType',
    name: 'page',
    baseURL: '/wp/v2/pages',
    key: 'id'
  },
  {
    kind: 'root',
    name: 'site',
    baseURL: '/wp/v2/settings'
  }
];

const EMPTY_EDITOR_CONTRACT = {
  titlePlaceholder: 'Add title',
  initialBlockName: 'core/paragraph',
  hasFixedToolbar: false,
  selectFirstBlockOnEmptySelection: true
};

export function normalizeHostPostType(postType) {
  return postType === 'page' || postType === 'post' ? postType : 'post';
}

export function normalizeHostPostId(postId) {
  return toWpNumericId(postId || 'editor-local');
}

export function toWpNumericId(internalId) {
  const text = String(internalId || '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash * 31) + text.charCodeAt(i)) | 0;
  }
  const value = Math.abs(hash) % 2147483647;
  return value === 0 ? 1 : value;
}

export function getHostEntityConfigs() {
  return HOST_ENTITY_CONFIGS.map((entity) => ({ ...entity }));
}

export function getEmptyEditorContract() {
  return { ...EMPTY_EDITOR_CONTRACT };
}

export function buildHostBootstrapContract({ postId, postType, title, serializedContent }) {
  const normalizedPostType = normalizeHostPostType(postType);
  const normalizedPostId = normalizeHostPostId(postId);
  const normalizedTitle = String(title || '');
  const normalizedContent = String(serializedContent || '');

  const singular = normalizedPostType === 'page' ? 'Page' : 'Post';
  const plural = normalizedPostType === 'page' ? 'Pages' : 'Posts';

  return {
    postType: normalizedPostType,
    postId: normalizedPostId,
    entities: getHostEntityConfigs(),
    records: {
      editedEntity: {
        kind: 'postType',
        name: normalizedPostType,
        record: {
          id: normalizedPostId,
          type: normalizedPostType,
          status: 'draft',
          title: {
            raw: normalizedTitle,
            rendered: normalizedTitle
          },
          content: {
            raw: normalizedContent,
            rendered: normalizedContent
          }
        }
      },
      postTypeConfig: {
        kind: 'root',
        name: 'postType',
        record: {
          slug: normalizedPostType,
          viewable: true,
          supports: {
            title: true,
            editor: true,
            excerpt: true,
            thumbnail: true,
            author: true
          },
          labels: {
            name: plural,
            singular_name: singular,
            add_new_item: `Add New ${singular}`,
            edit_item: `Edit ${singular}`,
            view_item: `View ${singular}`,
            item_published: `${singular} published.`,
            item_published_privately: `${singular} published privately.`,
            item_reverted_to_draft: `${singular} reverted to draft.`,
            item_scheduled: `${singular} scheduled.`,
            item_updated: `${singular} updated.`,
            item_trashed: `${singular} moved to trash.`
          }
        }
      }
    },
    edits: {
      title: normalizedTitle,
      content: normalizedContent
    },
    editor: getEmptyEditorContract()
  };
}

export function applyHostBootstrap({ coreDispatch, contract }) {
  coreDispatch.receiveEntityRecords(
    contract.records.editedEntity.kind,
    contract.records.editedEntity.name,
    contract.records.editedEntity.record
  );
  coreDispatch.receiveEntityRecords(
    contract.records.postTypeConfig.kind,
    contract.records.postTypeConfig.name,
    contract.records.postTypeConfig.record
  );
  if (typeof coreDispatch.editEntityRecord === 'function') {
    coreDispatch.editEntityRecord(
      'postType',
      contract.postType,
      contract.postId,
      contract.edits,
      { undoIgnore: true }
    );
  }
}
