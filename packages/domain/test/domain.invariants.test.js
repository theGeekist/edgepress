import test from 'node:test';
import assert from 'node:assert/strict';
import {
    assertReleaseManifestImmutable,
    assertHasCapability,
    assertPreviewNotExpired
} from '@geekist/edgepress/domain/invariants.js';

test('assertReleaseManifestImmutable', () => {
    // Success
    assert.doesNotThrow(() => assertReleaseManifestImmutable(null));

    // Failure
    assert.throws(() => assertReleaseManifestImmutable({ id: 'm1' }), {
        message: 'ReleaseManifest is immutable and already exists for this releaseId'
    });
});

test('assertHasCapability', () => {
    const user = { capabilities: ['read', 'write'] };

    // Success
    assert.doesNotThrow(() => assertHasCapability(user, 'read'));

    // Failures
    assert.throws(() => assertHasCapability(null, 'read'), {
        message: 'Missing capability: read'
    });
    assert.throws(() => assertHasCapability({}, 'read'), {
        message: 'Missing capability: read'
    });
    assert.throws(() => assertHasCapability({ capabilities: 'not an array' }, 'read'), {
        message: 'Missing capability: read'
    });
    assert.throws(() => assertHasCapability(user, 'delete'), {
        message: 'Missing capability: delete'
    });
});

test('assertPreviewNotExpired', () => {
    const now = '2025-02-07T00:00:00Z';
    const future = '2025-02-07T01:00:00Z';
    const past = '2025-02-06T23:00:00Z';

    // Success
    assert.doesNotThrow(() => assertPreviewNotExpired({ expiresAt: future }, now));

    // Failures
    assert.throws(() => assertPreviewNotExpired(null, now), {
        message: 'Preview session not found'
    });
    assert.throws(() => assertPreviewNotExpired({ expiresAt: past }, now), {
        message: 'Preview session expired'
    });
    assert.throws(() => assertPreviewNotExpired({ expiresAt: now }, now), {
        message: 'Preview session expired'
    });
});
