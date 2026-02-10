import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyHostBootstrap,
  buildHostBootstrapContract,
  getEmptyEditorContract,
  normalizeHostPostId,
  normalizeHostPostType
} from '../../../apps/admin-web/src/features/editor/gutenberg-host.js';

test('gutenberg host normalizes post type and id', () => {
  assert.equal(normalizeHostPostType('page'), 'page');
  assert.equal(normalizeHostPostType('post'), 'post');
  assert.equal(normalizeHostPostType('unknown'), 'post');
  assert.equal(typeof normalizeHostPostId('doc_123'), 'number');
  assert.equal(typeof normalizeHostPostId(''), 'number');
});

test('gutenberg host builds deterministic bootstrap contract', () => {
  const contract = buildHostBootstrapContract({
    postId: '',
    postType: 'unknown',
    title: '',
    serializedContent: ''
  });

  assert.equal(contract.postType, 'post');
  assert.equal(typeof contract.postId, 'number');
  assert.ok(Array.isArray(contract.entities));
  assert.equal(contract.records.editedEntity.name, 'post');
  assert.equal(contract.records.editedEntity.record.content.raw, '');
  assert.equal(contract.records.editedEntity.record.title.raw, '');
  assert.equal(contract.records.postTypeConfig.record.slug, 'post');
  assert.equal(contract.records.postTypeConfig.record.labels.view_item, 'View Post');
  assert.equal(contract.records.postTypeConfig.record.viewable, true);
  assert.deepEqual(contract.editor, getEmptyEditorContract());
});

test('gutenberg host empty-editor contract preserves empty post UX', () => {
  const contract = getEmptyEditorContract();
  assert.equal(contract.titlePlaceholder, 'Add title');
  assert.equal(contract.initialBlockName, 'core/paragraph');
  assert.equal(contract.hasFixedToolbar, false);
  assert.equal(contract.selectFirstBlockOnEmptySelection, true);
});

test('gutenberg host apply bootstrap wires entities and edited post', () => {
  const events = [];
  const coreDispatch = {
    receiveEntityRecords(kind, name, record) {
      events.push(['receiveEntityRecords', kind, name, record?.id || record?.slug || null]);
    },
    editEntityRecord(kind, name, id, edits) {
      events.push(['editEntityRecord', kind, name, id, edits?.title, edits?.content]);
    }
  };
  const contract = buildHostBootstrapContract({
    postId: 'doc_1',
    postType: 'page',
    title: 'Hello',
    serializedContent: '<!-- wp:paragraph --><p>Hi</p><!-- /wp:paragraph -->'
  });

  applyHostBootstrap({ coreDispatch, contract });

  const normalizedId = normalizeHostPostId('doc_1');
  assert.deepEqual(events[0], ['receiveEntityRecords', 'postType', 'page', normalizedId]);
  assert.deepEqual(events[1], ['receiveEntityRecords', 'root', 'postType', 'page']);
  assert.deepEqual(events[2], ['editEntityRecord', 'postType', 'page', normalizedId, 'Hello', '<!-- wp:paragraph --><p>Hi</p><!-- /wp:paragraph -->']);
  assert.equal(events.length, 3);
});
