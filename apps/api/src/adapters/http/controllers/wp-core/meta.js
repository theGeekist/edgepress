import { toWpNumericId } from '@geekist/edgepress/wp-core';

function toWpPatternRecord(document, requestUrl) {
  const title = String(document?.title || '');
  const content = String(document?.legacyHtml ?? document?.content ?? '');
  const slug = String(document?.slug || '');
  const createdAt = String(document?.createdAt || '1970-01-01T00:00:00.000Z');
  const updatedAt = String(document?.updatedAt || createdAt);
  const origin = new URL(requestUrl).origin;
  return {
    id: toWpNumericId(document?.id),
    slug,
    title: { raw: title, rendered: title },
    content: { raw: content, rendered: content },
    status: String(document?.status || 'draft'),
    type: String(document?.type || 'pattern'),
    date: createdAt,
    modified: updatedAt,
    link: `${origin}/${slug}`
  };
}

async function listRegistryDocuments({ request, store, type }) {
  const url = new URL(request.url);
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get('per_page') || '100', 10) || 100));
  const status = String(url.searchParams.get('status') || 'all');
  const query = {
    type,
    status,
    sortBy: 'updatedAt',
    sortDir: 'desc',
    page,
    pageSize
  };
  const listed = await store.listDocuments(query);
  const items = Array.isArray(listed?.items) ? listed.items.slice() : [];
  // Re-sort for deterministic tie-breaking when stores return same-timestamp rows in non-stable order.
  items.sort((a, b) => {
    const aUpdatedAt = String(a?.updatedAt || '');
    const bUpdatedAt = String(b?.updatedAt || '');
    if (aUpdatedAt !== bUpdatedAt) {
      return bUpdatedAt.localeCompare(aUpdatedAt);
    }
    const aId = String(a?.id || '');
    const bId = String(b?.id || '');
    return aId.localeCompare(bId, 'en', { numeric: true, sensitivity: 'base' });
  });
  return items;
}

function toWpRoles(user) {
  const explicitRoles = Array.isArray(user?.roles) ? user.roles.map((entry) => String(entry || '').trim()).filter(Boolean) : [];
  if (explicitRoles.length > 0) return explicitRoles;

  const role = String(user?.role || '').trim().toLowerCase();
  if (!role) return [];
  if (role === 'admin') return ['administrator'];
  if (role === 'editor') return ['editor'];
  if (role === 'viewer') return ['subscriber'];
  return [role];
}

export function registerWpCoreMetaRoutes({ add, runtime, store, authzErrorResponse, requireCapability, json }) {
  add('GET', '/settings', async (request) => {
    try {
      await requireCapability({ runtime, store, request, capability: 'document:read' });
      const origin = new URL(request.url).origin;
      const siteTitle = runtime.env('SITE_TITLE') || 'GCMS Site';
      const adminEmail = runtime.env('ADMIN_EMAIL') || 'admin@example.com';
      return json({
        title: siteTitle,
        description: '',
        url: origin,
        email: adminEmail,
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
        id: toWpNumericId(user?.id),
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
        roles: toWpRoles(user),
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
      const items = await listRegistryDocuments({ request, store, type: 'pattern' });
      return json(items.map((entry) => toWpPatternRecord(entry, request.url)));
    } catch (e) {
      return authzErrorResponse(e);
    }
  });

  add('GET', '/patterns', async (request) => {
    try {
      await requireCapability({ runtime, store, request, capability: 'document:read' });
      const items = await listRegistryDocuments({ request, store, type: 'pattern' });
      return json(items.map((entry) => toWpPatternRecord(entry, request.url)));
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

  add('GET', '/templates/lookup', async (request) => {
    try {
      await requireCapability({ runtime, store, request, capability: 'document:read' });
      const url = new URL(request.url);
      const slug = String(url.searchParams.get('slug') || '').trim().toLowerCase();
      if (!slug) {
        return json(
          {
            code: 'rest_missing_callback_param',
            message: 'Missing parameter(s): slug',
            data: {
              status: 400,
              params: ['slug']
            }
          },
          400
        );
      }

      const listed = await store.listDocuments({
        type: 'template',
        status: 'all',
        slug,
        page: 1,
        pageSize: 5,
        sortBy: 'updatedAt',
        sortDir: 'desc'
      });
      const items = Array.isArray(listed?.items) ? listed.items : [];
      const match = items.find((entry) => String(entry?.slug || '').toLowerCase() === slug) || null;
      if (!match) {
        return json(
          {
            code: 'rest_template_invalid_id',
            message: 'Template not found.',
            data: { status: 404 }
          },
          404
        );
      }

      return json(toWpPatternRecord(match, request.url));
    } catch (e) {
      return authzErrorResponse(e);
    }
  });
}
