import { error, json, readJson } from '../http.js';

export function createFormRoutes({ runtime, store, route }) {
  return [
    route('POST', '/v1/forms/:formId/submit', async (request, params) => {
      const ctx = runtime.requestContext(request);
      if (runtime.rateLimit) {
        const limit = await runtime.rateLimit(`form:${params.formId}:${ctx.ipHash}`, { max: 5, windowMs: 60000 });
        if (!limit.allowed) {
          return error('RATE_LIMITED', 'Too many submissions', 429);
        }
      }
      const body = await readJson(request);
      const submission = await store.createFormSubmission({
        id: `sub_${runtime.uuid()}`,
        formId: params.formId,
        payload: body.payload || {},
        requestContext: ctx
      });
      return json({ submissionId: submission.id }, 202);
    })
  ];
}
