function escapeHtml(input) {
  return String(input ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function classList(values) {
  return values.filter(Boolean).join(' ');
}

function normalizeRichTextHtml(input) {
  return String(input ?? '');
}

function toPresetSlug(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  return /^[a-z0-9-]+$/.test(raw) ? raw : '';
}

function spacingPresetToCssVar(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^var:preset\|spacing\|(.+)$/);
  if (!match) return raw;
  return `var(--wp--preset--spacing--${match[1]})`;
}

export const contentImportTransform = {
  id: 'core.content.import.v1',
  priority: 100,
  wpBlockNames: ['core/spacer', 'core/heading', 'core/quote', 'core/separator', 'core/embed'],
  canHandle: () => true,
  toCanonical({ wpBlockName, node }) {
    const attrs = node?.attributes && typeof node.attributes === 'object' ? node.attributes : {};

    if (wpBlockName === 'core/spacer') {
      const selfStretch = String(attrs?.style?.layout?.selfStretch || '');
      const computedHeight = selfStretch === 'fill' || selfStretch === 'fit'
        ? ''
        : String(attrs.height || '100px');
      return {
        blockKind: 'ep/spacer',
        props: {
          height: computedHeight,
          width: String(attrs.width || ''),
          selfStretch
        },
        origin: { wpBlockName, attrs },
        lossiness: 'none',
        children: []
      };
    }

    if (wpBlockName === 'core/heading') {
      return {
        blockKind: 'ep/heading',
        props: {
          content: String(attrs.content || ''),
          level: Number.isFinite(Number(attrs.level)) ? Number(attrs.level) : 2
        },
        origin: { wpBlockName, attrs },
        lossiness: 'none',
        children: []
      };
    }

    if (wpBlockName === 'core/quote') {
      return {
        blockKind: 'ep/quote',
        props: {
          value: String(attrs.value || ''),
          citation: String(attrs.citation || ''),
          textAlign: String(attrs.textAlign || '')
        },
        origin: { wpBlockName, attrs },
        lossiness: 'none',
        children: []
      };
    }

    if (wpBlockName === 'core/separator') {
      const hasCustomColor = Boolean(attrs?.style?.color?.background);
      return {
        blockKind: 'ep/separator',
        props: {
          opacity: String(attrs.opacity || 'alpha-channel'),
          tagName: attrs.tagName === 'div' ? 'div' : 'hr',
          backgroundColor: String(attrs.backgroundColor || ''),
          customBackgroundColor: String(attrs?.style?.color?.background || ''),
          hasCustomColor
        },
        origin: { wpBlockName, attrs },
        lossiness: 'none',
        children: []
      };
    }

    // core/embed
    return {
      blockKind: 'ep/embed',
      props: {
        url: String(attrs.url || ''),
        caption: String(attrs.caption || ''),
        type: String(attrs.type || ''),
        providerNameSlug: String(attrs.providerNameSlug || '')
      },
      origin: { wpBlockName, attrs },
      lossiness: attrs.url ? 'none' : 'partial',
      children: []
    };
  }
};

const spacerRenderer = {
  id: 'ep.spacer.render.v1',
  priority: 100,
  blockKinds: ['ep/spacer'],
  targets: ['publish', 'preview', 'editor'],
  canHandle: () => true,
  render({ target, node }) {
    const props = node?.props && typeof node.props === 'object' ? node.props : {};
    if (target === 'editor') {
      return { kind: 'spacer', height: String(props.height || '100px'), width: String(props.width || '') };
    }
    const hasHeight = Boolean(String(props.height || '').trim());
    const height = hasHeight ? `height:${escapeHtml(spacingPresetToCssVar(props.height || ''))}` : '';
    const width = props.width ? `${hasHeight ? ';' : ''}width:${escapeHtml(spacingPresetToCssVar(props.width))}` : '';
    const styleAttr = height || width ? ` style="${height}${width}"` : '';
    return `<div class="ep-spacer" aria-hidden="true"${styleAttr}></div>`;
  }
};

const headingRenderer = {
  id: 'ep.heading.render.v1',
  priority: 100,
  blockKinds: ['ep/heading'],
  targets: ['publish', 'preview', 'editor'],
  canHandle: () => true,
  render({ target, node }) {
    const props = node?.props && typeof node.props === 'object' ? node.props : {};
    const level = Math.min(6, Math.max(1, Number(props.level || 2)));
    const text = String(props.content || '');
    if (target === 'editor') {
      return { kind: 'heading', level, text };
    }
    return `<h${level}>${normalizeRichTextHtml(text)}</h${level}>`;
  }
};

const quoteRenderer = {
  id: 'ep.quote.render.v1',
  priority: 100,
  blockKinds: ['ep/quote'],
  targets: ['publish', 'preview', 'editor'],
  canHandle: () => true,
  render({ target, node, context }) {
    const props = node?.props && typeof node.props === 'object' ? node.props : {};
    const renderedChildren = Array.isArray(context?.renderedChildren) ? context.renderedChildren : [];
    if (target === 'editor') {
      return {
        kind: 'quote',
        value: String(props.value || ''),
        citation: String(props.citation || ''),
        textAlign: String(props.textAlign || ''),
        children: renderedChildren
      };
    }
    const className = props.textAlign ? ` class="has-text-align-${escapeHtml(props.textAlign)}"` : '';
    const rawValue = normalizeRichTextHtml(props.value);
    const fallbackValueMarkup = rawValue
      ? (/<p[\s>]/i.test(rawValue) ? rawValue : `<p>${rawValue}</p>`)
      : '';
    const citationMarkup = props.citation ? `<cite>${normalizeRichTextHtml(props.citation)}</cite>` : '';
    const childrenMarkup = renderedChildren.join('');
    return `<blockquote${className}>${childrenMarkup || fallbackValueMarkup}${citationMarkup}</blockquote>`;
  }
};

const separatorRenderer = {
  id: 'ep.separator.render.v1',
  priority: 100,
  blockKinds: ['ep/separator'],
  targets: ['publish', 'preview', 'editor'],
  canHandle: () => true,
  render({ target, node }) {
    const props = node?.props && typeof node.props === 'object' ? node.props : {};
    if (target === 'editor') {
      return {
        kind: 'separator',
        tagName: props.tagName === 'div' ? 'div' : 'hr',
        opacity: String(props.opacity || 'alpha-channel')
      };
    }
    const tagName = props.tagName === 'div' ? 'div' : 'hr';
    const colorSlug = toPresetSlug(props.backgroundColor);
    const classes = classList([
      'ep-separator',
      props.opacity === 'css' ? 'has-css-opacity' : '',
      props.opacity === 'alpha-channel' ? 'has-alpha-channel-opacity' : '',
      colorSlug ? `has-${escapeHtml(colorSlug)}-color` : '',
      props.backgroundColor || props.customBackgroundColor ? 'has-text-color' : ''
    ]);
    const styleColor = props.customBackgroundColor
      ? `color:${escapeHtml(props.customBackgroundColor)}`
      : '';
    const styleAttr = styleColor ? ` style="${styleColor}"` : '';
    return `<${tagName} class="${classes}"${styleAttr}></${tagName}>`;
  }
};

const embedRenderer = {
  id: 'ep.embed.render.v1',
  priority: 100,
  blockKinds: ['ep/embed'],
  targets: ['publish', 'preview', 'editor'],
  canHandle: () => true,
  render({ target, node }) {
    const props = node?.props && typeof node.props === 'object' ? node.props : {};
    const url = String(props.url || '').trim();
    const caption = String(props.caption || '').trim();
    const type = String(props.type || '').trim();
    const provider = String(props.providerNameSlug || '').trim();

    if (target === 'editor') {
      return { kind: 'embed', url, caption, type, providerNameSlug: provider };
    }
    if (!url) {
      return '';
    }
    const className = classList([
      'wp-block-embed',
      type ? `is-type-${escapeHtml(type)}` : '',
      provider ? `is-provider-${escapeHtml(provider)}` : '',
      provider ? `wp-block-embed-${escapeHtml(provider)}` : ''
    ]);
    const captionMarkup = caption ? `<figcaption>${normalizeRichTextHtml(caption)}</figcaption>` : '';
    return `<figure class="${className}"><div class="wp-block-embed__wrapper">\n${escapeHtml(url)}\n</div>${captionMarkup}</figure>`;
  }
};

export const contentRenderers = [
  spacerRenderer,
  headingRenderer,
  quoteRenderer,
  separatorRenderer,
  embedRenderer
];
