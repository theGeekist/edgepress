import test from 'node:test';
import assert from 'node:assert/strict';
import { toErrorMessage } from '@geekist/edgepress/domain/errors.js';

test('toErrorMessage mapping', () => {
    assert.equal(toErrorMessage(null, 'Fallback'), 'Fallback');
    assert.equal(toErrorMessage(undefined, 'Fallback'), 'Fallback');
    assert.equal(toErrorMessage({ message: 'Error msg' }), 'Error msg');
    assert.equal(toErrorMessage('Plain string'), 'Plain string');
    assert.equal(toErrorMessage({}), '[object Object]');
    assert.equal(toErrorMessage(123), '123');
    assert.equal(toErrorMessage(new Error('boom')), 'boom');
    assert.equal(toErrorMessage(0), 'Unknown error');
    assert.equal(toErrorMessage(''), 'Unknown error');
    assert.equal(toErrorMessage(null), 'Unknown error');
});
