import test from 'node:test';
import assert from 'node:assert/strict';
import {
  __resetHooksFallbackWarningForTests,
  resolveHooks,
  applyFilters,
  doAction
} from '../../api-core/src/hooks.js';

// Intentional duplication with apps/api hook-branch tests:
// api-core hooks and app hooks are independently testable modules with mirrored behavior.
test('resolveHooks logs fallback warning once for partial registries', () => {
  __resetHooksFallbackWarningForTests();
  const logs = [];
  const partial = { addAction() {} };

  const platform = {
    hooks: partial,
    runtime: { log: (...args) => logs.push(args) }
  };

  const first = resolveHooks(platform);
  const second = resolveHooks(platform);

  assert.notEqual(first, partial);
  assert.equal(second, first);
  assert.equal(logs.length, 1);
  assert.equal(logs[0][0], 'warn');
  assert.equal(logs[0][1], 'hooks_registry_fallback_wp_compat_required');
});

test('applyFilters returns payload unchanged when hook API is missing', () => {
  const payload = { ok: true };
  assert.equal(applyFilters(null, 'x', payload), payload);
  assert.equal(applyFilters({}, 'x', payload), payload);
});

test('doAction logs and rethrows sync hook errors', () => {
  const logs = [];
  const runtime = { log: (...args) => logs.push(args) };

  assert.throws(() => {
    doAction(runtime, {
      doAction() {
        throw new Error('boom');
      }
    }, 'hook.name', { value: 1 });
  }, /boom/);

  assert.equal(logs.length, 1);
  assert.equal(logs[0][0], 'error');
  assert.equal(logs[0][1], 'hook_sync_error');
});
