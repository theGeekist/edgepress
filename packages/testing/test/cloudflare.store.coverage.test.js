import test from 'node:test';
import assert from 'node:assert/strict';

import { createNavigationD1, createNavigationKv } from '../../cloudflare/src/navigation.js';
import { createDocumentsD1, createDocumentsKv } from '../../cloudflare/src/documents.js';
import { createContentModelD1, createContentModelKv } from '../../cloudflare/src/content-model.js';
import {
  createFakeD1,
  createKvHelpers,
  createRuntime,
  parseJsonSafe
} from './helpers/coverage-fakes.js';

test('cloudflare navigation adapters cover d1 and kv branches', async () => {
  const D1_SQL = {
    selectNavigationMenus: 'selectNavigationMenus',
    selectNavigationMenuByKey: 'selectNavigationMenuByKey',
    upsertNavigationMenu: 'upsertNavigationMenu'
  };
  const menu = { key: 'primary', title: 'Primary', items: [] };
  const d1 = createFakeD1({
    allRows: { selectNavigationMenus: [{ menu_json: JSON.stringify(menu) }] },
    firstRows: { 'selectNavigationMenuByKey::["primary"]': { menu_json: JSON.stringify(menu) } }
  });
  const navD1 = createNavigationD1(d1, D1_SQL, parseJsonSafe, createRuntime(), async () => {});
  assert.equal((await navD1.listNavigationMenus()).length, 1);
  assert.equal((await navD1.getNavigationMenu('primary')).key, 'primary');
  const up = await navD1.upsertNavigationMenu(menu);
  assert.equal(up.key, 'primary');

  const { appKey, kvGetJson, kvPutJson, kvIndexAdd } = createKvHelpers();
  const navKv = createNavigationKv(appKey, kvGetJson, kvPutJson, async () => {}, kvIndexAdd, createRuntime());
  await navKv.upsertNavigationMenu(menu);
  assert.equal((await navKv.listNavigationMenus()).length, 1);
  assert.equal((await navKv.getNavigationMenu('primary')).title, 'Primary');
});

test('cloudflare documents/content-model adapters cover d1 and kv branches', async () => {
  const now = createRuntime();
  const D1_SQL = {
    selectDocuments: 'selectDocuments',
    selectDocumentById: 'selectDocumentById',
    upsertDocument: 'upsertDocument',
    deleteRevisionsByDocument: 'deleteRevisionsByDocument',
    deleteDocumentById: 'deleteDocumentById',
    selectRevisionsByDocument: 'selectRevisionsByDocument',
    selectRevisionById: 'selectRevisionById',
    upsertRevision: 'upsertRevision',
    selectContentTypes: 'selectContentTypes',
    selectContentTypeBySlug: 'selectContentTypeBySlug',
    upsertContentType: 'upsertContentType',
    selectTaxonomies: 'selectTaxonomies',
    selectTaxonomyBySlug: 'selectTaxonomyBySlug',
    upsertTaxonomy: 'upsertTaxonomy',
    selectTermsByTaxonomySlug: 'selectTermsByTaxonomySlug',
    selectTerms: 'selectTerms',
    selectTermById: 'selectTermById',
    upsertTerm: 'upsertTerm'
  };

  const existingDoc = { id: 'doc_1', title: 'Doc', content: '', status: 'draft', type: 'page', updatedAt: '2026-02-11T00:00:00.000Z' };
  const existingRevision = { id: 'rev_1', documentId: 'doc_1', title: 'Doc', content: '' };
  const existingCt = { id: 'ct_1', slug: 'post', label: 'Post', createdAt: 'x', updatedAt: 'x' };
  const existingTax = { id: 'tx_1', slug: 'category', label: 'Category', createdAt: 'x', updatedAt: 'x' };
  const existingTerm = { id: 'term_1', taxonomySlug: 'category', slug: 'news', name: 'News', createdAt: 'x', updatedAt: 'x' };
  const d1 = createFakeD1({
    allRows: {
      selectDocuments: [{ document_json: JSON.stringify(existingDoc) }],
      'selectRevisionsByDocument::["doc_1"]': [{ revision_json: JSON.stringify(existingRevision) }],
      selectContentTypes: [{ content_type_json: JSON.stringify(existingCt) }],
      selectTaxonomies: [{ taxonomy_json: JSON.stringify(existingTax) }],
      selectTerms: [{ term_json: JSON.stringify(existingTerm) }],
      'selectTermsByTaxonomySlug::["category"]': [{ term_json: JSON.stringify(existingTerm) }]
    },
    firstRows: {
      'selectDocumentById::["doc_1"]': { document_json: JSON.stringify(existingDoc) },
      'selectRevisionById::["rev_1"]': { revision_json: JSON.stringify(existingRevision) },
      'selectContentTypeBySlug::["post"]': { content_type_json: JSON.stringify(existingCt) },
      'selectTaxonomyBySlug::["category"]': { taxonomy_json: JSON.stringify(existingTax) },
      'selectTermById::["term_1"]': { term_json: JSON.stringify(existingTerm) }
    }
  });

  const docsD1 = createDocumentsD1(d1, D1_SQL, parseJsonSafe, now, async () => {});
  assert.equal((await docsD1.listDocuments()).items.length, 1);
  assert.equal((await docsD1.getDocument('doc_1')).id, 'doc_1');
  assert.equal((await docsD1.updateDocument('missing', { title: 'x' })), null);
  assert.equal((await docsD1.deleteDocument('missing')), null);
  assert.equal((await docsD1.listRevisions('doc_1')).length, 1);
  assert.equal((await docsD1.getRevision('rev_1')).id, 'rev_1');
  await docsD1.createDocument({ id: 'doc_2', title: 'New', content: '' });
  await docsD1.updateDocument('doc_1', { title: 'Updated' });
  await docsD1.deleteDocument('doc_1', { permanent: true });
  await docsD1.createRevision({ id: 'rev_2', documentId: 'doc_1', title: 'Doc', content: '' });

  const cmD1 = createContentModelD1(d1, D1_SQL, parseJsonSafe, now, async () => {});
  assert.equal((await cmD1.listContentTypes()).length, 1);
  assert.equal((await cmD1.getContentType('post')).slug, 'post');
  await cmD1.upsertContentType({ id: 'ct_2', slug: 'page', label: 'Page', fields: [] });
  assert.equal((await cmD1.listTaxonomies()).length, 1);
  assert.equal((await cmD1.getTaxonomy('category')).slug, 'category');
  await cmD1.upsertTaxonomy({ id: 'tx_2', slug: 'tag', label: 'Tag', hierarchical: false });
  assert.equal((await cmD1.listTerms()).length, 1);
  assert.equal((await cmD1.listTerms({ taxonomySlug: 'category' })).length, 1);
  assert.equal((await cmD1.getTerm('term_1')).id, 'term_1');
  await cmD1.upsertTerm({ id: 'term_2', taxonomySlug: 'category', slug: 'updates', name: 'Updates' });

  const { appKey, kvGetJson, kvPutJson, kvIndexAdd, kvDelete } = createKvHelpers();

  const docsKv = createDocumentsKv(appKey, kvGetJson, kvPutJson, async () => {}, kvIndexAdd, now);
  await docsKv.createDocument({ id: 'doc_kv', title: 'KV', content: '' });
  assert.equal((await docsKv.listDocuments()).items.length, 1);
  assert.equal((await docsKv.getDocument('doc_kv')).id, 'doc_kv');
  assert.equal((await docsKv.updateDocument('missing', { title: 'x' })), null);
  await docsKv.createRevision({ id: 'rev_kv', documentId: 'doc_kv', title: 'KV', content: '' });
  assert.equal((await docsKv.listRevisions('doc_kv')).length, 1);
  assert.equal((await docsKv.getRevision('rev_kv')).id, 'rev_kv');
  await docsKv.deleteDocument('doc_kv', { permanent: true }, kvDelete);

  const cmKv = createContentModelKv(appKey, kvGetJson, kvPutJson, async () => {}, kvIndexAdd, now);
  await cmKv.upsertContentType({ id: 'ct_kv', slug: 'post', label: 'Post', fields: [] });
  await cmKv.upsertTaxonomy({ id: 'tx_kv', slug: 'category', label: 'Category', hierarchical: true });
  await cmKv.upsertTerm({ id: 'term_kv', taxonomySlug: 'category', slug: 'news', name: 'News' });
  assert.equal((await cmKv.listContentTypes()).length, 1);
  assert.equal((await cmKv.listTaxonomies()).length, 1);
  assert.equal((await cmKv.listTerms({ taxonomySlug: 'category' })).length, 1);
});
