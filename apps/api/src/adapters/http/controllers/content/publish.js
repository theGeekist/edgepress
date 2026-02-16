import { requireCapability } from '@geekist/edgepress/api-core/auth.js';
import { error, json, readJson } from '@geekist/edgepress/api-core/http.js';
import { normalizePublishProvenance } from '@geekist/edgepress/api-core/request-validation.js';
import { applyFilters, doAction, HOOK_NAMES } from '@geekist/edgepress/api-core/hooks.js';

export function createPublishRoutes({ runtime, store, releaseStore, hooks, route, authzErrorResponse, workflows }) {
  const createRelease = workflows?.createRelease;
  const runPublishWorkflow = workflows?.runPublishWorkflow;
  if (typeof createRelease !== 'function') {
    throw new Error('Missing required workflow: createRelease');
  }
  if (typeof runPublishWorkflow !== 'function') {
    throw new Error('Missing required workflow: runPublishWorkflow');
  }

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

        const result = await runPublishWorkflow({
          runtime,
          store,
          releaseStore,
          hooks,
          createRelease,
          user,
          provenance: effectiveProvenance
        });

        return json({ job: result.job }, result.responseStatus);
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
          releaseId: activeRelease?.id || params.id,
          source: 'manual'
        });
        return json({ activeRelease });
      } catch (e) {
        const authCodes = new Set(['FORBIDDEN', 'AUTH_REQUIRED', 'AUTH_INVALID_TOKEN']);
        if (authCodes.has(e?.code)) return authzErrorResponse(e);
        if (e?.message === 'Unknown releaseId') {
          return error('RELEASE_NOT_FOUND', e.message, 404);
        }
        return error('RELEASE_ACTIVATE_FAILED', 'Unable to activate release', 500);
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
