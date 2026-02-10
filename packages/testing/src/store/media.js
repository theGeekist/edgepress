import {
  createMediaAssetSession,
  finalizeMediaAsset
} from '@geekist/edgepress/domain/entities.js';
import { applyMediaQuery } from '../shared/query.js';

export function createMediaFeature(state, runtime) {
  return {
    async createMediaSession(input) {
      const now = runtime.now().toISOString();
      const media = createMediaAssetSession({ ...input, now });
      state.media.set(media.id, media);
      return media;
    },
    async finalizeMedia(id, input) {
      const existing = state.media.get(id);
      if (!existing) return null;
      const now = runtime.now().toISOString();
      const finalized = finalizeMediaAsset(existing, input, now);
      state.media.set(id, finalized);
      return finalized;
    },
    async listMedia(query = {}) {
      return applyMediaQuery(state, query);
    },
    async getMedia(id) {
      return state.media.get(id) || null;
    },
    async updateMedia(id, patch) {
      const existing = state.media.get(id);
      if (!existing) return null;
      const updated = {
        ...existing,
        alt: patch.alt !== undefined ? String(patch.alt || '').trim() : existing.alt || '',
        caption: patch.caption !== undefined ? String(patch.caption || '').trim() : existing.caption || '',
        description: patch.description !== undefined ? String(patch.description || '').trim() : existing.description || '',
        updatedAt: runtime.now().toISOString()
      };
      state.media.set(id, updated);
      return updated;
    },
    async deleteMedia(id) {
      const existing = state.media.get(id);
      if (!existing) return null;
      state.media.delete(id);
      return { id };
    }
  };
}
