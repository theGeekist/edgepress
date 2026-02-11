import test from 'node:test';
import assert from 'node:assert/strict';

import { createContentModelFeature } from '../src/store/content-model.js';
import { createDocumentsFeature } from '../src/store/documents.js';
import { createInMemoryState, createRuntime } from './helpers/coverage-fakes.js';

test('testing store content-model/documents feature branches are covered', async () => {
  const state = createInMemoryState();
  const runtime = createRuntime();
  const docs = createDocumentsFeature(state, runtime);
  const contentModel = createContentModelFeature(state, runtime);

  const created = await docs.createDocument({ id: 'doc_1', title: 'T', content: '' });
  assert.equal(created.id, 'doc_1');
  assert.equal((await docs.updateDocument('missing', { title: 'x' })), null);
  assert.equal((await docs.deleteDocument('missing')), null);
  const softDeleted = await docs.deleteDocument('doc_1');
  assert.equal(softDeleted.status, 'trash');
  await docs.createRevision({ id: 'rev_1', documentId: 'doc_1', title: 'T', content: '' });
  const permanentDelete = await docs.deleteDocument('doc_1', { permanent: true });
  assert.deepEqual(permanentDelete, { id: 'doc_1' });
  assert.deepEqual(await docs.listRevisions('doc_1'), []);

  await contentModel.upsertContentType({
    id: 'ct_1',
    slug: 'post',
    label: 'Post',
    fields: [],
    supports: {},
    statusOptions: ['draft']
  });
  await contentModel.upsertTaxonomy({
    id: 'tx_1',
    slug: 'category',
    label: 'Category',
    hierarchical: true,
    objectTypes: ['post']
  });
  await contentModel.upsertTerm({
    id: 'term_1',
    taxonomySlug: 'category',
    slug: 'news',
    name: 'News'
  });
  assert.equal((await contentModel.listTerms({ taxonomySlug: 'category' })).length, 1);
  assert.equal((await contentModel.listTerms({ taxonomySlug: 'tag' })).length, 0);
});
