import test from 'node:test';
import assert from 'node:assert/strict';

import { sanitizeRichTextHtml, SANITIZE_POLICY_SCHEMA_VERSION } from '../src/features/editor/parity/sanitize.js';
import { evaluateEmbedPolicy, EMBED_POLICY_SCHEMA_VERSION } from '../src/features/editor/parity/embedPolicy.js';

test('sanitize policy exports schema version', () => {
  assert.equal(SANITIZE_POLICY_SCHEMA_VERSION, 1);
  assert.equal(EMBED_POLICY_SCHEMA_VERSION, 1);
});

test('sanitize removes script tags from rich text', () => {
  const result = sanitizeRichTextHtml('<p>Hello</p><script>alert(1)</script>');
  assert.equal(result.html, '<p>Hello</p>');
  assert.equal(result.changed, true);
});

test('sanitize strips event handlers and unsafe href protocol', () => {
  const result = sanitizeRichTextHtml('<a href="javascript:alert(1)" onclick="boom()">Link</a>');
  assert.equal(result.html, '<a>Link</a>');
  assert.equal(result.changed, true);
});

test('sanitize preserves safe inline formatting tags', () => {
  const result = sanitizeRichTextHtml('<p><strong>Bold</strong> <em>safe</em> <a href="https://example.com">link</a></p>');
  assert.equal(result.html, '<p><strong>Bold</strong> <em>safe</em> <a href="https://example.com">link</a></p>');
  assert.equal(result.changed, false);
});

test('embed policy normalizes supported provider URL', () => {
  const result = evaluateEmbedPolicy({
    url: 'http://www.youtube.com/watch?v=abc',
    providerNameSlug: 'youtube'
  });
  assert.equal(result.allowed, true);
  assert.equal(result.providerNameSlug, 'youtube');
  assert.ok(result.url.startsWith('https://'));
  assert.equal(result.issues.length, 0);
});

test('embed policy reports unsupported providers and invalid urls', () => {
  const unsupported = evaluateEmbedPolicy({
    url: 'https://example.org/embed/1',
    providerNameSlug: ''
  });
  assert.equal(unsupported.allowed, false);
  assert.equal(unsupported.issues[0].code, 'EMBED_PROVIDER_UNSUPPORTED');

  const invalid = evaluateEmbedPolicy({
    url: 'notaurl',
    providerNameSlug: 'youtube'
  });
  assert.equal(invalid.allowed, false);
  assert.equal(invalid.issues[0].code, 'EMBED_URL_INVALID');
});
