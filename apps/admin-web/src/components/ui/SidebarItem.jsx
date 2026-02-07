import { forwardRef } from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import { createTransition } from '../tokens.js';

export const SidebarItem = forwardRef(function SidebarItem(
  {
    palette,
    item,
    isActive,
    isExpanded,
    hasActiveChild,
    depth = 0,
    onPress,
    onKeyDown,
    children,
  },
  ref
) {
  const hasChildren = !!children;

  // WordPress-style theming with subtle, embedded borders
  const isActiveDirect = isActive;
  const isParentOfActive = hasActiveChild && !isActive;

  // Text color: white for active items, sidebar text otherwise
  const textColor = isActiveDirect
    ? palette.onAccent
    : palette.sidebarText;

  // Background: only direct active items get accent background
  // Parent of active child gets transparent (WP style)
  const bgColor = isActiveDirect
    ? palette.sidebarActiveBg
    : 'transparent';

  // Font weight: active items get bold
  const fontWeight = isActiveDirect ? '600' : '400';
  const paddingLeft = depth === 0 ? 12 : 28;

  // WordPress-style active state with left border accent (only for direct active)
  const activeStyle = isActiveDirect ? {
    borderLeftWidth: 4,
    borderLeftColor: palette.accent,
    paddingLeft: paddingLeft - 4, // Compensate for border
  } : {};

  return (
    <>
      <Pressable
        ref={ref}
        onPress={onPress}
        onKeyDown={onKeyDown}
        style={({ pressed }) => [
          styles.navButton,
          {
            backgroundColor: pressed
              ? palette.sidebarHover
              : bgColor,
            paddingLeft: activeStyle.paddingLeft || paddingLeft,
            borderBottomColor: palette.sidebarBorder,
            ...activeStyle,
          }
        ]}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded, selected: isActive }}
        accessibilityLabel={item.label}
      >
        <Text style={[styles.navButtonText, { color: textColor, fontWeight }]}>
          {item.label}
        </Text>
        {hasChildren && (
          <Text style={[styles.chevron, { color: textColor }]}>
            {isExpanded ? '▾' : '▸'}
          </Text>
        )}
      </Pressable>
      {hasChildren && isExpanded && children}
    </>
  );
});

const styles = StyleSheet.create({
  navButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    // Snappy transition - faster than before
    transition: createTransition(['background-color', 'border-color'], 'fast'),
  },
  navButtonText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    transition: createTransition('color', 'fast'),
  },
  chevron: {
    fontSize: 10,
    width: 16,
    textAlign: 'center',
    transition: createTransition('transform', 'fast'),
  },
});
