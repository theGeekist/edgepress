import {
  createPublishJob,
  createFormSubmission
} from '@geekist/edgepress/domain/entities.js';

export function createPublishFeature(state, runtime) {
  return {
    async createPublishJob(input) {
      const now = runtime.now().toISOString();
      const job = createPublishJob({ ...input, now });
      state.publishJobs.set(job.id, job);
      return job;
    },
    async updatePublishJob(id, patch) {
      const existing = state.publishJobs.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...patch, updatedAt: runtime.now().toISOString() };
      state.publishJobs.set(id, updated);
      return updated;
    },
    async getPublishJob(id) {
      return state.publishJobs.get(id) || null;
    },
    async createFormSubmission(input) {
      const now = runtime.now().toISOString();
      const submission = createFormSubmission({ ...input, now });
      state.forms.set(submission.id, submission);
      return submission;
    }
  };
}
