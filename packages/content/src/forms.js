export function createFormsFeature({ runtime, store }) {
  async function submitForm({ formId, body, requestContext }) {
    const payload = body?.payload;
    if (payload !== undefined && (payload === null || typeof payload !== 'object' || Array.isArray(payload))) {
      return { error: { code: 'FORM_PAYLOAD_INVALID', message: 'Form payload must be an object', status: 400 } };
    }

    if (runtime.rateLimit) {
      const limit = await runtime.rateLimit(`form:${formId}:${requestContext.ipHash}`, { max: 5, windowMs: 60000 });
      if (!limit.allowed) {
        return { error: { code: 'RATE_LIMITED', message: 'Too many submissions', status: 429 } };
      }
    }

    const submission = await store.createFormSubmission({
      id: `sub_${runtime.uuid()}`,
      formId,
      payload: payload || {},
      requestContext
    });

    return { submissionId: submission.id };
  }

  return {
    submitForm
  };
}
