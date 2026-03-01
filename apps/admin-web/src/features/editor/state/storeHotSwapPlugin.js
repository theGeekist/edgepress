/**
 * Route global core editor selectors/dispatches to the currently focused editor registry.
 * This mirrors IBE's focused instance behavior and avoids stale cross-instance reads.
 */
const HOT_STORES = new Set(['core/block-editor', 'core/editor']);

export function storeHotSwapPlugin(registry) {
  return {
    dispatch(reducerKey) {
      if (!HOT_STORES.has(reducerKey) || !storeHotSwapPlugin.targetDispatch) {
        return registry.dispatch(reducerKey);
      }
      return storeHotSwapPlugin.targetDispatch(reducerKey);
    },
    select(reducerKey) {
      if (!HOT_STORES.has(reducerKey) || !storeHotSwapPlugin.targetSelect) {
        return registry.select(reducerKey);
      }
      return storeHotSwapPlugin.targetSelect(reducerKey);
    }
  };
}

storeHotSwapPlugin.targetSelect = null;
storeHotSwapPlugin.targetDispatch = null;

storeHotSwapPlugin.setEditor = function setEditor(select, dispatch) {
  this.targetSelect = select;
  this.targetDispatch = dispatch;
};

storeHotSwapPlugin.resetEditor = function resetEditor() {
  this.targetSelect = null;
  this.targetDispatch = null;
};
