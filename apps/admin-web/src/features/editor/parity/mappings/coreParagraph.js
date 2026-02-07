import { makeStyleRef, resolveEnumStyleValue } from '../styleRefs.js';

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

export const paragraphImportTransform = {
  id: 'core.paragraph.import.v1',
  priority: 100,
  wpBlockNames: ['core/paragraph'],
  canHandle: () => true,
  toCanonical({ wpBlockName, node }) {
    const attrs = node?.attributes && typeof node.attributes === 'object' ? node.attributes : {};
    const textAlign = attrs?.style?.typography?.textAlign ? String(attrs.style.typography.textAlign) : '';
    return {
      blockKind: 'ep/paragraph',
      props: {
        content: String(attrs.content || ''),
        dropCap: Boolean(attrs.dropCap),
        direction: attrs.direction ? String(attrs.direction) : '',
        style: {
          typography: {
            textAlign: textAlign ? makeStyleRef(`typography.textAlign.${textAlign}`) : null
          }
        }
      },
      origin: {
        wpBlockName,
        attrs,
        innerHTML: typeof node?.innerHTML === 'string' ? node.innerHTML : ''
      },
      lossiness: 'none',
      children: []
    };
  }
};

const paragraphRenderer = {
  id: 'ep.paragraph.render.v1',
  priority: 100,
  blockKinds: ['ep/paragraph'],
  targets: ['publish', 'preview', 'editor'],
  canHandle: () => true,
  render({ target, node }) {
    const props = node?.props && typeof node.props === 'object' ? node.props : {};
    const richContent = normalizeRichTextHtml(props.content || '');
    if (target === 'editor') {
      const textAlign = resolveEnumStyleValue(props?.style?.typography?.textAlign);
      return {
        kind: 'paragraph',
        text: String(props.content || ''),
        dropCap: Boolean(props.dropCap),
        direction: String(props.direction || ''),
        textAlign
      };
    }
    const textAlign = resolveEnumStyleValue(props?.style?.typography?.textAlign);
    const hasDropCapClass = Boolean(props.dropCap) && textAlign !== 'right' && textAlign !== 'center';
    const classNames = [
      hasDropCapClass ? 'has-drop-cap' : '',
      textAlign ? `has-text-align-${escapeHtml(textAlign)}` : ''
    ].filter(Boolean);
    const classAttr = classNames.length > 0 ? ` class="${classNames.join(' ')}"` : '';
    const dirAttr = props.direction ? ` dir="${escapeHtml(props.direction)}"` : '';
    return `<p${classAttr}${dirAttr}>${richContent}</p>`;
  }
};

export const paragraphRenderers = [paragraphRenderer];
