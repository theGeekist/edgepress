import { createUser } from '@geekist/edgepress/domain/entities.js';

import { appKey, kvIndexAdd, kvIndexRemove, kvSeedUser } from './shared/keys.js';
import { ensureDefaults, buildDefaultContentTypes, buildDefaultTaxonomies } from './shared/defaults.js';
import { createAuthD1, createAuthKv } from './auth.js';
import { createContentModelD1, createContentModelKv } from './content-model.js';
import { createDocumentsD1, createDocumentsKv } from './documents.js';
import { createMediaD1, createMediaKv } from './media.js';
import { createPublishD1, createPublishKv } from './publish.js';
import { createNavigationD1, createNavigationKv } from './navigation.js';
import { createPreviewD1, createPreviewKv } from './previews.js';

export function createAppStores({
  d1,
  kv,
  runtime,
  baseStore,
  basePreviewStore,
  D1_SQL,
  parseJsonSafe,
  kvGetJson,
  kvPutJson,
  kvGetString,
  kvPutString,
  bootstrapAdmin
}) {
  const bootstrapUser = bootstrapAdmin
    ? createUser({
        id: 'u_admin',
        username: bootstrapAdmin.username,
        password: bootstrapAdmin.password,
        role: bootstrapAdmin.role || 'admin'
      })
    : null;

  let kvSeededPromise = null;
  async function ensureKvSeeded() {
    if (!kv?.get || !kv?.put) return;
    if (!kvSeededPromise) {
      kvSeededPromise = (async () => {
        if (!bootstrapUser) return;
        const existing = await kvGetJson(appKey('user', bootstrapUser.id));
        if (existing) return;

        const kvSeedUserFn = kvSeedUser(appKey, kvPutJson, kvPutString);
        await kvSeedUserFn(bootstrapUser, kvIndexAdd(kvGetJson, kvPutJson));

        const now = runtime.now().toISOString();
        const contentTypes = buildDefaultContentTypes(now);
        const taxonomies = buildDefaultTaxonomies(now);

        await kvPutJson(appKey('content_types'), contentTypes.map((entry) => entry.slug));
        await Promise.all(contentTypes.map((entry) => kvPutJson(appKey('content_type', entry.slug), entry)));
        await kvPutJson(appKey('taxonomies'), taxonomies.map((entry) => entry.slug));
        await Promise.all(taxonomies.map((entry) => kvPutJson(appKey('taxonomy', entry.slug), entry)));
      })();
    }
    await kvSeededPromise;
  }

  let d1AppSchemaReady = false;
  async function ensureD1AppSchema() {
    if (!d1 || d1AppSchemaReady) return;
    await d1.exec(D1_SQL.createAppUsers);
    await d1.exec(D1_SQL.createAppRefreshTokens);
    await d1.exec(D1_SQL.createAppDocuments);
    await d1.exec(D1_SQL.createAppRevisions);
    await d1.exec(D1_SQL.createAppMedia);
    await d1.exec(D1_SQL.createAppPublishJobs);
    await d1.exec(D1_SQL.createAppFormSubmissions);
    await d1.exec(D1_SQL.createAppPreviews);
    await d1.exec(D1_SQL.createAppNavigationMenus);
    await d1.exec(D1_SQL.createAppContentTypes);
    await d1.exec(D1_SQL.createAppTaxonomies);
    await d1.exec(D1_SQL.createAppTerms);
    await d1.exec(D1_SQL.createIdxRevisionsDocument);
    await d1.exec(D1_SQL.createIdxFormsFormId);
    await d1.exec(D1_SQL.createIdxPreviewsExpiresAt);
    await d1.exec(D1_SQL.createIdxNavigationMenusUpdatedAt);
    await d1.exec(D1_SQL.createIdxTermsTaxonomySlug);
    if (bootstrapUser) {
      await d1
        .prepare(D1_SQL.upsertUser)
        .bind(bootstrapUser.id, bootstrapUser.username, JSON.stringify(bootstrapUser))
        .run();
    }
    const now = runtime.now().toISOString();
    const contentTypes = buildDefaultContentTypes(now);
    const taxonomies = buildDefaultTaxonomies(now);
    for (const entry of contentTypes) {
      await d1.prepare(D1_SQL.upsertContentType).bind(entry.slug, JSON.stringify(entry), entry.updatedAt).run();
    }
    for (const entry of taxonomies) {
      await d1.prepare(D1_SQL.upsertTaxonomy).bind(entry.slug, JSON.stringify(entry), entry.updatedAt).run();
    }
    d1AppSchemaReady = true;
  }

  function createD1Store() {
    const auth = createAuthD1(d1, D1_SQL, parseJsonSafe, ensureD1AppSchema);
    const contentModel = createContentModelD1(d1, D1_SQL, parseJsonSafe, runtime, ensureD1AppSchema);
    const documents = createDocumentsD1(d1, D1_SQL, parseJsonSafe, runtime, ensureD1AppSchema);
    const media = createMediaD1(d1, D1_SQL, parseJsonSafe, runtime, ensureD1AppSchema);
    const publish = createPublishD1(d1, D1_SQL, parseJsonSafe, runtime, ensureD1AppSchema);
    const navigation = createNavigationD1(d1, D1_SQL, parseJsonSafe, runtime, ensureD1AppSchema);

    return {
      async tx(fn) {
        await ensureD1AppSchema();
        await ensureDefaults(this);
        return fn(this);
      },
      ...auth,
      ...contentModel,
      ...documents,
      ...media,
      ...publish,
      ...navigation
    };
  }

  function createKvStore() {
    const kvIndexAddFn = kvIndexAdd(kvGetJson, kvPutJson);
    const kvIndexRemoveFn = kvIndexRemove(kvGetJson, kvPutJson);
    const kvSeedUserFn = kvSeedUser(appKey, kvPutJson, kvPutString);

    const auth = createAuthKv(appKey, kvGetJson, kvGetString, kvPutJson, kvPutString, ensureKvSeeded, kvSeedUserFn, kvIndexAddFn);
    const contentModel = createContentModelKv(appKey, kvGetJson, kvPutJson, ensureKvSeeded, kvIndexAddFn, runtime);
    const documents = createDocumentsKv(appKey, kvGetJson, kvPutJson, ensureKvSeeded, kvIndexAddFn, runtime);
    const media = createMediaKv(appKey, kvGetJson, kvPutJson, ensureKvSeeded, kvIndexAddFn, kvIndexRemoveFn, runtime);
    const publish = createPublishKv(appKey, kvGetJson, kvPutJson, ensureKvSeeded, runtime);
    const navigation = createNavigationKv(appKey, kvGetJson, kvPutJson, ensureKvSeeded, kvIndexAddFn, runtime);

    const kvDelete = kv?.delete ? kv.delete.bind(kv) : null;

    return {
      async tx(fn) {
        await ensureKvSeeded();
        await ensureDefaults(this);
        return fn(this);
      },
      ...auth,
      ...contentModel,
      ...documents,
      ...media,
      ...publish,
      ...navigation,
      deleteDocument: (id, opts) => documents.deleteDocument(id, opts, kvDelete),
      deleteMedia: (id) => media.deleteMedia(id, kvDelete),
      revokeRefreshToken: async (_token) => {
        await ensureKvSeeded();
        if (kvDelete) await kvDelete(appKey('refresh', _token));
      }
    };
  }

  function createD1PreviewStore() {
    return createPreviewD1(d1, D1_SQL, parseJsonSafe, ensureD1AppSchema);
  }

  function createKvPreviewStore() {
    return createPreviewKv(appKey, kvGetJson, kvPutJson, ensureKvSeeded);
  }

  if (d1) {
    return {
      store: createD1Store(),
      previewStore: createD1PreviewStore()
    };
  }

  if (kv?.get && kv?.put) {
    return {
      store: createKvStore(),
      previewStore: createKvPreviewStore()
    };
  }

  return {
    store: baseStore,
    previewStore: basePreviewStore
  };
}
