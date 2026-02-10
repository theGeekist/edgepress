export function createReleaseFeature(state, runtime) {
  return {
    async writeArtifact(releaseId, route, bytes, contentType = 'text/html') {
      const path = `${releaseId}/${route}.html`;
      await state.blobStore.putBlob(path, bytes, { contentType });
      state.releaseHistory.push({
        type: 'artifact_written',
        releaseId,
        route,
        path,
        at: runtime.now().toISOString()
      });
      return {
        releaseId,
        route,
        path,
        contentType
      };
    },
    async writeManifest(releaseId, manifest) {
      if (state.releases.has(releaseId)) {
        throw new Error('ReleaseManifest is immutable and already exists for this releaseId');
      }
      state.releases.set(releaseId, manifest);
      state.releaseHistory.push({
        type: 'manifest_written',
        releaseId,
        at: runtime.now().toISOString()
      });
    },
    async getManifest(releaseId) {
      return state.releases.get(releaseId) || null;
    },
    async listReleases() {
      return Array.from(state.releases.values());
    },
    async activateRelease(releaseId) {
      if (!state.releases.has(releaseId)) {
        throw new Error('Unknown releaseId');
      }
      const previousReleaseId = state.activeRelease;
      if (previousReleaseId === releaseId) {
        return state.activeRelease;
      }
      state.activeRelease = releaseId;
      state.releaseHistory.push({
        type: 'activated',
        releaseId,
        previousReleaseId,
        at: runtime.now().toISOString()
      });
      return state.activeRelease;
    },
    async getActiveRelease() {
      return state.activeRelease;
    },
    async getReleaseHistory() {
      return state.releaseHistory.slice();
    }
  };
}
