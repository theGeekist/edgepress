import {
  loadDocumentByType,
  resolveInternalIdForWpId,
  resolveInternalMediaIdForWpId,
  toWpNumericId
} from './wp-core-id-map.js';
import { toPostTypeRecord, toWpTaxonomyRecord } from './wp-core-records.js';

function parseFieldString(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    if (typeof value.raw === 'string') return value.raw;
    if (typeof value.rendered === 'string') return value.rendered;
  }
  return '';
}

function toWpStatus(status) {
  const value = String(status || '').trim();
  if (!value) return 'draft';
  return value === 'published' ? 'publish' : value;
}

function fromWpStatus(status) {
  const value = String(status || '').trim();
  if (!value) return 'draft';
  return value === 'publish' ? 'published' : value;
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
  const featuredMediaRaw = String(doc?.featuredImageId || '').trim();
  const featuredMedia = featuredMediaRaw ? toWpNumericId(featuredMediaRaw) : 0;
  return {
    id: toWpNumericId(doc.id),
    date,
    date_gmt: date,
    modified,
    modified_gmt: modified,
    slug,
    status: toWpStatus(doc?.status),
    type,
    link: `${siteOrigin}${permalinkPath}`,
    title: { raw: title, rendered: title },
    content: { raw: content, rendered: content, protected: false },
    excerpt: { raw: excerpt, rendered: excerpt, protected: false },
    featured_media: featuredMedia,
    meta: {}
  };
}

function normalizeTypeParam(typeParam) {
  return String(typeParam || '').trim().toLowerCase();
}

export function createWpCoreRoutes({ runtime, store, route, authzErrorResponse, auth, http }) {
  const { requireCapability } = auth;
  const { json, readJson } = http;
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

  add('GET', '/users/me', async (request) => {
    try {
      const user = await requireCapability({ runtime, store, request, capability: 'document:read' });
      const registeredSource = user?.createdAt ?? user?.registeredAt;
      const registeredDate = (() => {
        if (!registeredSource) return new Date().toISOString();
        const parsed = new Date(registeredSource);
        return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
      })();
      return json({
        id: Number.parseInt(String(user?.id || '').replace(/\D/g, ''), 10) || 1,
        username: user?.username || 'admin',
        name: user?.displayName || user?.username || 'admin',
        first_name: '',
        last_name: '',
        nickname: user?.username || 'admin',
        slug: user?.username || 'admin',
        email: user?.email || 'admin@example.com',
        url: '',
        description: '',
        locale: 'en_US',
        nickname_locked: false,
        registered_date: registeredDate,
        roles: ['administrator'],
        capabilities: {
          edit_posts: true,
          publish_posts: true,
          upload_files: true
        },
        avatar_urls: {
          24: '',
          48: '',
          96: ''
        }
      });
    } catch (e) {
      return authzErrorResponse(e);
    }
  });

  add('GET', '/block-patterns/categories', async (request) => {
    try {
      await requireCapability({ runtime, store, request, capability: 'document:read' });
      return json([]);
    } catch (e) {
      return authzErrorResponse(e);
    }
  });

  add('GET', '/block-patterns/patterns', async (request) => {
    try {
      await requireCapability({ runtime, store, request, capability: 'document:read' });
      return json([]);
    } catch (e) {
      return authzErrorResponse(e);
    }
  });

  add('GET', '/global-styles/themes/:stylesheet', async (request, params) => {
    try {
      await requireCapability({ runtime, store, request, capability: 'document:read' });
      const stylesheet = String(params?.stylesheet || 'edgepress');
      return json({
        id: `global-styles-${stylesheet}`,
        stylesheet,
        settings: {},
        styles: {}
      });
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
        if (!type) {
          return notFoundEntity('type');
        }
        if (type === 'post' || type === 'page') {
          return json(toPostTypeRecord(type));
        }
        const contentTypes = await store.listContentTypes();
        const match = (Array.isArray(contentTypes) ? contentTypes : []).find(
          (entry) => entry?.kind === 'content' && String(entry?.slug || '') === type
        );
        if (!match) {
          return notFoundEntity('type');
        }
        return json(toPostTypeRecord(type));
      } catch (e) {
        return authzErrorResponse(e);
      }
    });

  add('GET', '/templates/lookup', async (request) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        // EdgePress does not currently implement WP block templates.
        // Return a successful null payload so Gutenberg continues without hard-failing.
        return json(null);
      } catch (e) {
        return authzErrorResponse(e);
      }
  });

  add('GET', '/taxonomies', async (request) => {
    try {
      await requireCapability({ runtime, store, request, capability: 'document:read' });
      const listed = await store.listTaxonomies();
      const items = Array.isArray(listed) ? listed : [];
      const payload = {};
      for (const taxonomy of items) {
        if (!taxonomy?.slug) continue;
        payload[taxonomy.slug] = toWpTaxonomyRecord(taxonomy);
      }
      if (!payload.category) {
        payload.category = toWpTaxonomyRecord({
          slug: 'category',
          name: 'Category',
          label: 'Categories',
          hierarchical: true,
          objectTypes: ['post', 'page']
        });
      }
      if (!payload.post_tag) {
        payload.post_tag = toWpTaxonomyRecord({
          slug: 'post_tag',
          name: 'Tag',
          label: 'Tags',
          hierarchical: false,
          objectTypes: ['post', 'page']
        });
      }
      return json(payload);
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
        const featuredImageId = body.featured_media == null
          ? existing.featuredImageId
          : await resolveInternalMediaIdForWpId(store, body.featured_media);
        const updated = await store.updateDocument(internalId, {
          title: parseFieldString(body.title) || existing.title,
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
        const featuredImageId = body.featured_media == null
          ? existing.featuredImageId
          : await resolveInternalMediaIdForWpId(store, body.featured_media);
        const updated = await store.updateDocument(internalId, {
          title: parseFieldString(body.title) || existing.title,
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
        return json(toWpPost(updated, request.url));
      } catch (e) {
        return authzErrorResponse(e);
      }
    });

  return routes;
}
