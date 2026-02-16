export function parseFieldString(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    if (typeof value.raw === 'string') return value.raw;
    if (typeof value.rendered === 'string') return value.rendered;
  }
  return '';
}

export function toWpStatus(status) {
  const value = String(status || '').trim();
  if (!value) return 'draft';
  return value === 'published' ? 'publish' : value;
}

export function fromWpStatus(status) {
  const value = String(status || '').trim();
  if (!value) return 'draft';
  return value === 'publish' ? 'published' : value;
}

export function toWpPost(doc, requestUrl, toWpNumericId) {
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

export function normalizeTypeParam(typeParam) {
  return String(typeParam || '').trim().toLowerCase();
}

export function createNotFoundEntity(json) {
  return function notFoundEntity(entityType = 'post') {
    return json(
      {
        code: 'rest_post_invalid_id',
        message: `Invalid ${entityType} ID.`,
        data: { status: 404 }
      },
      404
    );
  };
}
