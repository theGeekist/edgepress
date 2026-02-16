import {
  fromWpStatus,
  loadDocumentByType,
  parseFieldString,
  resolveInternalIdForWpId,
  resolveInternalMediaIdForWpId,
  toWpNumericId,
  toWpPost
} from '@geekist/edgepress/wp-core';

function parseNullableWpField(body, key) {
  if (body?.[key] === undefined || body?.[key] === null) return undefined;
  return parseFieldString(body[key]);
}

export function registerWpCorePostPageRoutes({
  add,
  runtime,
  store,
  authzErrorResponse,
  requireCapability,
  json,
  readJson,
  notFoundEntity
}) {
  function registerListRoute(path, type) {
    add('GET', path, async (request) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        const url = new URL(request.url);
        const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1);
        const pageSize = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get('per_page') || '100', 10) || 100));
        const status = url.searchParams.get('status') || 'all';
        const slug = String(url.searchParams.get('slug') || '').trim().toLowerCase();
        const query = {
          type,
          status,
          sortBy: 'updatedAt',
          sortDir: 'desc',
          ...(slug ? { slug } : { page, pageSize })
        };
        const listed = await store.listDocuments(query);
        const items = Array.isArray(listed?.items) ? listed.items : [];
        return json(items.map((doc) => toWpPost(doc, request.url, toWpNumericId)));
      } catch (e) {
        return authzErrorResponse(e);
      }
    });
  }

  registerListRoute('/posts', 'post');
  registerListRoute('/pages', 'page');

  add('GET', '/posts/:id', async (request, params) => {
    try {
      await requireCapability({ runtime, store, request, capability: 'document:read' });
      const internalId = await resolveInternalIdForWpId(store, 'post', params.id);
      if (!internalId) return notFoundEntity('post');
      const doc = await loadDocumentByType(store, 'post', internalId);
      if (!doc) return notFoundEntity('post');
      return json(toWpPost(doc, request.url, toWpNumericId));
    } catch (e) {
      return authzErrorResponse(e);
    }
  });

  add('GET', '/pages/:id', async (request, params) => {
    try {
      await requireCapability({ runtime, store, request, capability: 'document:read' });
      const internalId = await resolveInternalIdForWpId(store, 'page', params.id);
      if (!internalId) return notFoundEntity('page');
      const doc = await loadDocumentByType(store, 'page', internalId);
      if (!doc) return notFoundEntity('page');
      return json(toWpPost(doc, request.url, toWpNumericId));
    } catch (e) {
      return authzErrorResponse(e);
    }
  });

  add('POST', '/posts', async (request) => {
    try {
      const user = await requireCapability({ runtime, store, request, capability: 'document:write' });
      const body = await readJson(request);
      const id = `doc_${runtime.uuid()}`;
      const content = parseFieldString(body.content);
      const featuredImageId = await resolveInternalMediaIdForWpId(store, body.featured_media);
      const created = await store.createDocument({
        id,
        title: parseFieldString(body.title) || 'Untitled',
        content,
        legacyHtml: content,
        type: 'post',
        slug: String(body.slug || ''),
        featuredImageId,
        status: fromWpStatus(body.status),
        createdBy: user.id
      });
      return json(toWpPost(created, request.url, toWpNumericId), 201);
    } catch (e) {
      return authzErrorResponse(e);
    }
  });

  add('POST', '/pages', async (request) => {
    try {
      const user = await requireCapability({ runtime, store, request, capability: 'document:write' });
      const body = await readJson(request);
      const id = `doc_${runtime.uuid()}`;
      const content = parseFieldString(body.content);
      const featuredImageId = await resolveInternalMediaIdForWpId(store, body.featured_media);
      const created = await store.createDocument({
        id,
        title: parseFieldString(body.title) || 'Untitled',
        content,
        legacyHtml: content,
        type: 'page',
        slug: String(body.slug || ''),
        featuredImageId,
        status: fromWpStatus(body.status),
        createdBy: user.id
      });
      return json(toWpPost(created, request.url, toWpNumericId), 201);
    } catch (e) {
      return authzErrorResponse(e);
    }
  });

  add('POST', '/posts/:id', async (request, params) => {
    try {
      await requireCapability({ runtime, store, request, capability: 'document:write' });
      const internalId = await resolveInternalIdForWpId(store, 'post', params.id);
      if (!internalId) return notFoundEntity('post');
      const existing = await loadDocumentByType(store, 'post', internalId);
      if (!existing) return notFoundEntity('post');
      const body = await readJson(request);
      const parsedContent = parseNullableWpField(body, 'content');
      const nextContent = parsedContent ?? existing.legacyHtml ?? existing.content;
      const parsedTitle = parseNullableWpField(body, 'title');
      const nextTitle = parsedTitle ?? existing.title;
      const featuredImageId = body.featured_media == null
        ? existing.featuredImageId
        : await resolveInternalMediaIdForWpId(store, body.featured_media);
      const updated = await store.updateDocument(internalId, {
        title: nextTitle,
        content: nextContent,
        legacyHtml: nextContent,
        slug: body.slug ?? existing.slug,
        featuredImageId,
        status: body.status != null ? fromWpStatus(body.status) : existing.status,
        excerpt: existing.excerpt || '',
        fields: existing.fields || {},
        termIds: existing.termIds || [],
        raw: existing.raw || {},
        blocks: existing.blocks || [],
        blocksSchemaVersion: body.blocksSchemaVersion ?? existing.blocksSchemaVersion ?? 1
      });
      return json(toWpPost(updated, request.url, toWpNumericId));
    } catch (e) {
      return authzErrorResponse(e);
    }
  });

  add('POST', '/pages/:id', async (request, params) => {
    try {
      await requireCapability({ runtime, store, request, capability: 'document:write' });
      const internalId = await resolveInternalIdForWpId(store, 'page', params.id);
      if (!internalId) return notFoundEntity('page');
      const existing = await loadDocumentByType(store, 'page', internalId);
      if (!existing) return notFoundEntity('page');
      const body = await readJson(request);
      const parsedContent = parseNullableWpField(body, 'content');
      const nextContent = parsedContent ?? existing.legacyHtml ?? existing.content;
      const parsedTitle = parseNullableWpField(body, 'title');
      const nextTitle = parsedTitle ?? existing.title;
      const featuredImageId = body.featured_media == null
        ? existing.featuredImageId
        : await resolveInternalMediaIdForWpId(store, body.featured_media);
      const updated = await store.updateDocument(internalId, {
        title: nextTitle,
        content: nextContent,
        legacyHtml: nextContent,
        slug: body.slug ?? existing.slug,
        featuredImageId,
        status: body.status != null ? fromWpStatus(body.status) : existing.status,
        excerpt: existing.excerpt || '',
        fields: existing.fields || {},
        termIds: existing.termIds || [],
        raw: existing.raw || {},
        blocks: existing.blocks || [],
        blocksSchemaVersion: body.blocksSchemaVersion ?? existing.blocksSchemaVersion ?? 1
      });
      return json(toWpPost(updated, request.url, toWpNumericId));
    } catch (e) {
      return authzErrorResponse(e);
    }
  });
}
