export const SANITIZE_POLICY_SCHEMA_VERSION = 1;

function normalizeHtml(input) {
  return String(input ?? '');
}

function removeScriptLikeTags(html) {
  return html.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
}

function removeEventHandlerAttributes(html) {
  return html
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '');
}

function removeUnsafeProtocolAttributes(html) {
  return html
    .replace(/\s(href|src)\s*=\s*"\s*(javascript:|data:text\/html)[^"]*"/gi, '')
    .replace(/\s(href|src)\s*=\s*'\s*(javascript:|data:text\/html)[^']*'/gi, '')
    .replace(/\s(href|src)\s*=\s*(javascript:|data:text\/html)[^\s>]*/gi, '');
}

export function sanitizeRichTextHtml(input) {
  const before = normalizeHtml(input);
  let after = before;
  after = removeScriptLikeTags(after);
  after = removeEventHandlerAttributes(after);
  after = removeUnsafeProtocolAttributes(after);
  return {
    html: after,
    changed: before !== after,
    policyVersion: SANITIZE_POLICY_SCHEMA_VERSION
  };
}
