import { doAction, HOOK_NAMES } from '@geekist/edgepress/api-core/hooks.js';

export async function runPublishWorkflow({ runtime, store, releaseStore, hooks, createRelease, user, provenance }) {
  const jobId = `job_${runtime.uuid()}`;
  let job = await store.createPublishJob({
    id: jobId,
    requestedBy: user.id,
    sourceRevisionId: provenance.sourceRevisionId,
    sourceRevisionSet: provenance.sourceRevisionSet
  });

  let publishError = null;
  try {
    doAction(runtime, hooks, HOOK_NAMES.publishStartedAction, { user, job });

    const manifest = await createRelease({
      runtime,
      store,
      releaseStore,
      sourceRevisionId: provenance.sourceRevisionId,
      sourceRevisionSet: provenance.sourceRevisionSet,
      publishedBy: user.id
    });

    const activatedRelease = await releaseStore.activateIfNone(manifest.releaseId);
    if (activatedRelease) {
      doAction(runtime, hooks, HOOK_NAMES.releaseActivatedAction, {
        releaseId: manifest.releaseId,
        source: 'publish_auto'
      });
    }

    job = await store.updatePublishJob(jobId, {
      status: 'completed',
      releaseId: manifest.releaseId
    });

    doAction(runtime, hooks, HOOK_NAMES.publishCompletedAction, {
      user,
      job,
      manifest,
      activatedRelease
    });
  } catch (nextPublishError) {
    publishError = nextPublishError;
    try {
      job = await store.updatePublishJob(jobId, {
        status: 'failed',
        error: nextPublishError.message
      });
    } catch (updateError) {
      runtime.log('error', 'publish_job_update_failed', {
        jobId,
        error: updateError?.message || String(updateError),
        publishError: nextPublishError?.message || String(nextPublishError)
      });
    }

    try {
      doAction(runtime, hooks, HOOK_NAMES.publishCompletedAction, {
        user,
        job,
        error: nextPublishError
      });
    } catch (hookError) {
      runtime.log('error', 'publish_complete_action_failed', {
        jobId,
        error: hookError?.message || String(hookError),
        publishError: nextPublishError?.message || String(nextPublishError)
      });
    }
  }

  return {
    job,
    responseStatus: publishError ? 500 : 201
  };
}
