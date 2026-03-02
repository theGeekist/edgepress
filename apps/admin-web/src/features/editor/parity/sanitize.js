import sanitizeHtml from 'sanitize-html';

export const SANITIZE_POLICY_SCHEMA_VERSION = 1;

const SANITIZE_CONFIG = {
  allowedTags: [
    'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'sup', 'sub',
    'ul', 'ol', 'li', 'blockquote', 'cite',
    'a', 'img',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'figure', 'figcaption',
    'code', 'pre',
    'span', 'div'
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel', 'title'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    '*': ['class']
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: {
    img: ['http', 'https', 'data']
  },
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  parser: {
    lowerCaseAttributeNames: true
  }
};

export function sanitizeRichTextHtml(input) {
  const before = String(input ?? '');
  const after = sanitizeHtml(before, SANITIZE_CONFIG);
  return {
    html: after,
    changed: before !== after,
    policyVersion: SANITIZE_POLICY_SCHEMA_VERSION
  };
}
