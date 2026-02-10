import {
  createPublishJob,
  createFormSubmission
} from '@geekist/edgepress/domain/entities.js';

export function createPublishD1(d1, D1_SQL, parseJsonSafe, runtime, ensureD1AppSchema) {
  return {
    async createPublishJob(input) {
      await ensureD1AppSchema();
      const now = runtime.now().toISOString();
      const job = createPublishJob({ ...input, now });
      await d1.prepare(D1_SQL.upsertPublishJob).bind(job.id, JSON.stringify(job), job.updatedAt).run();
      return job;
    },
    async updatePublishJob(id, patch) {
      await ensureD1AppSchema();
      const existing = await this.getPublishJob(id);
      if (!existing) return null;
      const updated = { ...existing, ...patch, updatedAt: runtime.now().toISOString() };
      await d1.prepare(D1_SQL.upsertPublishJob).bind(updated.id, JSON.stringify(updated), updated.updatedAt).run();
      return updated;
    },
    async getPublishJob(id) {
      await ensureD1AppSchema();
      const row = await d1.prepare(D1_SQL.selectPublishJobById).bind(id).first();
      return parseJsonSafe(row?.publish_job_json);
    },
    async createFormSubmission(input) {
      await ensureD1AppSchema();
      const now = runtime.now().toISOString();
      const submission = createFormSubmission({ ...input, now });
      await d1
        .prepare(D1_SQL.upsertFormSubmission)
        .bind(submission.id, submission.formId, JSON.stringify(submission), submission.createdAt)
        .run();
      return submission;
    }
  };
}

export function createPublishKv(appKey, kvGetJson, kvPutJson, ensureKvSeeded, runtime) {
  return {
    async createPublishJob(input) {
      await ensureKvSeeded();
      const now = runtime.now().toISOString();
      const job = createPublishJob({ ...input, now });
      await kvPutJson(appKey('publish_job', job.id), job);
      return job;
    },
    async updatePublishJob(id, patch) {
      await ensureKvSeeded();
      const existing = await kvGetJson(appKey('publish_job', id));
      if (!existing) return null;
      const updated = { ...existing, ...patch, updatedAt: runtime.now().toISOString() };
      await kvPutJson(appKey('publish_job', id), updated);
      return updated;
    },
    async getPublishJob(id) {
      await ensureKvSeeded();
      return kvGetJson(appKey('publish_job', id));
    },
    async createFormSubmission(input) {
      await ensureKvSeeded();
      const now = runtime.now().toISOString();
      const submission = createFormSubmission({ ...input, now });
      await kvPutJson(appKey('form_submission', submission.id), submission);
      return submission;
    }
  };
}
