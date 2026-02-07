import { makeSpacingStyleValue, makeStyleRef, resolveEnumStyleValue, resolveSpacingStyleValue } from '../styleRefs.js';

function escapeHtml(input) {
  return String(input ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeLayoutType(wpBlockName, attrs) {
  if (wpBlockName === 'core/columns') return 'columns';
  if (wpBlockName === 'core/row') return 'row';
  if (wpBlockName === 'core/group') {
    const styleLayoutType = attrs?.style?.layout?.type ? String(attrs.style.layout.type) : '';
    if (styleLayoutType === 'flex') {
      return attrs?.style?.layout?.orientation === 'vertical' ? 'column' : 'row';
    }
    return 'group';
  }
  return 'group';
}

export const layoutImportTransform = {
  id: 'core.layout.import.v1',
  priority: 100,
  wpBlockNames: ['core/group', 'core/columns', 'core/column', 'core/row'],
  canHandle: () => true,
  toCanonical({ wpBlockName, node }) {
    const attrs = node?.attributes && typeof node.attributes === 'object' ? node.attributes : {};

    if (wpBlockName === 'core/column') {
      return {
        blockKind: 'ep/layout-item',
        props: {
          sourceBlock: wpBlockName,
          style: {
            layout: {
              flexBasis: makeSpacingStyleValue(attrs.width || ''),
              verticalAlignment: attrs.verticalAlignment
                ? makeStyleRef(`layout.verticalAlignment.${String(attrs.verticalAlignment)}`)
                : null
            }
          }
        },
        origin: {
          wpBlockName,
          attrs
        },
        lossiness: 'none',
        children: []
      };
    }

    const tagName = String(attrs.tagName || 'div');
    return {
      blockKind: 'ep/layout-container',
      props: {
        sourceBlock: wpBlockName,
        layoutType: normalizeLayoutType(wpBlockName, attrs),
        tagName,
        style: {
          layout: {
            verticalAlignment: attrs.verticalAlignment
              ? makeStyleRef(`layout.verticalAlignment.${String(attrs.verticalAlignment)}`)
              : null
          }
        },
        stackOnMobile: attrs.isStackedOnMobile === undefined ? true : Boolean(attrs.isStackedOnMobile)
      },
      origin: {
        wpBlockName,
        attrs
      },
      lossiness: 'none',
      children: []
    };
  }
};

const layoutContainerRenderer = {
  id: 'ep.layout.container.render.v1',
  priority: 100,
  blockKinds: ['ep/layout-container'],
  targets: ['publish', 'preview', 'editor'],
  canHandle: () => true,
  render({ target, node, context }) {
    const props = node?.props && typeof node.props === 'object' ? node.props : {};
    const renderedChildren = Array.isArray(context?.renderedChildren) ? context.renderedChildren : [];
    if (target === 'editor') {
      const verticalAlignment = resolveEnumStyleValue(props?.style?.layout?.verticalAlignment);
      return {
        kind: 'layout-container',
        layoutType: String(props.layoutType || 'group'),
        tagName: String(props.tagName || 'div'),
        stackOnMobile: props.stackOnMobile !== false,
        verticalAlignment,
        children: renderedChildren
      };
    }

    const tag = String(props.tagName || 'div').toLowerCase();
    const safeTag = /^[a-z][a-z0-9-]*$/.test(tag) ? tag : 'div';
    const classNames = [
      'ep-layout',
      `ep-layout--${escapeHtml(props.layoutType || 'group')}`,
      resolveEnumStyleValue(props?.style?.layout?.verticalAlignment)
        ? `are-vertically-aligned-${escapeHtml(resolveEnumStyleValue(props?.style?.layout?.verticalAlignment))}`
        : '',
      props.stackOnMobile === false ? 'is-not-stacked-on-mobile' : ''
    ].filter(Boolean);
    return `<${safeTag} class="${classNames.join(' ')}">${renderedChildren.join('')}</${safeTag}>`;
  }
};

const layoutItemRenderer = {
  id: 'ep.layout.item.render.v1',
  priority: 100,
  blockKinds: ['ep/layout-item'],
  targets: ['publish', 'preview', 'editor'],
  canHandle: () => true,
  render({ target, node, context }) {
    const props = node?.props && typeof node.props === 'object' ? node.props : {};
    const renderedChildren = Array.isArray(context?.renderedChildren) ? context.renderedChildren : [];
    if (target === 'editor') {
      const width = resolveSpacingStyleValue(props?.style?.layout?.flexBasis);
      const verticalAlignment = resolveEnumStyleValue(props?.style?.layout?.verticalAlignment);
      return {
        kind: 'layout-item',
        width,
        verticalAlignment,
        children: renderedChildren
      };
    }

    const verticalAlignment = resolveEnumStyleValue(props?.style?.layout?.verticalAlignment);
    const width = resolveSpacingStyleValue(props?.style?.layout?.flexBasis);
    const classNames = [
      'ep-layout-item',
      verticalAlignment ? `is-vertically-aligned-${escapeHtml(verticalAlignment)}` : ''
    ].filter(Boolean);
    const style = width ? ` style="flex-basis:${escapeHtml(width)}"` : '';
    return `<div class="${classNames.join(' ')}"${style}>${renderedChildren.join('')}</div>`;
  }
};

export const layoutRenderers = [layoutContainerRenderer, layoutItemRenderer];
