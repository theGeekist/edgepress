import { error, json, readJson } from '@geekist/edgepress/api-core/http.js';
import { createFormsFeature } from '@geekist/edgepress/content';

export function createFormRoutes({ runtime, store, route }) {
  const forms = createFormsFeature({ runtime, store });

  return [
    route('POST', '/v1/forms/:formId/submit', async (request, params) => {
      try {
        const body = await readJson(request);
        const result = await forms.submitForm({
          formId: params.formId,
          body,
          requestContext: runtime.requestContext(request)
        });
        if (result.error) return error(result.error.code, result.error.message, result.error.status);
        return json(result, 202);
      } catch (e) {
        if (typeof e?.status === 'number' && typeof e?.code === 'string') {
          return error(e.code, e.message, e.status);
        }
        return error('INTERNAL_ERROR', 'Internal server error', 500);
      }
    })
  ];
}
