import { makeStyleRef, makeStyleValue, resolveEnumStyleValue, resolveSpacingStyleValue } from '../styleRefs.js';

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
  const hasMediaResolver = mediaId && typeof context.resolveMediaById === 'function';
  const media = hasMediaResolver ? context.resolveMediaById(mediaId) : null;
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
    width: resolveSpacingStyleValue(props?.style?.size?.width),
    height: resolveSpacingStyleValue(props?.style?.size?.height),
    sizeSlug: String(props.sizeSlug || '').trim(),
    align: resolveEnumStyleValue(props?.style?.layout?.align)
  };
}

function resolveAlignClass(align) {
  if (!align) return '';
  if (align === 'none') return 'alignnone';
  return `align${escapeHtml(align)}`;
}

function renderImageMarkup(node, image) {
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
    resolveAlignClass(image.align),
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
  const linkClassAttr = safeLinkClass ? ` class="${safeLinkClass}"` : '';
  const linkTargetAttr = safeLinkTarget ? ` target="${safeLinkTarget}"` : '';
  const linkRelAttr = safeRel ? ` rel="${safeRel}"` : '';
  const linkTag = safeHref
    ? `<a${linkClassAttr} href="${safeHref}"${linkTargetAttr}${linkRelAttr}>${imageTag}</a>`
    : imageTag;
  return `<figure class="${figureClassNames.join(' ')}">${linkTag}${captionMarkup}</figure>`;
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
    const hasSource = Boolean(mediaId || url);
    const lossiness = hasSource && !hasUnsupportedVisualAttrs ? 'none' : 'partial';
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
        style: {
          size: {
            width: makeStyleValue(attrs.width || ''),
            height: makeStyleValue(attrs.height || '')
          },
          layout: {
            align: attrs.align ? makeStyleRef(`layout.align.${String(attrs.align)}`) : null
          }
        },
        sizeSlug: String(attrs.sizeSlug || ''),
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

    return renderImageMarkup(node, image);
  }
};

export const imageRenderers = [imageRenderer];
