export function toPostTypeRecord(type) {
  const isPage = type === 'page';
  const singular = isPage ? 'Page' : 'Post';
  const plural = isPage ? 'Pages' : 'Posts';
  return {
    slug: type,
    name: plural,
    rest_base: `${type}s`,
    viewable: true,
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
    },
    supports: {
      title: true,
      editor: true,
      excerpt: true,
      thumbnail: true,
      author: true
    }
  };
}

export function toWpTaxonomyRecord(taxonomy) {
  const slug = String(taxonomy?.slug || '');
  const singular = String(taxonomy?.name || slug || 'Taxonomy');
  const name = String(taxonomy?.label || taxonomy?.name || slug || 'Taxonomies');
  const hierarchical = Boolean(taxonomy?.hierarchical);
  const objectTypes = Array.isArray(taxonomy?.objectTypes) ? taxonomy.objectTypes.filter(Boolean) : ['post'];
  return {
    slug,
    name,
    description: String(taxonomy?.description || ''),
    hierarchical,
    types: objectTypes,
    rest_base: slug,
    visibility: {
      public: true,
      publicly_queryable: true,
      show_admin_column: true,
      show_in_nav_menus: true,
      show_in_quick_edit: true,
      show_ui: true
    },
    labels: {
      name,
      singular_name: singular
    }
  };
}
