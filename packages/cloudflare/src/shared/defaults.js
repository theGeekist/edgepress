import {
  createContentType,
  createTaxonomy
} from '@geekist/edgepress/domain/entities.js';

export function buildDefaultContentTypes(now) {
  return [
    createContentType({
      id: 'ct_page',
      slug: 'page',
      label: 'Page',
      supports: { title: true, editor: true, excerpt: true, featuredImage: true, revisions: true },
      fields: [],
      taxonomies: ['category', 'post_tag'],
      statusOptions: ['draft', 'published', 'trash'],
      now
    }),
    createContentType({
      id: 'ct_post',
      slug: 'post',
      label: 'Post',
      supports: { title: true, editor: true, excerpt: true, featuredImage: true, revisions: true },
      fields: [],
      taxonomies: ['category', 'post_tag'],
      statusOptions: ['draft', 'published', 'trash'],
      now
    })
  ];
}

export function buildDefaultTaxonomies(now) {
  return [
    createTaxonomy({
      id: 'tax_category',
      slug: 'category',
      label: 'Categories',
      hierarchical: true,
      objectTypes: ['page', 'post'],
      constraints: { maxDepth: null, uniqueTermNameWithinSiblings: true },
      now
    }),
    createTaxonomy({
      id: 'tax_post_tag',
      slug: 'post_tag',
      label: 'Tags',
      hierarchical: false,
      objectTypes: ['page', 'post'],
      constraints: { maxDepth: null, uniqueTermNameWithinSiblings: false },
      now
    })
  ];
}

export async function ensureDefaults(storeImpl) {
  const contentTypes = await storeImpl.listContentTypes();
  if (!Array.isArray(contentTypes) || contentTypes.length === 0) {
    await storeImpl.upsertContentType({
      id: 'ct_page',
      slug: 'page',
      label: 'Page',
      supports: { title: true, editor: true, excerpt: true, featuredImage: true, revisions: true },
      fields: [],
      taxonomies: ['category', 'post_tag'],
      statusOptions: ['draft', 'published', 'trash']
    });
    await storeImpl.upsertContentType({
      id: 'ct_post',
      slug: 'post',
      label: 'Post',
      supports: { title: true, editor: true, excerpt: true, featuredImage: true, revisions: true },
      fields: [],
      taxonomies: ['category', 'post_tag'],
      statusOptions: ['draft', 'published', 'trash']
    });
  }
  const taxonomies = await storeImpl.listTaxonomies();
  if (!Array.isArray(taxonomies) || taxonomies.length === 0) {
    await storeImpl.upsertTaxonomy({
      id: 'tax_category',
      slug: 'category',
      label: 'Categories',
      hierarchical: true,
      objectTypes: ['page', 'post'],
      constraints: { maxDepth: null, uniqueTermNameWithinSiblings: true }
    });
    await storeImpl.upsertTaxonomy({
      id: 'tax_post_tag',
      slug: 'post_tag',
      label: 'Tags',
      hierarchical: false,
      objectTypes: ['page', 'post'],
      constraints: { maxDepth: null, uniqueTermNameWithinSiblings: false }
    });
  }
}
