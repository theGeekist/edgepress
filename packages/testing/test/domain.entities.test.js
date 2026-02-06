import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createUser,
    createDocument,
    createPublishJob,
    createMediaAssetSession,
    finalizeMediaAsset
} from '../../domain/src/entities.js';

test('createUser role-based capabilities', () => {
    const admin = createUser({ id: 'u1', username: 'admin', role: 'admin' });
    assert.ok(admin.capabilities.includes('publish:write'));

    const editor = createUser({ id: 'u2', username: 'editor', role: 'editor' });
    assert.ok(editor.capabilities.includes('document:write'));
    assert.ok(!editor.capabilities.includes('publish:write'));

    const viewer = createUser({ id: 'u3', username: 'viewer', role: 'viewer' });
    assert.ok(viewer.capabilities.includes('document:read'));
    assert.ok(!viewer.capabilities.includes('document:write'));

    const nobody = createUser({ id: 'u4', username: 'nobody', role: 'unknown' });
    assert.deepEqual(nobody.capabilities, []);
});

test('createDocument and normalization', () => {
    const doc = createDocument({
        id: 'd1',
        title: 'Title',
        content: 'Content',
        createdBy: 'u1',
        now: '2025-01-01'
    });
    assert.equal(doc.status, 'draft');
    assert.deepEqual(doc.blocks, []);
    assert.equal(doc.type, 'page');

    const docWithBlocks = createDocument({
        id: 'd2',
        title: 'Title',
        content: 'Body',
        createdBy: 'u1',
        type: 'post',
        blocks: [{ name: 'core/paragraph', attributes: { content: 'hello' } }],
        now: '2025-01-01'
    });
    assert.equal(docWithBlocks.type, 'post');
    assert.equal(docWithBlocks.blocks[0].name, 'core/paragraph');
});

test('createPublishJob defaults', () => {
    const job = createPublishJob({ id: 'j1', requestedBy: 'u1', now: '2025-01-01' });
    assert.equal(job.status, 'running');
    assert.equal(job.releaseId, null);
});

test('createMediaAssetSession and finalization', () => {
    const session = createMediaAssetSession({ id: 'm1', createdBy: 'u1', uploadToken: 't1', now: '2025-01-01' });
    assert.equal(session.status, 'pending');
    assert.equal(session.requiredHeaders['x-upload-token'], 't1');

    const final = finalizeMediaAsset(session, {
        filename: 'test.png',
        mimeType: 'image/png',
        size: 100,
        url: 'http://cdn/test.png'
    }, '2025-01-02');

    assert.equal(final.status, 'ready');
    assert.equal(final.url, 'http://cdn/test.png');
    assert.equal(final.updatedAt, '2025-01-02');
});
