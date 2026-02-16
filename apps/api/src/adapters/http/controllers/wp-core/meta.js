export function registerWpCoreMetaRoutes({ add, runtime, store, authzErrorResponse, requireCapability, json }) {
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

  add('GET', '/templates/lookup', async (request) => {
    try {
      await requireCapability({ runtime, store, request, capability: 'document:read' });
      return json(null);
    } catch (e) {
      return authzErrorResponse(e);
    }
  });
}
