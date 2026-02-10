import { View } from 'react-native';
import { useRef, useEffect } from 'react';
import { layoutStyles } from '../styles.js';
import { useSidebarNavigation, DEFAULT_MENU_ITEMS } from '@hooks/useSidebarNavigation.js';
import { SidebarHeader } from './SidebarHeader.jsx';
import { SidebarItem } from './SidebarItem.jsx';
import { SidebarSubmenu } from './SidebarSubmenu.jsx';

function renderSidebarItems({
  items,
  palette,
  activeId,
  expandedItems,
  focusedItemId,
  itemRefs,
  onToggleExpand,
  onSelect,
  onKeyDown,
  getFocusableItemIds,
  getFocusedIndex,
  depth = 0
}) {
  return items.map((item) => {
    const hasChildren = Array.isArray(item.children) && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isActive = activeId === item.id;
    const hasActiveChild = item.children?.some(child => child.id === activeId);

    const focusableIds = getFocusableItemIds();
    const focusedIndex = getFocusedIndex(focusableIds);

    return (
      <SidebarItem
        key={item.id}
        ref={(ref) => {
          if (ref) itemRefs.current.set(item.id, ref);
        }}
        palette={palette}
        item={item}
        isActive={isActive}
        isExpanded={isExpanded}
        hasActiveChild={hasActiveChild}
        depth={depth}
        onPress={() => {
          if (hasChildren) {
            onToggleExpand(item.id);
          }
          onSelect(item.id);
        }}
        onKeyDown={(e) => onKeyDown(e, item.id, focusableIds, focusedIndex)}
      >
        {hasChildren && isExpanded && (
          <SidebarSubmenu palette={palette}>
            {renderSidebarItems({
              items: item.children,
              palette,
              activeId,
              expandedItems,
              focusedItemId,
              itemRefs,
              onToggleExpand,
              onSelect,
              onKeyDown,
              getFocusableItemIds,
              getFocusedIndex,
              depth: depth + 1
            })}
          </SidebarSubmenu>
        )}
      </SidebarItem>
    );
  });
}

export function Sidebar({
  palette,
  items,
  activeItemId,
  onSelectItem,
  isMobile,
  isOpen,
  menuItems: customMenuItems
}) {
  const {
    expandedItems,
    focusedItemId,
    setFocusedItemId,
    handleToggleExpand,
    handleKeyDown,
    getFocusableItemIds,
    getFocusedIndex,
  } = useSidebarNavigation({ activeItemId, onSelectItem, menuItems: customMenuItems || items || DEFAULT_MENU_ITEMS });

  const itemRefs = useRef(new Map());

  // Use custom menu items or default
  const menuStructure = customMenuItems || items || DEFAULT_MENU_ITEMS;

  // Focus the focused item when it changes
  useEffect(() => {
    if (focusedItemId) {
      const ref = itemRefs.current.get(focusedItemId);
      ref?.focus();
    }
  }, [focusedItemId]);

  if (isMobile && !isOpen) {
    return null;
  }

  const containerStyle = isMobile ? layoutStyles.sidebarMobile : layoutStyles.sidebar;

  return (
    <View
      style={[containerStyle, {
        backgroundColor: palette.sidebar,
        borderRightColor: palette.sidebarBorder,
      }]}
      role="navigation"
      aria-label="Main navigation"
    >
      <View style={layoutStyles.adminNavButtons}>
        <SidebarHeader title="EdgePress" palette={palette} />
        {renderSidebarItems({
          items: menuStructure,
          palette,
          activeId: activeItemId,
          expandedItems,
          focusedItemId,
          itemRefs,
          onToggleExpand: handleToggleExpand,
          onSelect: onSelectItem,
          onKeyDown: handleKeyDown,
          getFocusableItemIds,
          getFocusedIndex,
        })}
      </View>
    </View>
  );
}
