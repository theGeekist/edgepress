import test from 'node:test';
import assert from 'node:assert/strict';

import {
  devToolsTabs,
  isDevToolsToggleShortcut,
  summarizeDiagnostics
} from '../src/features/editor/devtools/useDevToolsState.js';

test('devtools exports stable tabs in expected order', () => {
  assert.deepEqual(devToolsTabs, ['blocks', 'diagnostics', 'tracer', 'tokens']);
});

test('devtools shortcut accepts ctrl/cmd + shift + d', () => {
  assert.equal(
    isDevToolsToggleShortcut({ ctrlKey: true, metaKey: false, shiftKey: true, key: 'd' }),
    true
  );
  assert.equal(
    isDevToolsToggleShortcut({ ctrlKey: false, metaKey: true, shiftKey: true, key: 'D' }),
    true
  );
  assert.equal(
    isDevToolsToggleShortcut({ ctrlKey: true, metaKey: false, shiftKey: false, key: 'd' }),
    false
  );
});

test('diagnostic summarizer combines import and render counts', () => {
  const summary = summarizeDiagnostics(
    { counts: { transformed: 2, partial: 1, fallback: 0, unsupported: 1 } },
    { counts: { transformed: 3, partial: 0, fallback: 2, unsupported: 0 } }
  );
  assert.deepEqual(summary, {
    transformed: 5,
    partial: 1,
    fallback: 2,
    unsupported: 1
  });
});

test('diagnostic summarizer handles missing diagnostics safely', () => {
  const summary = summarizeDiagnostics(null, undefined);
  assert.deepEqual(summary, {
    transformed: 0,
    partial: 0,
    fallback: 0,
    unsupported: 0
  });
});
