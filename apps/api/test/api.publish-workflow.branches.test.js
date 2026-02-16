import test from 'node:test';
import assert from 'node:assert/strict';
import { runPublishWorkflow } from '../src/orchestration/publish-workflow.js';

function createRuntime(logs = []) {
  return {
    uuid: () => 'fixed123',
    log(level, event, meta) {
      logs.push({ level, event, meta });
    }
  };
}

test('publish workflow logs update and completed-action failures while returning failed job', async () => {
  const logs = [];
  const runtime = createRuntime(logs);

  const store = {
    async createPublishJob(input) {
      return { ...input };
    },
    async updatePublishJob() {
      throw new Error('db down');
    }
  };

  const hooks = {
    doAction(name) {
      if (name === 'edgepress.publish.completed') {
        throw new Error('hook failed');
      }
    }
  };

  const result = await runPublishWorkflow({
    runtime,
    store,
    releaseStore: { activateIfNone: async () => null },
    hooks,
    createRelease: async () => {
      throw new Error('publish failed');
    },
    user: { id: 'u_admin' },
    provenance: { sourceRevisionId: 'rev1', sourceRevisionSet: ['rev1'] }
  });

  assert.equal(result.responseStatus, 500);
  assert.ok(typeof result.job.id === 'string' && result.job.id.length > 0);
  assert.ok(logs.some((entry) => entry.event === 'publish_job_update_failed'));
  assert.ok(logs.some((entry) => entry.event === 'publish_complete_action_failed'));
  assert.ok(logs.some((entry) => entry.event === 'publish_job_update_failed' && entry.level === 'error'));
  assert.ok(logs.some((entry) => entry.event === 'publish_complete_action_failed' && entry.level === 'error'));
});
