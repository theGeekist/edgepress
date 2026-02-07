import { useState, useCallback, useRef, useEffect } from 'react';

// Default WordPress-style menu structure
export const DEFAULT_MENU_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
  },
  {
    id: 'content',
    label: 'Content',
  },
  {
    id: 'media',
    label: 'Media',
  },
  {
    id: 'appearance',
    label: 'Appearance',
    children: [
      { id: 'themes', label: 'Themes', parentId: 'appearance' },
      { id: 'menus', label: 'Menus', parentId: 'appearance' },
      { id: 'widgets', label: 'Widgets', parentId: 'appearance' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
  },
];

export function useSidebarNavigation({ activeItemId, onSelectItem }) {
  const [expandedItems, setExpandedItems] = useState(new Set(['content', 'appearance']));
  const [focusedItemId, setFocusedItemId] = useState(null);

  // Find all focusable item IDs in order
  const allItemIds = useCallback((items, parentId = null) => {
    let ids = [];
    items.forEach(item => {
      ids.push({ id: item.id, parentId });
      if (item.children) {
        ids = ids.concat(allItemIds(item.children, item.id));
      }
    });
    return ids;
  }, []);

  const getFocusableItemIds = (menuItems) => allItemIds(menuItems);
  const getFocusedIndex = (focusableIds) => focusableIds.findIndex(item => item.id === focusedItemId);

  const handleToggleExpand = useCallback((itemId) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const handleKeyDown = useCallback((e, itemId, focusableIds, focusedIndex) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = Math.min(focusedIndex + 1, focusableIds.length - 1);
        setFocusedItemId(focusableIds[nextIndex]?.id);
        break;
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = Math.max(focusedIndex - 1, 0);
        setFocusedItemId(focusableIds[prevIndex]?.id);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        const currentItem = focusableIds.find(i => i.id === itemId);
        if (currentItem?.parentId && expandedItems.has(currentItem.parentId)) {
          handleToggleExpand(currentItem.parentId);
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        const current = focusableIds.find(i => i.id === itemId);
        if (current?.parentId && !expandedItems.has(current.parentId)) {
          handleToggleExpand(current.parentId);
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelectItem(itemId);
        break;
      case 'Home':
        e.preventDefault();
        setFocusedItemId(focusableIds[0]?.id);
        break;
      case 'End':
        e.preventDefault();
        setFocusedItemId(focusableIds[focusableIds.length - 1]?.id);
        break;
      case 'Escape':
        e.preventDefault();
        setFocusedItemId(null);
        break;
    }
  }, [expandedItems, handleToggleExpand, onSelectItem, focusedItemId]);

  // Auto-expand parent of active item
  useEffect(() => {
    if (activeItemId) {
      // Find parent by traversing menu items
      const findParent = (items, targetId, parentId = null) => {
        for (const item of items) {
          if (item.id === targetId) {
            return parentId;
          }
          if (item.children) {
            const found = findParent(item.children, targetId, item.id);
            if (found !== undefined) return found;
          }
        }
        return undefined;
      };

      const menuItems = DEFAULT_MENU_ITEMS; // Or pass in as prop
      const parentId = findParent(menuItems, activeItemId);
      if (parentId) {
        setExpandedItems(prev => new Set([...prev, parentId]));
      }
    }
  }, [activeItemId]);

  return {
    expandedItems,
    focusedItemId,
    setFocusedItemId,
    handleToggleExpand,
    handleKeyDown,
    getFocusableItemIds,
    getFocusedIndex,
  };
}
