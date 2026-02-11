import { requireCapability } from '../auth.js';
import { json, readJson } from '../http.js';

function notFoundEntity(entityType = 'post') {
  return json(
    {
      code: 'rest_post_invalid_id',
      message: `Invalid ${entityType} ID.`,
      data: { status: 404 }
    },
    404
  );
}

function parseFieldString(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    if (typeof value.raw === 'string') return value.raw;
    if (typeof value.rendered === 'string') return value.rendered;
  }
  return '';
}

function toWpPost(doc, requestUrl) {
  const type = doc?.type === 'post' ? 'post' : 'page';
  const title = String(doc?.title || '');
  const content = String(doc?.legacyHtml ?? doc?.content ?? '');
  const excerpt = String(doc?.excerpt || '');
  const date = doc?.createdAt || new Date().toISOString();
  const modified = doc?.updatedAt || date;
  const slug = String(doc?.slug || '');
  const siteOrigin = new URL(requestUrl).origin;
  const permalinkPath = slug ? `/${slug}` : '/';
  return {
    id: toWpNumericId(doc.id),
    date,
    date_gmt: date,
    modified,
    modified_gmt: modified,
    slug,
    status: doc?.status || 'draft',
    type,
    link: `${siteOrigin}${permalinkPath}`,
    title: { raw: title, rendered: title },
    content: { raw: content, rendered: content, protected: false },
    excerpt: { raw: excerpt, rendered: excerpt, protected: false },
    featured_media: doc?.featuredImageId ? toWpNumericId(doc.featuredImageId) : 0,
    meta: {}
  };
}

function toWpNumericId(internalId) {
  const text = String(internalId || '');
  // Deterministic non-zero 31-bit hash for WP-facing numeric entity IDs.
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash * 31) + text.charCodeAt(i)) | 0;
  }
  const value = Math.abs(hash) % 2147483647;
  return value === 0 ? 1 : value;
}

async function resolveInternalIdForWpId(store, type, idParam) {
  const raw = String(idParam || '').trim();
  if (!raw) return null;
  if (raw.startsWith('doc_')) {
    const byInternal = await loadDocumentByType(store, type, raw);
    return byInternal ? raw : null;
  }
  const numeric = Number.parseInt(raw, 10);
  if (!Number.isFinite(numeric)) return null;
  const rows = await listByType(store, type);
  const match = rows.find((doc) => toWpNumericId(doc.id) === numeric);
  return match?.id || null;
}

function toPostTypeRecord(type) {
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

function normalizeTypeParam(typeParam) {
  return typeParam === 'post' ? 'post' : 'page';
}

async function loadDocumentByType(store, type, id) {
  const doc = await store.getDocument(id);
  if (!doc) return null;
  if ((doc.type || 'page') !== type) return null;
  return doc;
}

async function listByType(store, type) {
  const listed = await store.listDocuments({
    type,
    status: 'all',
    sortBy: 'updatedAt',
    sortDir: 'desc',
    page: 1,
    pageSize: 100
  });
  return Array.isArray(listed?.items) ? listed.items : [];
}

export function createWpCoreRoutes({ runtime, store, route, authzErrorResponse }) {
  const prefixes = ['/wp/v2', '/v1/wp/v2'];
  const routes = [];

  function add(method, suffix, handler) {
    for (const prefix of prefixes) {
      routes.push(route(method, `${prefix}${suffix}`, handler));
    }
  }

  add('GET', '/settings', async (request) => {
    try {
      await requireCapability({ runtime, store, request, capability: 'document:read' });
      return json({
        title: 'GCMS Site',
        description: '',
        url: new URL(request.url).origin,
        email: 'admin@example.com',
        timezone: 'UTC',
        date_format: 'F j, Y',
        time_format: 'g:i a',
        start_of_week: 1,
        language: 'en_US',
        use_smilies: true,
        default_category: 1,
        default_post_format: '0',
        posts_per_page: 10,
        show_on_front: 'posts',
        page_on_front: 0,
        page_for_posts: 0,
        default_ping_status: 'open',
        default_comment_status: 'open',
        site_logo: 0,
        site_icon: 0
      });
    } catch (e) {
      return authzErrorResponse(e);
    }
  });

  // WP data clients sometimes request site root settings from base API root.
  routes.push(
    route('GET', '/v1', async (request) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        return json({
          name: 'GCMS Site',
          description: '',
          url: new URL(request.url).origin,
          home: new URL(request.url).origin,
          gmt_offset: 0,
          timezone_string: 'UTC',
          site_icon: 0,
          site_icon_url: '',
          site_logo: 0,
          page_for_posts: 0,
          page_on_front: 0,
          show_on_front: 'posts'
        });
      } catch (e) {
        return authzErrorResponse(e);
      }
    })
  );

  add('GET', '/themes', async (request) => {
    try {
      await requireCapability({ runtime, store, request, capability: 'document:read' });
      return json([
        {
          stylesheet: 'edgepress',
          template: 'edgepress',
          slug: 'edgepress',
          status: 'active',
          name: { raw: 'EdgePress' },
          version: '1.0.0',
          author: { raw: 'EdgePress' }
        }
      ]);
    } catch (e) {
      return authzErrorResponse(e);
    }
  });

  add('GET', '/types', async (request) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        const types = await store.listContentTypes();
        const items = (types || []).filter((entry) => entry?.kind === 'content');
        const payload = {};
        for (const entry of items) {
          payload[entry.slug] = toPostTypeRecord(entry.slug);
        }
        if (!payload.post) payload.post = toPostTypeRecord('post');
        if (!payload.page) payload.page = toPostTypeRecord('page');
        return json(payload);
      } catch (e) {
        return authzErrorResponse(e);
      }
    });

  add('GET', '/types/:type', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        const type = normalizeTypeParam(params.type);
        return json(toPostTypeRecord(type));
      } catch (e) {
        return authzErrorResponse(e);
      }
    });

  add('GET', '/posts', async (request) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        const url = new URL(request.url);
        const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1);
        const pageSize = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get('per_page') || '100', 10) || 100));
        const status = url.searchParams.get('status') || 'all';
        const slug = String(url.searchParams.get('slug') || '').trim().toLowerCase();
        const listed = await store.listDocuments({ type: 'post', status, sortBy: 'updatedAt', sortDir: 'desc', page, pageSize });
        const items = (Array.isArray(listed?.items) ? listed.items : []).filter((entry) => {
          if (!slug) return true;
          return String(entry?.slug || '').toLowerCase() === slug;
        });
        return json(items.map((doc) => toWpPost(doc, request.url)));
      } catch (e) {
        return authzErrorResponse(e);
      }
    });

  add('GET', '/pages', async (request) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        const url = new URL(request.url);
        const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1);
        const pageSize = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get('per_page') || '100', 10) || 100));
        const status = url.searchParams.get('status') || 'all';
        const slug = String(url.searchParams.get('slug') || '').trim().toLowerCase();
        const listed = await store.listDocuments({ type: 'page', status, sortBy: 'updatedAt', sortDir: 'desc', page, pageSize });
        const items = (Array.isArray(listed?.items) ? listed.items : []).filter((entry) => {
          if (!slug) return true;
          return String(entry?.slug || '').toLowerCase() === slug;
        });
        return json(items.map((doc) => toWpPost(doc, request.url)));
      } catch (e) {
        return authzErrorResponse(e);
      }
    });

  add('GET', '/posts/:id', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        const internalId = await resolveInternalIdForWpId(store, 'post', params.id);
        if (!internalId) return notFoundEntity('post');
        const doc = await loadDocumentByType(store, 'post', internalId);
        if (!doc) return notFoundEntity('post');
        return json(toWpPost(doc, request.url));
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
        return json(toWpPost(doc, request.url));
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
        const created = await store.createDocument({
          id,
          title: parseFieldString(body.title) || 'Untitled',
          content,
          legacyHtml: content,
          type: 'post',
          slug: String(body.slug || ''),
          featuredImageId: body.featured_media || '',
          status: String(body.status || 'draft'),
          createdBy: user.id
        });
        return json(toWpPost(created, request.url), 201);
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
        const created = await store.createDocument({
          id,
          title: parseFieldString(body.title) || 'Untitled',
          content,
          legacyHtml: content,
          type: 'page',
          slug: String(body.slug || ''),
          featuredImageId: body.featured_media || '',
          status: String(body.status || 'draft'),
          createdBy: user.id
        });
        return json(toWpPost(created, request.url), 201);
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
        const nextContent = parseFieldString(body.content) || existing.legacyHtml || existing.content;
        const updated = await store.updateDocument(internalId, {
          title: parseFieldString(body.title) || existing.title,
          content: nextContent,
          legacyHtml: nextContent,
          slug: body.slug ?? existing.slug,
          featuredImageId: body.featured_media ?? existing.featuredImageId,
          status: body.status ?? existing.status,
          excerpt: existing.excerpt || '',
          fields: existing.fields || {},
          termIds: existing.termIds || [],
          raw: existing.raw || {},
          blocks: existing.blocks || [],
          blocksSchemaVersion: existing.blocksSchemaVersion
        });
        return json(toWpPost(updated, request.url));
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
        const nextContent = parseFieldString(body.content) || existing.legacyHtml || existing.content;
        const updated = await store.updateDocument(internalId, {
          title: parseFieldString(body.title) || existing.title,
          content: nextContent,
          legacyHtml: nextContent,
          slug: body.slug ?? existing.slug,
          featuredImageId: body.featured_media ?? existing.featuredImageId,
          status: body.status ?? existing.status,
          excerpt: existing.excerpt || '',
          fields: existing.fields || {},
          termIds: existing.termIds || [],
          raw: existing.raw || {},
          blocks: existing.blocks || [],
          blocksSchemaVersion: existing.blocksSchemaVersion
        });
        return json(toWpPost(updated, request.url));
      } catch (e) {
        return authzErrorResponse(e);
      }
    });

  return routes;
}
