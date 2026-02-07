function escapeHtml(input) {
  return String(input ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeRichTextHtml(input) {
  return String(input ?? '');
}

function resolveImageData(node, context = {}) {
  const props = node?.props && typeof node.props === 'object' ? node.props : {};
  const mediaId = String(props.mediaId || '').trim();
  const media = mediaId && typeof context.resolveMediaById === 'function'
    ? context.resolveMediaById(mediaId)
    : null;
  const url = String(media?.url || props.url || '').trim();
  const alt = String(media?.alt || props.alt || '').trim();
  const caption = String(props.caption || media?.caption || '').trim();
  return {
    mediaId,
    url,
    alt,
    caption,
    href: String(props.href || '').trim(),
    rel: String(props.rel || '').trim(),
    linkClass: String(props.linkClass || '').trim(),
    linkTarget: String(props.linkTarget || '').trim(),
    title: String(props.title || '').trim(),
    width: String(props.width || '').trim(),
    height: String(props.height || '').trim(),
    sizeSlug: String(props.sizeSlug || '').trim(),
    align: String(props.align || '').trim()
  };
}

export const imageImportTransform = {
  id: 'core.image.import.v1',
  priority: 100,
  wpBlockNames: ['core/image'],
  canHandle: () => true,
  toCanonical({ wpBlockName, node }) {
    const attrs = node?.attributes && typeof node.attributes === 'object' ? node.attributes : {};
    const mediaId = attrs.id !== undefined && attrs.id !== null ? String(attrs.id) : String(attrs.mediaId || '');
    const url = String(attrs.url || '');
    const hasUnsupportedVisualAttrs = Boolean(
      attrs.aspectRatio ||
      attrs.scale ||
      attrs.focalPoint ||
      attrs.lightbox ||
      attrs.sizeSlug && attrs.width && attrs.height
    );
    const lossiness = mediaId || url
      ? (hasUnsupportedVisualAttrs ? 'partial' : 'none')
      : 'partial';
    return {
      blockKind: 'ep/image',
      props: {
        mediaId: mediaId.trim(),
        url,
        alt: String(attrs.alt || ''),
        caption: String(attrs.caption || ''),
        href: String(attrs.href || ''),
        rel: String(attrs.rel || ''),
        linkClass: String(attrs.linkClass || ''),
        linkTarget: String(attrs.linkTarget || ''),
        title: String(attrs.title || ''),
        width: String(attrs.width || ''),
        height: String(attrs.height || ''),
        sizeSlug: String(attrs.sizeSlug || ''),
        align: String(attrs.align || ''),
        hasCaptionBinding: Boolean(attrs?.metadata?.bindings?.caption || attrs?.metadata?.bindings?.__default?.source === 'core/pattern-overrides')
      },
      origin: {
        wpBlockName,
        attrs,
        innerHTML: typeof node?.innerHTML === 'string' ? node.innerHTML : ''
      },
      lossiness,
      children: []
    };
  }
};

const imageRenderer = {
  id: 'ep.image.render.v1',
  priority: 100,
  blockKinds: ['ep/image'],
  targets: ['publish', 'preview', 'editor'],
  canHandle: () => true,
  render({ target, node, context }) {
    const image = resolveImageData(node, context);
    if (target === 'editor') {
      return {
        kind: 'image',
        mediaId: image.mediaId,
        url: image.url,
        alt: image.alt,
        caption: image.caption,
        href: image.href,
        title: image.title,
        width: image.width,
        height: image.height,
        sizeSlug: image.sizeSlug,
        align: image.align
      };
    }

    const safeUrl = escapeHtml(image.url);
    const safeAlt = escapeHtml(image.alt);
    const richCaption = normalizeRichTextHtml(image.caption);
    const safeTitle = escapeHtml(image.title);
    const safeHref = escapeHtml(image.href);
    const safeRel = escapeHtml(image.rel);
    const safeLinkClass = escapeHtml(image.linkClass);
    const safeLinkTarget = escapeHtml(image.linkTarget);
    const safeWidth = escapeHtml(image.width);
    const safeHeight = escapeHtml(image.height);
    const figureClassNames = [
      'ep-image',
      image.align === 'none' ? 'alignnone' : '',
      image.sizeSlug ? `size-${escapeHtml(image.sizeSlug)}` : '',
      image.width || image.height ? 'is-resized' : ''
    ].filter(Boolean);
    const showCaption = Boolean(richCaption) || Boolean(node?.props?.hasCaptionBinding);
    const captionMarkup = showCaption ? `<figcaption>${richCaption}</figcaption>` : '';
    if (!safeUrl) {
      return '<figure class="ep-image ep-image-missing"></figure>';
    }
    const imageClass = image.mediaId ? ` class="wp-image-${escapeHtml(image.mediaId)}"` : '';
    const titleAttr = safeTitle ? ` title="${safeTitle}"` : '';
    const widthAttr = safeWidth ? ` width="${safeWidth}"` : '';
    const heightAttr = safeHeight ? ` height="${safeHeight}"` : '';
    const imageTag = `<img src="${safeUrl}" alt="${safeAlt}"${imageClass}${titleAttr}${widthAttr}${heightAttr} />`;
    const linkTag = safeHref
      ? `<a${safeLinkClass ? ` class="${safeLinkClass}"` : ''} href="${safeHref}"${safeLinkTarget ? ` target="${safeLinkTarget}"` : ''}${safeRel ? ` rel="${safeRel}"` : ''}>${imageTag}</a>`
      : imageTag;
    return `<figure class="${figureClassNames.join(' ')}">${linkTag}${captionMarkup}</figure>`;
  }
};

export const imageRenderers = [imageRenderer];
