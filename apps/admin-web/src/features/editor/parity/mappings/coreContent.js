import {
  makeSpacingStyleValue,
  makeStyleRef,
  makeStyleValue,
  resolveEnumStyleValue,
  resolveSpacingStyleValue
} from '../styleRefs.js';

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

function importSpacerBlock(wpBlockName, attrs) {
  const selfStretch = String(attrs?.style?.layout?.selfStretch || '');
  const computedHeight = selfStretch === 'fill' || selfStretch === 'fit'
    ? ''
    : String(attrs.height || '100px');
  return {
    blockKind: 'ep/spacer',
    props: {
      style: {
        spacing: {
          height: makeSpacingStyleValue(computedHeight),
          width: makeSpacingStyleValue(attrs.width || '')
        },
        layout: {
          selfStretch: selfStretch ? makeStyleRef(`layout.selfStretch.${selfStretch}`) : null
        }
      }
    },
    origin: { wpBlockName, attrs },
    lossiness: 'none',
    children: []
  };
}

function importHeadingBlock(wpBlockName, attrs) {
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

function importQuoteBlock(wpBlockName, attrs) {
  return {
    blockKind: 'ep/quote',
    props: {
      value: String(attrs.value || ''),
      citation: String(attrs.citation || ''),
      style: {
        typography: {
          textAlign: attrs.textAlign ? makeStyleRef(`typography.textAlign.${String(attrs.textAlign)}`) : null
        }
      }
    },
    origin: { wpBlockName, attrs },
    lossiness: 'none',
    children: []
  };
}

function importSeparatorBlock(wpBlockName, attrs) {
  const hasCustomColor = Boolean(attrs?.style?.color?.background);
  const backgroundColorAttr = String(attrs.backgroundColor || '');
  const backgroundColorSlug = toPresetSlug(backgroundColorAttr);
  const backgroundStyle = backgroundColorSlug
    ? makeStyleRef(`color.palette.${backgroundColorSlug}`)
    : makeStyleValue(attrs?.style?.color?.background || '');
  return {
    blockKind: 'ep/separator',
    props: {
      opacity: attrs.opacity ? makeStyleRef(`effects.opacity.${String(attrs.opacity)}`) : makeStyleRef('effects.opacity.alpha-channel'),
      tagName: attrs.tagName === 'div' ? 'div' : 'hr',
      style: {
        color: {
          background: backgroundStyle
        }
      },
      hasCustomColor
    },
    origin: { wpBlockName, attrs },
    lossiness: 'none',
    children: []
  };
}

function importEmbedBlock(wpBlockName, attrs) {
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

export const contentImportTransform = {
  id: 'core.content.import.v1',
  priority: 100,
  wpBlockNames: ['core/spacer', 'core/heading', 'core/quote', 'core/separator', 'core/embed'],
  canHandle: () => true,
  toCanonical({ wpBlockName, node }) {
    const attrs = node?.attributes && typeof node.attributes === 'object' ? node.attributes : {};
    switch (wpBlockName) {
      case 'core/spacer':
        return importSpacerBlock(wpBlockName, attrs);
      case 'core/heading':
        return importHeadingBlock(wpBlockName, attrs);
      case 'core/quote':
        return importQuoteBlock(wpBlockName, attrs);
      case 'core/separator':
        return importSeparatorBlock(wpBlockName, attrs);
      default:
        return importEmbedBlock(wpBlockName, attrs);
    }
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
    const height = resolveSpacingStyleValue(props?.style?.spacing?.height);
    const width = resolveSpacingStyleValue(props?.style?.spacing?.width);
    if (target === 'editor') {
      return { kind: 'spacer', height: String(height || '100px'), width: String(width || '') };
    }
    const hasHeight = Boolean(String(height || '').trim());
    const heightStyle = hasHeight ? `height:${escapeHtml(height)}` : '';
    let widthStyle = '';
    if (width) {
      const separator = hasHeight ? ';' : '';
      widthStyle = `${separator}width:${escapeHtml(width)}`;
    }
    const styleAttr = heightStyle || widthStyle ? ` style="${heightStyle}${widthStyle}"` : '';
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
      const textAlign = resolveEnumStyleValue(props?.style?.typography?.textAlign);
      return {
        kind: 'quote',
        value: String(props.value || ''),
        citation: String(props.citation || ''),
        textAlign,
        children: renderedChildren
      };
    }
    const textAlign = resolveEnumStyleValue(props?.style?.typography?.textAlign);
    const className = textAlign ? ` class="has-text-align-${escapeHtml(textAlign)}"` : '';
    const rawValue = normalizeRichTextHtml(props.value);
    let fallbackValueMarkup = '';
    if (rawValue) {
      fallbackValueMarkup = /<p[\s>]/i.test(rawValue) ? rawValue : `<p>${rawValue}</p>`;
    }
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
    const opacity = resolveEnumStyleValue(props.opacity) || 'alpha-channel';
    if (target === 'editor') {
      return {
        kind: 'separator',
        tagName: props.tagName === 'div' ? 'div' : 'hr',
        opacity
      };
    }
    return renderSeparatorPublish(props, opacity);
  }
};

function renderSeparatorPublish(props, opacity) {
  const tagName = props.tagName === 'div' ? 'div' : 'hr';
  const bgColor = props?.style?.color?.background;
  const bgRef = bgColor && typeof bgColor === 'object' ? String(bgColor.ref || '') : '';
  const colorSlug = toPresetSlug(bgRef.startsWith('color.palette.') ? bgRef.slice('color.palette.'.length) : '');
  const customColor = bgColor && typeof bgColor === 'object' && typeof bgColor.value === 'string' ? bgColor.value : '';
  const classes = classList([
    'ep-separator',
    opacity === 'css' ? 'has-css-opacity' : '',
    opacity === 'alpha-channel' ? 'has-alpha-channel-opacity' : '',
    colorSlug ? `has-${escapeHtml(colorSlug)}-color` : '',
    bgRef || customColor ? 'has-text-color' : ''
  ]);
  const styleColor = customColor ? `color:${escapeHtml(customColor)}` : '';
  const styleAttr = styleColor ? ` style="${styleColor}"` : '';
  return `<${tagName} class="${classes}"${styleAttr}></${tagName}>`;
}

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
