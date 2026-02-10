export function createPreviewD1(d1, D1_SQL, parseJsonSafe, ensureD1AppSchema) {
  return {
    async createPreview(input) {
      await ensureD1AppSchema();
      await d1
        .prepare(D1_SQL.upsertPreview)
        .bind(input.previewToken, JSON.stringify(input), input.expiresAt)
        .run();
      return input;
    },
    async getPreview(previewToken) {
      await ensureD1AppSchema();
      const row = await d1.prepare(D1_SQL.selectPreviewByToken).bind(previewToken).first();
      return parseJsonSafe(row?.preview_json);
    }
  };
}

export function createPreviewKv(appKey, kvGetJson, kvPutJson, ensureKvSeeded) {
  return {
    async createPreview(input) {
      await ensureKvSeeded();
      await kvPutJson(appKey('preview', input.previewToken), input);
      return input;
    },
    async getPreview(previewToken) {
      await ensureKvSeeded();
      return kvGetJson(appKey('preview', previewToken));
    }
  };
}
