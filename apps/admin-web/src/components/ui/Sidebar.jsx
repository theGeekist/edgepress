import { Text, View, Pressable } from 'react-native';

import { layoutStyles } from '../styles.js';

function SidebarItem({ palette, item, activeId, onSelect, depth = 0 }) {
  const isActive = activeId === item.id;
  const textColor = isActive ? '#ffffff' : '#f0f0f1';
  const bgColor = isActive ? palette.accent : 'transparent';
  const fontWeight = isActive ? '600' : '400';
  const buttonStyle = depth > 0 ? layoutStyles.navSubButton : layoutStyles.navButton;

  return (
    <>
      <Pressable
        onPress={() => onSelect(item.id)}
        style={({ pressed }) => [
          buttonStyle,
          { backgroundColor: pressed ? '#2c3338' : bgColor },
          isActive && { backgroundColor: palette.accent }
        ]}
      >
        <Text style={[layoutStyles.navButtonText, { color: textColor, fontWeight }]}>
          {item.label}
        </Text>
      </Pressable>
      {Array.isArray(item.children) && item.children.length > 0
        ? item.children.map((child) => (
          <SidebarItem
            key={child.id}
            palette={palette}
            item={child}
            activeId={activeId}
            onSelect={onSelect}
            depth={depth + 1}
          />
        ))
        : null}
    </>
  );
}

export function Sidebar({
  palette,
  items,
  activeItemId,
  onSelectItem,
  isMobile,
  isOpen
}) {
  if (isMobile && !isOpen) {
    return null;
  }

  const containerStyle = isMobile ? layoutStyles.sidebarMobile : layoutStyles.sidebar;

  return (
    <View style={[containerStyle, { backgroundColor: palette.sidebar }]}>
      <View style={layoutStyles.adminNavButtons}>
        {items.map((item) => (
          <SidebarItem
            key={item.id}
            palette={palette}
            item={item}
            activeId={activeItemId}
            onSelect={onSelectItem}
          />
        ))}
      </View>
    </View>
  );
}
