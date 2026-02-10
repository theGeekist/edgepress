import { createUser } from '@geekist/edgepress/domain/entities.js';

import { createInMemoryState } from './shared/state.js';
import { createRuntimePlatform } from './store/runtime.js';
import { createAuthFeature } from './store/auth.js';
import { createContentModelFeature } from './store/content-model.js';
import { createDocumentsFeature } from './store/documents.js';
import { createMediaFeature } from './store/media.js';
import { createPublishFeature } from './store/publish.js';
import { createNavigationFeature } from './store/navigation.js';
import { createReleaseFeature } from './store/release.js';
import { createBlobStoreFeature } from './store/blob.js';
import { createCacheStoreFeature } from './store/cache.js';
import { createPreviewStoreFeature } from './store/preview.js';
import { createCoordinationFeature } from './store/coordination.js';

export function createInMemoryPlatform() {
  const state = createInMemoryState();
  const runtime = createRuntimePlatform();

  // Add rateLimit to runtime with state dependency
  runtime.rateLimit = async function rateLimit(key, policy = { max: 10, windowMs: 60000 }) {
    const now = Date.now();
    const entry = state.rateLimitHits.get(key) || [];
    const filtered = entry.filter((ts) => now - ts < policy.windowMs);
    if (filtered.length >= policy.max) {
      return { allowed: false, retryAfter: Math.ceil(policy.windowMs / 1000) };
    }
    filtered.push(now);
    state.rateLimitHits.set(key, filtered);
    return { allowed: true };
  };

  const coordination = createCoordinationFeature();

  const blobStore = createBlobStoreFeature(state, runtime);
  const cacheStore = createCacheStoreFeature(state);
  const releaseStore = createReleaseFeature(state, runtime);

  // Wire up releaseStore dependencies
  state.blobStore = blobStore;

  const previewStore = createPreviewStoreFeature(state);

  const auth = createAuthFeature(state, runtime);
  const contentModel = createContentModelFeature(state, runtime);
  const documents = createDocumentsFeature(state, runtime);
  const media = createMediaFeature(state, runtime);
  const publish = createPublishFeature(state, runtime);
  const navigation = createNavigationFeature(state, runtime);

  const store = {
    async tx(fn) {
      return fn(this);
    },
    ...auth,
    ...contentModel,
    ...documents,
    ...media,
    ...publish,
    ...navigation
  };

  // Seed default data
  store.seedUser(createUser({ id: 'u_admin', username: 'admin', password: 'admin', role: 'admin' }));
  store.upsertContentType({
    id: 'ct_page',
    slug: 'page',
    label: 'Page',
    supports: { title: true, editor: true, excerpt: true, featuredImage: true, revisions: true },
    fields: [],
    taxonomies: ['category', 'post_tag'],
    statusOptions: ['draft', 'published', 'trash']
  });
  store.upsertContentType({
    id: 'ct_post',
    slug: 'post',
    label: 'Post',
    supports: { title: true, editor: true, excerpt: true, featuredImage: true, revisions: true },
    fields: [],
    taxonomies: ['category', 'post_tag'],
    statusOptions: ['draft', 'published', 'trash']
  });
  store.upsertTaxonomy({
    id: 'tax_category',
    slug: 'category',
    label: 'Categories',
    hierarchical: true,
    objectTypes: ['page', 'post'],
    constraints: { maxDepth: null, uniqueTermNameWithinSiblings: true }
  });
  store.upsertTaxonomy({
    id: 'tax_post_tag',
    slug: 'post_tag',
    label: 'Tags',
    hierarchical: false,
    objectTypes: ['page', 'post'],
    constraints: { maxDepth: null, uniqueTermNameWithinSiblings: false }
  });

  return { runtime, store, blobStore, cacheStore, releaseStore, previewStore, coordination, state };
}
