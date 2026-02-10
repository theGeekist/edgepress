import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeBlocksInput } from '../../domain/src/blocks.js';

test('normalizeBlocksInput covers validation and defaults branches', () => {
  assert.deepEqual(normalizeBlocksInput(undefined), []);
  assert.throws(() => normalizeBlocksInput({}), /blocks must be an array/);
  assert.throws(() => normalizeBlocksInput([1]), /must be an object/);
  assert.throws(() => normalizeBlocksInput([{ name: '' }]), /must be a non-empty string/);
  assert.throws(
    () => normalizeBlocksInput([{ name: 'core/paragraph', innerBlocks: {} }]),
    /innerBlocks must be an array/
  );
  assert.throws(
    () => normalizeBlocksInput([{ name: 'core/paragraph', attributes: 'bad' }]),
    /attributes must be an object/
  );

  const normalized = normalizeBlocksInput([{
    name: 'core/group',
    attributes: { z: 1, a: { b: 2, a: 1 } },
    innerBlocks: [{ name: 'core/paragraph' }]
  }]);
  assert.equal(normalized[0].name, 'core/group');
  assert.deepEqual(Object.keys(normalized[0].attributes), ['a', 'z']);
  assert.deepEqual(normalized[0].innerBlocks[0].attributes, {});
  assert.deepEqual(normalized[0].innerBlocks[0].innerBlocks, []);
});
