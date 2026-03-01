/**
 * Route global core editor selectors/dispatches to the currently focused editor registry.
 * This mirrors IBE's focused instance behavior and avoids stale cross-instance reads.
 */
export function storeHotSwapPlugin(registry) {
  const hotStores = new Set(['core/block-editor', 'core/editor']);

  return {
    dispatch(reducerKey) {
      if (!hotStores.has(reducerKey) || !storeHotSwapPlugin.targetDispatch) {
        return registry.dispatch(reducerKey);
      }
      return storeHotSwapPlugin.targetDispatch(reducerKey);
    },
    select(reducerKey) {
      if (!hotStores.has(reducerKey) || !storeHotSwapPlugin.targetSelect) {
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
