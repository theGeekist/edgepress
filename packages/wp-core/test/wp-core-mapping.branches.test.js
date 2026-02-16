import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toWpNumericId,
  loadDocumentByType,
  resolveInternalIdForWpId,
  resolveInternalMediaIdForWpId,
  toPostTypeRecord,
  toWpTaxonomyRecord
} from '../../wp-core/src/index.js';

test('wp-core id map handles empty/unknown ids and paginated lookups', async () => {
  assert.equal(toWpNumericId(''), 1);

  const store = {
    async getDocument(id) {
      if (id === 'doc_post') return { id, type: 'post' };
      if (id === 'doc_page') return { id, type: 'page' };
      return null;
    },
    async listDocuments({ page }) {
      if (page === 1) {
        return {
          items: [{ id: 'doc_x' }],
          pagination: { totalPages: 2 }
        };
      }
      return {
        items: [{ id: 'doc_post' }],
        pagination: { totalPages: 2 }
      };
    },
    async getMedia(id) {
      return id === 'med_ok' ? { id } : null;
    },
    async listMedia({ page }) {
      if (page === 1) {
        return { items: [{ id: 'med_a' }], pagination: { totalPages: 2 } };
      }
      return { items: [{ id: 'med_ok' }], pagination: { totalPages: 2 } };
    }
  };

  assert.equal(await loadDocumentByType(store, 'post', 'doc_page'), null);
  assert.equal(await loadDocumentByType(store, 'post', 'doc_post').then((d) => d.id), 'doc_post');

  assert.equal(await resolveInternalIdForWpId(store, 'post', ''), null);
  assert.equal(await resolveInternalIdForWpId(store, 'post', 'doc_post'), 'doc_post');
  assert.equal(await resolveInternalIdForWpId(store, 'post', 'doc_page'), null);
  assert.equal(await resolveInternalIdForWpId(store, 'post', 'not-a-number'), null);

  const wpId = String(toWpNumericId('doc_post'));
  assert.equal(await resolveInternalIdForWpId(store, 'post', wpId), 'doc_post');

  assert.equal(await resolveInternalMediaIdForWpId(store, ''), '');
  assert.equal(await resolveInternalMediaIdForWpId(store, 'med_missing'), '');
  assert.equal(await resolveInternalMediaIdForWpId(store, 'med_ok'), 'med_ok');
  assert.equal(await resolveInternalMediaIdForWpId(store, 'invalid'), '');
  const wpMediaId = String(toWpNumericId('med_ok'));
  assert.equal(await resolveInternalMediaIdForWpId(store, wpMediaId), 'med_ok');
});

test('wp-core records apply defaults for unknown type and sparse taxonomy', () => {
  const post = toPostTypeRecord('post');
  assert.equal(post.labels.singular_name, 'Post');

  const fallback = toPostTypeRecord('custom');
  assert.equal(fallback.labels.singular_name, 'Post');

  const taxonomy = toWpTaxonomyRecord({ slug: '', objectTypes: [null, 'post', ''] });
  assert.equal(taxonomy.slug, '');
  assert.equal(taxonomy.name, 'Taxonomies');
  assert.equal(taxonomy.labels.singular_name, 'Taxonomy');
  assert.deepEqual(taxonomy.types, ['post']);
});
