import test from 'node:test';
import assert from 'node:assert/strict';

import { createContentModelFeature } from '../src/store/content-model.js';
import { createDocumentsFeature } from '../src/store/documents.js';
import { createInMemoryState, createRuntime } from '../../testing/src/coverage-fakes.js';

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

test('testing store content-model preserves createdAt on updates and supports get/list fallbacks', async () => {
  const state = createInMemoryState();
  let tick = 0;
  const runtime = {
    now() {
      tick += 1;
      return new Date(`2026-02-11T00:00:${String(tick).padStart(2, '0')}.000Z`);
    }
  };
  const contentModel = createContentModelFeature(state, runtime);

  const firstType = await contentModel.upsertContentType({
    id: 'ct_page',
    slug: 'page',
    label: 'Page',
    fields: [],
    supports: {},
    statusOptions: ['draft']
  });
  const updatedType = await contentModel.upsertContentType({
    id: 'ct_page',
    slug: 'page',
    label: 'Page Updated',
    fields: [],
    supports: { title: true },
    statusOptions: ['draft', 'published']
  });
  assert.equal(updatedType.createdAt, firstType.createdAt);
  assert.notEqual(updatedType.updatedAt, firstType.updatedAt);
  assert.equal((await contentModel.getContentType('page')).label, 'Page Updated');
  assert.equal(await contentModel.getContentType('missing'), null);

  const firstTaxonomy = await contentModel.upsertTaxonomy({
    id: 'tx_topic',
    slug: 'topic',
    label: 'Topic',
    hierarchical: true,
    objectTypes: ['post']
  });
  const updatedTaxonomy = await contentModel.upsertTaxonomy({
    id: 'tx_topic',
    slug: 'topic',
    label: 'Topics',
    hierarchical: false,
    objectTypes: ['post', 'page']
  });
  assert.equal(updatedTaxonomy.createdAt, firstTaxonomy.createdAt);
  assert.equal((await contentModel.getTaxonomy('topic')).label, 'Topics');
  assert.equal(await contentModel.getTaxonomy('missing'), null);

  const firstTerm = await contentModel.upsertTerm({
    id: 'term_topic_alpha',
    taxonomySlug: 'topic',
    slug: 'alpha',
    name: 'Alpha'
  });
  const updatedTerm = await contentModel.upsertTerm({
    id: 'term_topic_alpha',
    taxonomySlug: 'topic',
    slug: 'alpha',
    name: 'Alpha Updated'
  });
  assert.equal(updatedTerm.createdAt, firstTerm.createdAt);
  assert.equal((await contentModel.getTerm('term_topic_alpha')).name, 'Alpha Updated');
  assert.equal(await contentModel.getTerm('missing'), null);

  const allTerms = await contentModel.listTerms();
  assert.equal(allTerms.length, 1);
});
