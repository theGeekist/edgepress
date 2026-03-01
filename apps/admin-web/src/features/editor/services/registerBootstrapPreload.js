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
  const key = `${type}:${numericId}:${String(title || '')}:${String(content || '')}`;

  if (apiFetch.__epBootstrapPreloadKey === key) {
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

  apiFetch.use(apiFetch.createPreloadingMiddleware(preload));
  apiFetch.__epBootstrapPreloadKey = key;
  apiFetch.__epBootstrapPreload = preload;
  return preload;
}
