import test from 'node:test';
import assert from 'node:assert/strict';
import { storeHotSwapPlugin } from '../src/features/editor/state/storeHotSwapPlugin.js';
import { registerBootstrapPreload } from '../src/features/editor/services/registerBootstrapPreload.js';

test('store hot-swap plugin delegates to active editor for core stores only', () => {
  const events = [];
  const fallbackRegistry = {
    select(name) {
      events.push(['fallback:select', name]);
      return name;
    },
    dispatch(name) {
      events.push(['fallback:dispatch', name]);
      return name;
    }
  };

  const plugin = storeHotSwapPlugin(fallbackRegistry);
  const targetSelect = (name) => {
    events.push(['target:select', name]);
    return name;
  };
  const targetDispatch = (name) => {
    events.push(['target:dispatch', name]);
    return name;
  };

  storeHotSwapPlugin.setEditor(targetSelect, targetDispatch);
  plugin.select('core/editor');
  plugin.dispatch('core/block-editor');
  plugin.select('core/data');
  plugin.dispatch('core/data');
  storeHotSwapPlugin.resetEditor();

  assert.deepEqual(events, [
    ['target:select', 'core/editor'],
    ['target:dispatch', 'core/block-editor'],
    ['fallback:select', 'core/data'],
    ['fallback:dispatch', 'core/data']
  ]);
});

test('bootstrap preload registers deterministic key contract', () => {
  const preloadA = registerBootstrapPreload({
    postType: 'post',
    postId: 'doc_123',
    title: 'Hello',
    content: '<!-- wp:paragraph --><p>Body</p><!-- /wp:paragraph -->'
  });

  const preloadB = registerBootstrapPreload({
    postType: 'post',
    postId: 'doc_123',
    title: 'Hello',
    content: '<!-- wp:paragraph --><p>Body</p><!-- /wp:paragraph -->'
  });

  assert.equal(typeof preloadA, 'object');
  assert.equal(preloadA, preloadB);
  assert.ok(preloadA['/wp/v2/settings']);
  assert.ok(preloadA['/wp/v2/themes']);
  assert.ok(preloadA['/wp/v2/types?context=edit']);
});
