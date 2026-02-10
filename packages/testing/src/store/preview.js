export function createPreviewStoreFeature(state) {
  return {
    async createPreview(input) {
      state.previews.set(input.previewToken, input);
      return input;
    },
    async getPreview(previewToken) {
      return state.previews.get(previewToken) || null;
    }
  };
}
