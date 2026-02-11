import { createRelease } from '@geekist/edgepress/publish';
import { requireCapability } from '../auth.js';
import { error, json, readJson } from '../http.js';
import { normalizePublishProvenance } from '../request-validation.js';
import { applyFilters, doAction, HOOK_NAMES } from '../hooks.js';

export function createPublishRoutes({ runtime, store, releaseStore, hooks, route, authzErrorResponse }) {
  return [
    route('POST', '/v1/publish', async (request) => {
      try {
        const user = await requireCapability({ runtime, store, request, capability: 'publish:write' });
        const body = await readJson(request);
        const provenance = normalizePublishProvenance(body);
        if (provenance.error) return provenance.error;
        const filteredPublishPayload = applyFilters(hooks, HOOK_NAMES.publishProvenanceFilter, {
          runtime,
          request,
          user,
          body,
          provenance
        });
        const effectiveProvenance = filteredPublishPayload?.provenance || provenance;
        const jobId = `job_${runtime.uuid()}`;
        let job = await store.createPublishJob({
          id: jobId,
          requestedBy: user.id,
          sourceRevisionId: effectiveProvenance.sourceRevisionId,
          sourceRevisionSet: effectiveProvenance.sourceRevisionSet
        });
        doAction(runtime, hooks, HOOK_NAMES.publishStartedAction, { user, job });

        let publishError = null;
        try {
          const manifest = await createRelease({
            runtime,
            store,
            releaseStore,
            sourceRevisionId: effectiveProvenance.sourceRevisionId,
            sourceRevisionSet: effectiveProvenance.sourceRevisionSet,
            publishedBy: user.id
          });
          let activatedRelease = null;
          if (!(await releaseStore.getActiveRelease())) {
            await releaseStore.activateRelease(manifest.releaseId);
            activatedRelease = manifest.releaseId;
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

        const responseStatus = publishError ? 500 : 201;
        return json({ job }, responseStatus);
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('GET', '/v1/publish/:jobId', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        const job = await store.getPublishJob(params.jobId);
        if (!job) return error('PUBLISH_JOB_NOT_FOUND', 'Publish job not found', 404);
        return json({ job });
      } catch (e) {
        return authzErrorResponse(e);
      }
    }),

    route('POST', '/v1/releases/:id/activate', async (request, params) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'publish:write' });
        const activeRelease = await releaseStore.activateRelease(params.id);
        doAction(runtime, hooks, HOOK_NAMES.releaseActivatedAction, {
          releaseId: activeRelease,
          source: 'manual'
        });
        return json({ activeRelease });
      } catch (e) {
        const authCodes = new Set(['FORBIDDEN', 'AUTH_REQUIRED', 'AUTH_INVALID_TOKEN']);
        if (authCodes.has(e?.code)) return authzErrorResponse(e);
        if (e?.message === 'Unknown releaseId') {
          return error('RELEASE_NOT_FOUND', e.message, 404);
        }
        return error('RELEASE_ACTIVATE_FAILED', e.message || 'Unable to activate release', 500);
      }
    }),

    route('GET', '/v1/releases', async (request) => {
      try {
        await requireCapability({ runtime, store, request, capability: 'document:read' });
        const items = await releaseStore.listReleases();
        const activeRelease = await releaseStore.getActiveRelease();
        return json({ items, activeRelease });
      } catch (e) {
        return authzErrorResponse(e);
      }
    })
  ];
}
