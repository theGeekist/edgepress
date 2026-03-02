import apiFetch from '@wordpress/api-fetch';
import { toWpNumericId } from '../gutenberg-host.js';

function normalizePostType(postType) {
  return postType === 'page' ? 'page' : 'post';
}

function buildPostRecord({ postType, postId, title, content }) {
  const type = normalizePostType(postType);
  const id = toWpNumericId(postId || 'editor-local');
  const textTitle = String(title || '');
  const textContent = String(content || '');
  return {
    id,
    type,
    status: 'draft',
    title: { raw: textTitle, rendered: textTitle },
    content: { raw: textContent, rendered: textContent }
  };
}

function buildPostTypeRecord(postType) {
  const type = normalizePostType(postType);
  const singular = type === 'page' ? 'Page' : 'Post';
  const plural = type === 'page' ? 'Pages' : 'Posts';
  return {
    slug: type,
    name: plural,
    rest_base: `${type}s`,
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
      view_item: `View ${singular}`
    }
  };
}

export function registerBootstrapPreload({ postType, postId, title, content }) {
  const type = normalizePostType(postType);
  const numericId = toWpNumericId(postId || 'editor-local');
  const key = `${type}:${numericId}`;
  if (apiFetch.__epBootstrapPreloadKey === key && apiFetch.__epBootstrapPreload) {
    return apiFetch.__epBootstrapPreload;
  }

  const preload = {
    '/wp/v2/settings': { body: {} },
    '/wp/v2/themes': {
      body: [
        {
          stylesheet: 'edgepress',
          template: 'edgepress',
          slug: 'edgepress',
          status: 'active',
          name: { raw: 'EdgePress' },
          version: '1.0.0',
          author: { raw: 'EdgePress' }
        }
      ]
    },
    '/wp/v2/types?context=edit': {
      body: {
        post: buildPostTypeRecord('post'),
        page: buildPostTypeRecord('page')
      }
    },
    '/wp/v2/types?context=view': {
      body: {
        post: buildPostTypeRecord('post'),
        page: buildPostTypeRecord('page')
      }
    },
    [`/wp/v2/${type}s/${numericId}?context=edit`]: {
      body: buildPostRecord({ postType: type, postId, title, content })
    }
  };

  if (!apiFetch.__epBootstrapPreloadRegistered) {
    apiFetch.use((options, next) => {
      const path = resolveRequestPath(options);
      const preloaded = apiFetch.__epBootstrapPreload;
      if (path && preloaded && Object.prototype.hasOwnProperty.call(preloaded, path)) {
        const payload = preloaded[path];
        return Promise.resolve(payload?.body);
      }
      return next(options);
    });
    apiFetch.__epBootstrapPreloadRegistered = true;
  }

  apiFetch.__epBootstrapPreloadKey = key;
  apiFetch.__epBootstrapPreload = preload;
  return preload;
}

function resolveRequestPath(options) {
  if (typeof options === 'string') return options;
  if (typeof options?.path === 'string') return options.path;

  const urlValue = typeof options?.url === 'string' ? options.url : '';
  if (!urlValue) return '';

  try {
    const parsed = new URL(urlValue, globalThis.location?.origin || 'http://localhost');
    return `${parsed.pathname}${parsed.search || ''}`;
  } catch {
    return '';
  }
}
