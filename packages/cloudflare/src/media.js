import {
  createMediaAssetSession,
  finalizeMediaAsset
} from '@geekist/edgepress/domain/entities.js';
import { applyMediaQuery } from './shared/query.js';

export function createMediaD1(d1, D1_SQL, parseJsonSafe, runtime, ensureD1AppSchema) {
  return {
    async createMediaSession(input) {
      await ensureD1AppSchema();
      const now = runtime.now().toISOString();
      const media = createMediaAssetSession({ ...input, now });
      await d1.prepare(D1_SQL.upsertMedia).bind(media.id, JSON.stringify(media), media.updatedAt).run();
      return media;
    },
    async finalizeMedia(id, input) {
      await ensureD1AppSchema();
      const existing = await this.getMedia(id);
      if (!existing) return null;
      const now = runtime.now().toISOString();
      const finalized = finalizeMediaAsset(existing, input, now);
      await d1.prepare(D1_SQL.upsertMedia).bind(finalized.id, JSON.stringify(finalized), finalized.updatedAt).run();
      return finalized;
    },
    async listMedia(query = {}) {
      await ensureD1AppSchema();
      const rows = await d1.prepare(D1_SQL.selectMedia).all();
      const all = (rows.results || []).map((entry) => parseJsonSafe(entry.media_json)).filter(Boolean);
      return applyMediaQuery(all, query);
    },
    async getMedia(id) {
      await ensureD1AppSchema();
      const row = await d1.prepare(D1_SQL.selectMediaById).bind(id).first();
      return parseJsonSafe(row?.media_json);
    },
    async updateMedia(id, patch) {
      await ensureD1AppSchema();
      const existing = await this.getMedia(id);
      if (!existing) return null;
      const updated = {
        ...existing,
        alt: patch.alt !== undefined ? String(patch.alt || '').trim() : existing.alt || '',
        caption: patch.caption !== undefined ? String(patch.caption || '').trim() : existing.caption || '',
        description: patch.description !== undefined ? String(patch.description || '').trim() : existing.description || '',
        updatedAt: runtime.now().toISOString()
      };
      await d1.prepare(D1_SQL.upsertMedia).bind(updated.id, JSON.stringify(updated), updated.updatedAt).run();
      return updated;
    },
    async deleteMedia(id) {
      await ensureD1AppSchema();
      const existing = await this.getMedia(id);
      if (!existing) return null;
      await d1.prepare(D1_SQL.deleteMediaById).bind(id).run();
      return { id };
    }
  };
}

export function createMediaKv(appKey, kvGetJson, kvPutJson, ensureKvSeeded, kvIndexAdd, kvIndexRemove, runtime) {
  return {
    async createMediaSession(input) {
      await ensureKvSeeded();
      const now = runtime.now().toISOString();
      const media = createMediaAssetSession({ ...input, now });
      await kvPutJson(appKey('media', media.id), media);
      await kvIndexAdd(appKey('media_ids'), media.id);
      return media;
    },
    async finalizeMedia(id, input) {
      await ensureKvSeeded();
      const existing = await kvGetJson(appKey('media', id));
      if (!existing) return null;
      const now = runtime.now().toISOString();
      const finalized = finalizeMediaAsset(existing, input, now);
      await kvPutJson(appKey('media', id), finalized);
      return finalized;
    },
    async listMedia(query = {}) {
      await ensureKvSeeded();
      const ids = (await kvGetJson(appKey('media_ids'))) || [];
      const rows = await Promise.all(ids.map((id) => kvGetJson(appKey('media', id))));
      const all = rows.filter(Boolean);
      return applyMediaQuery(all, query);
    },
    async getMedia(id) {
      await ensureKvSeeded();
      return kvGetJson(appKey('media', id));
    },
    async updateMedia(id, patch) {
      await ensureKvSeeded();
      const existing = await kvGetJson(appKey('media', id));
      if (!existing) return null;
      const updated = {
        ...existing,
        alt: patch.alt !== undefined ? String(patch.alt || '').trim() : existing.alt || '',
        caption: patch.caption !== undefined ? String(patch.caption || '').trim() : existing.caption || '',
        description: patch.description !== undefined ? String(patch.description || '').trim() : existing.description || '',
        updatedAt: runtime.now().toISOString()
      };
      await kvPutJson(appKey('media', id), updated);
      return updated;
    },
    async deleteMedia(id, kvDelete) {
      await ensureKvSeeded();
      const existing = await kvGetJson(appKey('media', id));
      if (!existing) return null;
      if (kvDelete) {
        await kvDelete(appKey('media', id));
      } else {
        await kvPutJson(appKey('media', id), null);
      }
      await kvIndexRemove(appKey('media_ids'), id);
      return { id };
    }
  };
}
